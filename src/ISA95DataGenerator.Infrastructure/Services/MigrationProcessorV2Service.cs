using System.Globalization;
using System.IO.Compression;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.RegularExpressions;
using CsvHelper;
using CsvHelper.Configuration;
using ISA95DataGenerator.Domain.Entities;
using ISA95DataGenerator.Domain.Models;
using ISA95DataGenerator.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ISA95DataGenerator.Infrastructure.Services;

/// <summary>
/// V2 Migration Processor — reads from MigrationSourceData (SQL Server),
/// applies all field/PK rules (matching frontend logic), generates CSVs server-side.
/// </summary>
public class MigrationProcessorV2Service
{
    private readonly MigrationDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MigrationProcessorV2Service> _logger;

    private const int PROGRESS_FLUSH_INTERVAL = 500; // flush progress every N records
    private const int CSV_FLUSH_INTERVAL = 1_000; // flush CSV stream every N rows
    private const int SESSION_PROGRESS_SAVE_INTERVAL = 5_000; // persist session progress every N filtered source rows during long mappings
    private static readonly HashSet<string> ProcessSourceTables = new(StringComparer.OrdinalIgnoreCase)
    {
        "operations_requests",
        "segment_requirements",
        "segment_material_requirements",
        "segment_equipment_requirements",
        "operations_responses",
        "segment_responses",
        "segment_material_actuals",
        "segment_equipment_actuals",
        "equipment_property_tracking",
        "test_results",
        "operations_events",
        "operations_event_records",
        "operations_event_entries",
        "operations_event_properties",
        "segment_data",
    };

    private static readonly Dictionary<string, string> GenericStoreMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["operations_requests"] = "operationsRequests",
        ["segment_requirements"] = "segmentRequirements",
        ["segment_material_requirements"] = "segmentMaterialRequirements",
        ["segment_equipment_requirements"] = "segmentEquipmentRequirements",
        ["operations_responses"] = "operationsResponses",
        ["segment_responses"] = "segmentResponses",
        ["segment_material_actuals"] = "segmentMaterialActuals",
        ["segment_equipment_actuals"] = "segmentEquipmentActuals",
        ["equipment_property_tracking"] = "equipmentPropertyTracking",
        ["test_results"] = "testResults",
        ["operations_events"] = "operationsEvents",
        ["operations_event_records"] = "operationsEventRecords",
        ["operations_event_entries"] = "operationsEventEntries",
        ["operations_event_properties"] = "operationsEventProperties",
        ["segment_data"] = "segmentData",
    };

    private static readonly string[] KnownIsa95Terms =
    {
        "operations", "operation", "segment", "material", "equipment", "event", "record", "entry",
        "requirement", "requirements", "response", "responses", "property", "properties", "actual", "actuals",
        "capability", "capabilities", "definition", "definitions", "specification", "specifications",
        "parameter", "parameters", "class", "classes", "allocation", "reference", "resource", "scope",
        "hierarchy", "sublot", "lot", "source", "target", "evaluated", "from", "lang", "string", "set",
        "job", "order", "list", "data", "type", "id", "pk"
    };

    private static readonly string[] KnownIsa95TermsByLength = KnownIsa95Terms
        .OrderByDescending(t => t.Length)
        .ToArray();

    private sealed class ExportSummary
    {
        public string TargetEntity { get; set; } = string.Empty;
        public bool IsBridge { get; set; }
        public int SourceRows { get; set; }
        public int ExportedRows { get; set; }
        public int FileCount { get; set; }
    }

    public MigrationProcessorV2Service(
        MigrationDbContext dbContext,
        IConfiguration configuration,
        ILogger<MigrationProcessorV2Service> logger)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
    }

    // ────────────────────────────────────────────
    //  Public entry point
    // ────────────────────────────────────────────
    public async Task ExecuteAsync(
        Guid sessionId,
        List<TableMappingDto> mappings,
        int? maxFileSizeMb = null,
        bool separateMasterProcessFiles = false,
        bool sourceIncludeTimestampSuffix = false,
        bool sourceSplitFiles = false,
        CancellationToken ct = default)
    {
        var session = await _dbContext.MigrationSessions.FindAsync(new object[] { sessionId }, ct)
            ?? throw new InvalidOperationException($"Session {sessionId} not found");

        var logMessages = new List<string>();
        void Log(string msg)
        {
            var entry = $"{DateTime.UtcNow:HH:mm:ss}: {msg}";
            logMessages.Add(entry);
            _logger.LogInformation("[Migration {SessionId}] {Message}", sessionId, msg);
        }

        try
        {
            session.Status = "Processing";
            session.StartedAt = DateTime.UtcNow;
            session.ProgressPercentage = 0;
            await SaveSession(session, logMessages, ct);

            Log("Starting backend migration execution...");

            // 1. Initialize lazy source-store provider (loads stores only when requested)
            var sourceStoreProvider = new SourceStoreProvider(this, sessionId);

            // 2. Sort mappings: non-bridge first (smallest first), bridge last
            var enabledMappings = mappings.Where(m => m.Enabled).ToList();
            var sourceTableCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var sourceTable in enabledMappings.Select(m => m.SourceTable).Distinct(StringComparer.OrdinalIgnoreCase))
                sourceTableCounts[sourceTable] = await sourceStoreProvider.GetStoreCountAsync(sourceTable, ct);

            var sortedMappings = enabledMappings
                .OrderBy(m => m.IsBridge ? 1 : 0)
                .ThenBy(m => sourceTableCounts.TryGetValue(m.SourceTable, out var count) ? count : 0)
                .ToList();

            var bridgeCount = sortedMappings.Count(m => m.IsBridge);
            var regularCount = sortedMappings.Count - bridgeCount;
            Log($"Processing {regularCount} regular + {bridgeCount} bridge mapping(s)");

            // 3. Pre-compute which entities are needed by bridge tables + which fields
            //    This allows us to: (a) skip caching entirely for non-bridge-referenced entities
            //    (b) cache only the minimal fields (PK + join columns) for bridge-referenced ones
            var bridgeFieldReqs = ComputeBridgeFieldRequirements(sortedMappings);
            if (bridgeFieldReqs.Count > 0)
                Log($"Bridge-referenced entities (slim-cached): {string.Join(", ", bridgeFieldReqs.Keys)}");

            // 3b. Pre-compute source table usage counts so we can release memory eagerly
            var sourceTableUseCount = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var m in sortedMappings)
            {
                if (!sourceTableUseCount.ContainsKey(m.SourceTable))
                    sourceTableUseCount[m.SourceTable] = 0;
                sourceTableUseCount[m.SourceTable]++;
            }

            // 4. Compute total record count
            var totalRecords = sortedMappings
                .Select(m => sourceTableCounts.TryGetValue(m.SourceTable, out var count) ? count : 0)
                .Sum();
            session.TotalRecords = totalRecords;

            // 5. Prepare output directory
            var outputPath = _configuration.GetValue<string>("MigrationSettings:OutputPath") ?? "Data/Outputs";
            var sessionOutputDir = Path.Combine(outputPath, sessionId.ToString());
            Directory.CreateDirectory(sessionOutputDir);
            var isa95SubDir = Path.Combine(sessionOutputDir, "isa95");
            var sourceSubDir = Path.Combine(sessionOutputDir, "source");
            Directory.CreateDirectory(isa95SubDir);
            Directory.CreateDirectory(sourceSubDir);
            var mappingSubDir = Path.Combine(isa95SubDir, "mapping");
            Directory.CreateDirectory(mappingSubDir);
            Log("ISA95 outputs will be written to isa95 folder");

            var clampedMaxFileSizeMb = Math.Clamp(maxFileSizeMb ?? 10, 1, 10);
            var maxFileSizeBytes = clampedMaxFileSizeMb * 1024L * 1024L;
            Log($"CSV split size limit: {clampedMaxFileSizeMb} MB");

            var outputFiles = new List<string>();

            if (separateMasterProcessFiles)
            {
                var exportedSourceFiles = await ExportSourceStoresToCsvAsync(
                    sourceStoreProvider,
                    sortedMappings.Select(m => m.SourceTable),
                    sourceSubDir,
                    maxFileSizeBytes,
                    sourceIncludeTimestampSuffix,
                    sourceSplitFiles,
                    exportByMasterProcess: true,
                    ct);
                outputFiles.AddRange(exportedSourceFiles);
                Log($"Source export enabled: grouped by master/process, timestamp suffix={(sourceIncludeTimestampSuffix ? "on" : "off")}, split={(sourceSplitFiles ? "on" : "off")}");
                Log($"Exported source stores to source folder: {exportedSourceFiles.Count} file(s)");
            }
            else
            {
                Log("Source export disabled by configuration");
            }

            int processedTotal = 0;
            int successCount = 0;
            int failCount = 0;
            int skippedCount = 0;
            var skippedItems = new List<string>();
            var failedItems = new List<string>();
            var exportSummaries = new Dictionary<string, ExportSummary>(StringComparer.OrdinalIgnoreCase);

            // Slim cache for transformed entity data (used by bridge tables)
            // Only stores PrimaryKey + join fields, NOT full transformed records
            var entityDataCache = new Dictionary<string, List<Dictionary<string, object?>>>();

            // 6. Process each mapping
            for (int i = 0; i < sortedMappings.Count; i++)
            {
                ct.ThrowIfCancellationRequested();
                var mapping = sortedMappings[i];

                try
                {
                    Log($"[{i + 1}/{sortedMappings.Count}] {mapping.SourceTable} → {mapping.TargetEntity}{(mapping.IsBridge ? " (BRIDGE)" : "")}");

                    var requiresMaterializedSource = mapping.IsBridge;

                    if (!requiresMaterializedSource)
                    {
                        var sourceCount = sourceTableCounts.TryGetValue(mapping.SourceTable, out var c) ? c : 0;
                        if (sourceCount == 0)
                        {
                            Log($"  ⚠ Source table '{mapping.SourceTable}' empty or not found — skipping");
                            skippedCount++;
                            skippedItems.Add($"{mapping.SourceTable} → {mapping.TargetEntity}");

                            if (sourceTableUseCount.ContainsKey(mapping.SourceTable))
                                sourceTableUseCount[mapping.SourceTable]--;
                            continue;
                        }

                        var streamEntityOutputName = FormatEntityNameForOutput(mapping.TargetEntity);
                        var streamTargetDir = isa95SubDir;
                        HashSet<string>? streamCacheFields = null;
                        List<Dictionary<string, object?>>? streamCacheTarget = null;

                        if (bridgeFieldReqs.TryGetValue(mapping.TargetEntity, out var neededFieldsForBridge))
                        {
                            streamCacheFields = neededFieldsForBridge;
                            var cacheKey = $"COMBINED_{mapping.TargetEntity}";
                            if (!entityDataCache.TryGetValue(cacheKey, out var existingCache))
                            {
                                existingCache = new List<Dictionary<string, object?>>();
                                entityDataCache[cacheKey] = existingCache;
                            }
                            streamCacheTarget = existingCache;
                        }

                        var streamResult = await StreamRegularMappingByStoreToCsvAsync(
                            mapping,
                            sourceStoreProvider,
                            streamEntityOutputName,
                            streamTargetDir,
                            maxFileSizeBytes,
                            Log,
                            async (currentFilteredCount) =>
                            {
                                session.ProcessedRecords = processedTotal + currentFilteredCount;
                                session.ProgressPercentage = totalRecords > 0
                                    ? (int)(((processedTotal + currentFilteredCount) * 100.0) / totalRecords)
                                    : 0;
                                await SaveSession(session, logMessages, ct);
                            },
                            streamCacheFields,
                            streamCacheTarget,
                            ct);

                        outputFiles.AddRange(streamResult.Files);
                        Log($"  ✓ {streamResult.RecordCount} records → {streamResult.Files.Count} file(s)");
                        successCount++;

                        var streamSummaryKey = $"{mapping.TargetEntity}|entity";
                        if (!exportSummaries.TryGetValue(streamSummaryKey, out var streamSummary))
                        {
                            streamSummary = new ExportSummary
                            {
                                TargetEntity = mapping.TargetEntity,
                                IsBridge = false,
                            };
                            exportSummaries[streamSummaryKey] = streamSummary;
                        }
                        streamSummary.SourceRows += streamResult.FilteredSourceCount;
                        streamSummary.ExportedRows += streamResult.RecordCount;
                        streamSummary.FileCount += streamResult.Files.Count;

                        if (streamCacheFields != null)
                            Log($"  Cached {streamCacheFields.Count} fields for bridge lookups");

                        processedTotal += streamResult.FilteredSourceCount;
                        session.ProcessedRecords = processedTotal;
                        session.ProgressPercentage = totalRecords > 0
                            ? (int)((processedTotal * 100.0) / totalRecords)
                            : 0;
                        await SaveSession(session, logMessages, ct);

                        sourceTableUseCount[mapping.SourceTable]--;
                        if (sourceTableUseCount[mapping.SourceTable] <= 0)
                        {
                            sourceStoreProvider.ReleaseStore(mapping.SourceTable);
                            Log($"  Released source data for '{mapping.SourceTable}' (no longer needed)");
                        }

                        continue;
                    }

                    // Load source data for this mapping
                    var sourceData = await sourceStoreProvider.GetStoreAsync(mapping.SourceTable, ct);
                    if (sourceData.Count == 0)
                    {
                        Log($"  ⚠ Source table '{mapping.SourceTable}' empty or not found — skipping");
                        skippedCount++;
                        skippedItems.Add($"{mapping.SourceTable} → {mapping.TargetEntity}");

                        // Still decrement use count
                        if (sourceTableUseCount.ContainsKey(mapping.SourceTable))
                            sourceTableUseCount[mapping.SourceTable]--;
                        continue;
                    }

                    // Apply filters
                    var filteredData = ApplyFilters(sourceData, mapping.Filters);
                    if (filteredData.Count != sourceData.Count)
                        Log($"  Filtered: {sourceData.Count} → {filteredData.Count} records");

                    var entityOutputName = FormatEntityNameForOutput(mapping.TargetEntity);
                    var targetDir = mapping.IsBridge
                        ? mappingSubDir
                        : isa95SubDir;
                    // Bridge: keep current approach (bridges are typically small)
                    var transformedData = await ProcessBridgeMappingAsync(
                        mapping, filteredData, sortedMappings, sourceStoreProvider,
                        entityDataCache, Log, ct);

                    var written = await WriteCsvFilesAsync(entityOutputName, transformedData, targetDir, maxFileSizeBytes, ct);
                    var recordCount = transformedData.Count;

                    outputFiles.AddRange(written);
                    Log($"  ✓ {recordCount} records → {written.Count} file(s)");
                    successCount++;

                    var summaryKey = $"{mapping.TargetEntity}|{(mapping.IsBridge ? "bridge" : "entity")}";
                    if (!exportSummaries.TryGetValue(summaryKey, out var summary))
                    {
                        summary = new ExportSummary
                        {
                            TargetEntity = mapping.TargetEntity,
                            IsBridge = mapping.IsBridge,
                        };
                        exportSummaries[summaryKey] = summary;
                    }
                    summary.SourceRows += filteredData.Count;
                    summary.ExportedRows += recordCount;
                    summary.FileCount += written.Count;

                    processedTotal += filteredData.Count;
                    session.ProcessedRecords = processedTotal;
                    session.ProgressPercentage = totalRecords > 0
                        ? (int)((processedTotal * 100.0) / totalRecords)
                        : 0;
                    await SaveSession(session, logMessages, ct);

                    // Release source data if this was the last mapping using this table
                    sourceTableUseCount[mapping.SourceTable]--;
                    if (sourceTableUseCount[mapping.SourceTable] <= 0)
                    {
                        sourceStoreProvider.ReleaseStore(mapping.SourceTable);
                        Log($"  Released source data for '{mapping.SourceTable}' (no longer needed)");
                    }
                }
                catch (Exception ex)
                {
                    Log($"  ❌ Failed: {ex.Message}");
                    _logger.LogError(ex, "Mapping {SourceTable} → {TargetEntity} failed", mapping.SourceTable, mapping.TargetEntity);
                    failCount++;
                    failedItems.Add($"{mapping.SourceTable} → {mapping.TargetEntity} | {ex.Message}");
                }
            }

            // Release caches before ZIP creation
            entityDataCache.Clear();
            sourceStoreProvider.Clear();

            // 6. Create ZIP
            var zipFileName = $"migration_{sessionId:N}_{DateTime.UtcNow:yyyyMMddHHmmss}.zip";
            var zipFilePath = Path.Combine(outputPath, zipFileName);
            ZipFile.CreateFromDirectory(sessionOutputDir, zipFilePath);
            outputFiles.Insert(0, zipFilePath); // ZIP first

            // 7. Update session
            session.Status = failCount > 0 ? "CompletedWithErrors" : "Completed";
            session.CompletedAt = DateTime.UtcNow;
            session.ProgressPercentage = 100;
            session.ProcessedRecords = processedTotal;
            session.ResultFilesPaths = JsonSerializer.Serialize(outputFiles);

            Log("─────────────────────────────────");
            Log($"Migration complete! ✓ {successCount} successful, ❌ {failCount} failed, ⚠ {skippedCount} skipped");

            if (failedItems.Count > 0)
            {
                Log("Failed mappings:");
                foreach (var failed in failedItems)
                {
                    Log($"  - {failed}");
                }
            }

            if (skippedItems.Count > 0)
            {
                Log("Skipped mappings:");
                foreach (var skipped in skippedItems)
                {
                    Log($"  - {skipped}");
                }
            }

            if (exportSummaries.Count > 0)
            {
                Log("Export counts by target:");
                foreach (var summary in exportSummaries.Values.OrderBy(s => s.TargetEntity, StringComparer.OrdinalIgnoreCase))
                {
                    var kind = summary.IsBridge ? "mapping" : "entity";
                    Log($"  - {summary.TargetEntity} ({kind}): source={summary.SourceRows}, exported={summary.ExportedRows}, files={summary.FileCount}");
                }
            }

            await SaveSession(session, logMessages, ct);

            _logger.LogInformation("Migration {SessionId} completed", sessionId);
        }
        catch (OperationCanceledException)
        {
            session.Status = "Cancelled";
            Log("Migration cancelled");
            await SaveSession(session, logMessages, ct);
            throw;
        }
        catch (Exception ex)
        {
            session.Status = "Failed";
            session.ErrorMessage = ex.Message;
            session.CompletedAt = DateTime.UtcNow;
            Log($"❌ Migration failed: {ex.Message}");
            await SaveSession(session, logMessages, ct);
            _logger.LogError(ex, "Migration {SessionId} failed", sessionId);
            throw;
        }
    }

    // ────────────────────────────────────────────
    //  Load all source data from MigrationSourceData
    // ────────────────────────────────────────────
    private async Task<Dictionary<string, List<Dictionary<string, object?>>>> LoadAllSourceDataAsync(
        Guid sessionId, CancellationToken ct)
    {
        var result = new Dictionary<string, List<Dictionary<string, object?>>>(StringComparer.OrdinalIgnoreCase);

        // Phase 1: Load from MigrationSourceData (explicitly uploaded stores)
        var uploadedStores = await _dbContext.Set<MigrationSourceData>()
            .Where(s => s.MigrationSessionId == sessionId)
            .AsNoTracking()
            .ToListAsync(ct);

        foreach (var store in uploadedStores)
        {
            try
            {
                var records = JsonSerializer.Deserialize<List<Dictionary<string, JsonElement>>>(store.DataJson);
                if (records == null) continue;

                var converted = records.Select(r =>
                {
                    var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                    foreach (var kv in r)
                        dict[kv.Key] = ConvertJsonElement(kv.Value);
                    return dict;
                }).ToList();

                // Support partitioned uploads: storeName__part_0001, storeName__part_0002, ...
                var logicalStoreName = store.StoreName;
                var partMarkerIndex = logicalStoreName.IndexOf("__part_", StringComparison.OrdinalIgnoreCase);
                if (partMarkerIndex > 0)
                    logicalStoreName = logicalStoreName[..partMarkerIndex];

                if (result.TryGetValue(logicalStoreName, out var existing))
                {
                    existing.AddRange(converted);
                }
                else
                {
                    result[logicalStoreName] = converted;
                }

                _logger.LogDebug("Loaded uploaded store {StoreName} (logical {LogicalStoreName}): {Count} records", store.StoreName, logicalStoreName, converted.Count);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to deserialize uploaded store {StoreName}", store.StoreName);
            }
        }

        // Phase 2: Load from GenericDataStores (server-side process/master data)
        // Maps migration table name → GenericDataStore storeName
        var genericStoreMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            // Process data stores
            ["operations_requests"] = "operationsRequests",
            ["segment_requirements"] = "segmentRequirements",
            ["segment_material_requirements"] = "segmentMaterialRequirements",
            ["segment_equipment_requirements"] = "segmentEquipmentRequirements",
            ["operations_responses"] = "operationsResponses",
            ["segment_responses"] = "segmentResponses",
            ["segment_material_actuals"] = "segmentMaterialActuals",
            ["segment_equipment_actuals"] = "segmentEquipmentActuals",
            ["equipment_property_tracking"] = "equipmentPropertyTracking",
            ["test_results"] = "testResults",
            ["operations_events"] = "operationsEvents",
            ["operations_event_records"] = "operationsEventRecords",
            ["operations_event_entries"] = "operationsEventEntries",
            ["operations_event_properties"] = "operationsEventProperties",
            ["segment_data"] = "segmentData",
        };

        // Load generics for any table not already in result
        var neededGenericStores = genericStoreMap
            .Where(kv => !result.ContainsKey(kv.Key))
            .Select(kv => kv.Value)
            .Distinct()
            .ToList();

        if (neededGenericStores.Count > 0)
        {
            var genericRows = await _dbContext.GenericDataStores
                .AsNoTracking()
                .Where(r => neededGenericStores.Contains(r.StoreName))
                .ToListAsync(ct);

            var grouped = genericRows.GroupBy(r => r.StoreName);
            foreach (var group in grouped)
            {
                var converted = new List<Dictionary<string, object?>>();
                foreach (var row in group)
                {
                    try
                    {
                        var doc = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(row.DataJson);
                        if (doc == null) continue;
                        var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                        foreach (var kv in doc)
                            dict[kv.Key] = ConvertJsonElement(kv.Value);
                        converted.Add(dict);
                    }
                    catch { /* skip malformed */ }
                }

                if (converted.Count > 0)
                {
                    // Map back to migration table name(s)
                    foreach (var kv in genericStoreMap)
                    {
                        if (kv.Value == group.Key && !result.ContainsKey(kv.Key))
                        {
                            result[kv.Key] = converted;
                            _logger.LogDebug("Loaded generic store {StoreName} → {TableName}: {Count} records",
                                group.Key, kv.Key, converted.Count);
                        }
                    }
                }
            }
        }

        return result;
    }

    private static object? ConvertJsonElement(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.String => el.GetString(),
        JsonValueKind.Number => el.TryGetInt64(out var l) ? l : el.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Null => null,
        JsonValueKind.Undefined => null,
        _ => el.GetRawText() // arrays, objects → keep as string for now
    };

    private async Task<int> GetStoreRecordCountAsync(Guid sessionId, string sourceTable, CancellationToken ct)
    {
        var uploadedRows = await _dbContext.Set<MigrationSourceData>()
            .AsNoTracking()
            .Where(s => s.MigrationSessionId == sessionId &&
                        (s.StoreName == sourceTable || s.StoreName.StartsWith(sourceTable + "__part_")))
            .Select(s => (int?)s.RecordCount)
            .ToListAsync(ct);

        if (uploadedRows.Count > 0)
            return uploadedRows.Sum(x => x ?? 0);

        if (!GenericStoreMap.TryGetValue(sourceTable, out var genericStoreName))
            return 0;

        return await _dbContext.GenericDataStores
            .AsNoTracking()
            .Where(r => r.StoreName == genericStoreName)
            .CountAsync(ct);
    }

    private async Task<List<Dictionary<string, object?>>> LoadStoreDataAsync(Guid sessionId, string sourceTable, CancellationToken ct)
    {
        var result = new List<Dictionary<string, object?>>();

        var uploadedStores = await _dbContext.Set<MigrationSourceData>()
            .AsNoTracking()
            .Where(s => s.MigrationSessionId == sessionId &&
                        (s.StoreName == sourceTable || s.StoreName.StartsWith(sourceTable + "__part_")))
            .OrderBy(s => s.StoreName)
            .ToListAsync(ct);

        if (uploadedStores.Count > 0)
        {
            foreach (var store in uploadedStores)
            {
                try
                {
                    var records = JsonSerializer.Deserialize<List<Dictionary<string, JsonElement>>>(store.DataJson);
                    if (records == null) continue;

                    var converted = records.Select(r =>
                    {
                        var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                        foreach (var kv in r)
                            dict[kv.Key] = ConvertJsonElement(kv.Value);
                        return dict;
                    });

                    result.AddRange(converted);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to deserialize uploaded store {StoreName}", store.StoreName);
                }
            }

            AddComputedFieldsForStore(sourceTable, result);
            return result;
        }

        if (!GenericStoreMap.TryGetValue(sourceTable, out var genericStoreName))
            return result;

        var genericRows = await _dbContext.GenericDataStores
            .AsNoTracking()
            .Where(r => r.StoreName == genericStoreName)
            .ToListAsync(ct);

        foreach (var row in genericRows)
        {
            try
            {
                var doc = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(row.DataJson);
                if (doc == null) continue;
                var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                foreach (var kv in doc)
                    dict[kv.Key] = ConvertJsonElement(kv.Value);
                result.Add(dict);
            }
            catch
            {
                // Skip malformed row and continue.
            }
        }

        AddComputedFieldsForStore(sourceTable, result);
        return result;
    }

    private static void AddComputedFieldsForStore(string sourceTable, List<Dictionary<string, object?>> data)
    {
        if (!string.Equals(sourceTable, "segment_requirements", StringComparison.OrdinalIgnoreCase))
            return;

        foreach (var rec in data)
        {
            var start = rec.GetValueOrDefault("earliestStartDateTime")?.ToString();
            var end = rec.GetValueOrDefault("latestEndDateTime")?.ToString();
            if (DateTime.TryParse(start, out var s) && DateTime.TryParse(end, out var e))
                rec["durationHours"] = (e - s).TotalHours;
            else
                rec["durationHours"] = 0.0;
        }
    }

    private static void AddComputedFieldsForRecord(string sourceTable, Dictionary<string, object?> rec)
    {
        if (!string.Equals(sourceTable, "segment_requirements", StringComparison.OrdinalIgnoreCase))
            return;

        var start = rec.GetValueOrDefault("earliestStartDateTime")?.ToString();
        var end = rec.GetValueOrDefault("latestEndDateTime")?.ToString();
        if (DateTime.TryParse(start, out var s) && DateTime.TryParse(end, out var e))
            rec["durationHours"] = (e - s).TotalHours;
        else
            rec["durationHours"] = 0.0;
    }

    private async IAsyncEnumerable<Dictionary<string, object?>> StreamStoreDataAsync(
        Guid sessionId,
        string sourceTable,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var uploadedStores = _dbContext.Set<MigrationSourceData>()
            .AsNoTracking()
            .Where(s => s.MigrationSessionId == sessionId &&
                        (s.StoreName == sourceTable || s.StoreName.StartsWith(sourceTable + "__part_")))
            .OrderBy(s => s.StoreName)
            .Select(s => s.DataJson)
            .AsAsyncEnumerable();

        var hasUploaded = false;
        await foreach (var dataJson in uploadedStores.WithCancellation(ct))
        {
            hasUploaded = true;
            List<Dictionary<string, JsonElement>>? records;
            try
            {
                records = JsonSerializer.Deserialize<List<Dictionary<string, JsonElement>>>(dataJson);
            }
            catch
            {
                continue;
            }

            if (records == null) continue;

            foreach (var r in records)
            {
                var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                foreach (var kv in r)
                    dict[kv.Key] = ConvertJsonElement(kv.Value);
                AddComputedFieldsForRecord(sourceTable, dict);
                yield return dict;
            }
        }

        if (hasUploaded)
            yield break;

        if (!GenericStoreMap.TryGetValue(sourceTable, out var genericStoreName))
            yield break;

        var genericRows = _dbContext.GenericDataStores
            .AsNoTracking()
            .Where(r => r.StoreName == genericStoreName)
            .OrderBy(r => r.Id)
            .Select(r => r.DataJson)
            .AsAsyncEnumerable();

        await foreach (var rowJson in genericRows.WithCancellation(ct))
        {
            Dictionary<string, JsonElement>? doc;
            try
            {
                doc = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(rowJson);
            }
            catch
            {
                continue;
            }

            if (doc == null) continue;

            var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            foreach (var kv in doc)
                dict[kv.Key] = ConvertJsonElement(kv.Value);
            AddComputedFieldsForRecord(sourceTable, dict);
            yield return dict;
        }
    }

    private sealed class SourceStoreProvider
    {
        private readonly MigrationProcessorV2Service _owner;
        private readonly Guid _sessionId;
        private readonly Dictionary<string, List<Dictionary<string, object?>>> _cache = new(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, int> _countCache = new(StringComparer.OrdinalIgnoreCase);

        public SourceStoreProvider(MigrationProcessorV2Service owner, Guid sessionId)
        {
            _owner = owner;
            _sessionId = sessionId;
        }

        public async Task<int> GetStoreCountAsync(string sourceTable, CancellationToken ct)
        {
            if (_countCache.TryGetValue(sourceTable, out var count))
                return count;

            count = await _owner.GetStoreRecordCountAsync(_sessionId, sourceTable, ct);
            _countCache[sourceTable] = count;
            return count;
        }

        public async Task<List<Dictionary<string, object?>>> GetStoreAsync(string sourceTable, CancellationToken ct)
        {
            if (_cache.TryGetValue(sourceTable, out var cached))
                return cached;

            var loaded = await _owner.LoadStoreDataAsync(_sessionId, sourceTable, ct);
            _cache[sourceTable] = loaded;
            _countCache[sourceTable] = loaded.Count;
            return loaded;
        }

        public IAsyncEnumerable<Dictionary<string, object?>> StreamStoreAsync(string sourceTable, CancellationToken ct)
        {
            return _owner.StreamStoreDataAsync(_sessionId, sourceTable, ct);
        }

        public void ReleaseStore(string sourceTable)
        {
            _cache.Remove(sourceTable);
        }

        public void Clear()
        {
            _cache.Clear();
            _countCache.Clear();
        }
    }

    // ────────────────────────────────────────────
    //  Add computed fields (mirrors frontend loadSourceData)
    // ────────────────────────────────────────────
    private void AddComputedFields(Dictionary<string, List<Dictionary<string, object?>>> allStoreData)
    {
        // segment_requirements: add durationHours computed field
        if (allStoreData.TryGetValue("segment_requirements", out var segReqs))
        {
            foreach (var rec in segReqs)
            {
                var start = rec.GetValueOrDefault("earliestStartDateTime")?.ToString();
                var end = rec.GetValueOrDefault("latestEndDateTime")?.ToString();
                if (DateTime.TryParse(start, out var s) && DateTime.TryParse(end, out var e))
                    rec["durationHours"] = (e - s).TotalHours;
                else
                    rec["durationHours"] = 0.0;
            }
        }
    }

    // ────────────────────────────────────────────
    //  Apply filters
    // ────────────────────────────────────────────
    private List<Dictionary<string, object?>> ApplyFilters(
        List<Dictionary<string, object?>> data,
        List<FilterDto>? filters)
    {
        if (filters == null || filters.Count == 0) return data;

        var enabledFilters = filters.Where(f => f.Enabled).ToList();
        if (enabledFilters.Count == 0) return data;

        return data.Where(rec => MatchesFilters(rec, enabledFilters)).ToList();
    }

    private static bool MatchesFilters(Dictionary<string, object?> rec, List<FilterDto> enabledFilters)
    {
        foreach (var filter in enabledFilters)
        {
            var rawValue = rec.GetValueOrDefault(filter.Field);
            var isNull = rawValue == null;
            var value = rawValue?.ToString() ?? "";
            var filterValue = filter.Value ?? "";

            bool match = filter.Operator switch
            {
                "equals" => string.Equals(value, filterValue, StringComparison.OrdinalIgnoreCase),
                "not_equals" => !string.Equals(value, filterValue, StringComparison.OrdinalIgnoreCase),
                "contains" => value.Contains(filterValue, StringComparison.OrdinalIgnoreCase),
                "not_contains" => !value.Contains(filterValue, StringComparison.OrdinalIgnoreCase),
                "starts_with" => value.StartsWith(filterValue, StringComparison.OrdinalIgnoreCase),
                "ends_with" => value.EndsWith(filterValue, StringComparison.OrdinalIgnoreCase),
                "greater_than" => double.TryParse(value, out var v1) && double.TryParse(filterValue, out var v2) && v1 > v2,
                "less_than" => double.TryParse(value, out var v3) && double.TryParse(filterValue, out var v4) && v3 < v4,
                "is_null" => isNull || string.IsNullOrEmpty(value),
                "is_not_null" => !isNull && !string.IsNullOrEmpty(value),
                "is_empty" => string.IsNullOrWhiteSpace(value),
                "is_not_empty" => !string.IsNullOrWhiteSpace(value),
                _ => true
            };

            if (!match) return false;
        }

        return true;
    }

    // ────────────────────────────────────────────
    //  Pre-compute which fields each bridge-referenced entity needs cached
    // ────────────────────────────────────────────
    private static Dictionary<string, HashSet<string>> ComputeBridgeFieldRequirements(List<TableMappingDto> mappings)
    {
        var requirements = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var m in mappings.Where(m => m.IsBridge))
        {
            void TrackEntity(string? entity, List<BridgeJoinFieldDto>? joinFields)
            {
                if (string.IsNullOrEmpty(entity)) return;
                if (!requirements.TryGetValue(entity, out var fields))
                {
                    fields = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "PrimaryKey" };
                    requirements[entity] = fields;
                }
                if (joinFields != null)
                    foreach (var jf in joinFields)
                        fields.Add(jf.EntityField);
            }

            TrackEntity(m.BridgeEntity1, m.BridgeEntity1JoinFields);
            TrackEntity(m.BridgeEntity2, m.BridgeEntity2JoinFields);
        }

        return requirements;
    }

    // ────────────────────────────────────────────
    //  Stream-transform regular mapping directly to CSV (no intermediate list)
    //  Used for entities NOT referenced by any bridge table
    // ────────────────────────────────────────────
    private async Task<(List<string> Files, int RecordCount)> StreamRegularMappingToCsvAsync(
        TableMappingDto mapping,
        List<Dictionary<string, object?>> sourceData,
        SourceStoreProvider sourceStoreProvider,
        string entityDisplayName,
        string outputDir,
        long maxFileSizeBytes,
        Action<string> log,
        CancellationToken ct)
    {
        var lookupTables = await PreLoadLookupTablesAsync(mapping, sourceStoreProvider, ct);

        // Pre-determine CSV columns from field mappings (avoids needing full list)
        var columns = new List<string>();
        if (mapping.PrimaryKeyRule != null)
            columns.Add("PrimaryKey");
        foreach (var fm in mapping.FieldMappings)
        {
            if (fm.Generate && !columns.Contains(fm.FieldName, StringComparer.OrdinalIgnoreCase))
                columns.Add(fm.FieldName);
        }

        var files = new List<string>();
        int pkSequenceCounter = GetSequenceStart(mapping.PrimaryKeyRule);
        int totalRecords = 0;
        var startedAt = DateTime.UtcNow;

        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
        int fileIndex = 1;
        var filePath = Path.Combine(outputDir, $"{entityDisplayName}_{timestamp}.csv");
        var writer = new StreamWriter(filePath, append: false, encoding: System.Text.Encoding.UTF8, bufferSize: 65536);
        await writer.WriteLineAsync(string.Join(",", columns));
        long currentFileBytes = System.Text.Encoding.UTF8.GetByteCount(string.Join(",", columns) + Environment.NewLine);
        int recordsInCurrentFile = 0;
        files.Add(filePath);

        try
        {
            for (int idx = 0; idx < sourceData.Count; idx++)
            {
                ct.ThrowIfCancellationRequested();

                // Transform the record
                var record = sourceData[idx];
                var transformed = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

                foreach (var fm in mapping.FieldMappings)
                {
                    if (!fm.Generate) continue;

                    if (fm.FieldRule != null)
                    {
                        if (fm.FieldRule.RuleType == "Lookup")
                            transformed[fm.FieldName] = ResolveLookup(record, fm.FieldRule, lookupTables);
                        else if (fm.FieldRule.RuleType == "MultipleLookups")
                            transformed[fm.FieldName] = ResolveMultipleLookups(record, fm.FieldRule, lookupTables);
                        else
                            transformed[fm.FieldName] = ApplyFieldRule(fm.FieldRule, record, idx, transformed);
                    }
                    else if (!string.IsNullOrEmpty(fm.SourceColumn))
                    {
                        transformed[fm.FieldName] = record.GetValueOrDefault(fm.SourceColumn);
                    }
                    else
                    {
                        transformed[fm.FieldName] = "";
                    }
                }

                if (mapping.PrimaryKeyRule != null)
                {
                    transformed["PrimaryKey"] = ApplyPkRule(
                        mapping.PrimaryKeyRule, record, idx, transformed, lookupTables, ref pkSequenceCounter);
                }

                // Write CSV row immediately (no intermediate list)
                var values = columns.Select(col =>
                {
                    var val = transformed.GetValueOrDefault(col);
                    var str = FormatCsvValue(col, val);
                    if (str.Contains(',') || str.Contains('"') || str.Contains('\n') || str.Contains('\r'))
                        return $"\"{str.Replace("\"", "\"\"")}\"";
                    return str;
                });
                var line = string.Join(",", values);
                var lineBytes = System.Text.Encoding.UTF8.GetByteCount(line + Environment.NewLine);

                if (recordsInCurrentFile > 0 && currentFileBytes + lineBytes > maxFileSizeBytes)
                {
                    await writer.FlushAsync(ct);
                    await writer.DisposeAsync();

                    fileIndex++;
                    filePath = Path.Combine(outputDir, $"{entityDisplayName}_{timestamp}_{fileIndex:D2}.csv");
                    writer = new StreamWriter(filePath, append: false, encoding: System.Text.Encoding.UTF8, bufferSize: 65536);
                    await writer.WriteLineAsync(string.Join(",", columns));
                    currentFileBytes = System.Text.Encoding.UTF8.GetByteCount(string.Join(",", columns) + Environment.NewLine);
                    recordsInCurrentFile = 0;
                    files.Add(filePath);
                }

                await writer.WriteLineAsync(line);
                currentFileBytes += lineBytes;
                recordsInCurrentFile++;
                totalRecords++;

                if (totalRecords % PROGRESS_FLUSH_INTERVAL == 0)
                {
                    var elapsedSec = Math.Max(1, (DateTime.UtcNow - startedAt).TotalSeconds);
                    var rps = (int)(totalRecords / elapsedSec);
                    log($"  ... {mapping.SourceTable} -> {mapping.TargetEntity}: processed {totalRecords}/{sourceData.Count} records (~{rps} rec/s)");
                }

                // Periodic flush to avoid large buffered data
                if (totalRecords % CSV_FLUSH_INTERVAL == 0)
                    await writer.FlushAsync(ct);
            }
        }
        finally
        {
            await writer.FlushAsync(ct);
            await writer.DisposeAsync();
        }

        return (files, totalRecords);
    }

    private async Task<(List<string> Files, int RecordCount, int FilteredSourceCount)> StreamRegularMappingByStoreToCsvAsync(
        TableMappingDto mapping,
        SourceStoreProvider sourceStoreProvider,
        string entityDisplayName,
        string outputDir,
        long maxFileSizeBytes,
        Action<string> log,
        Func<int, Task>? onProgressAsync,
        HashSet<string>? bridgeCacheFields,
        List<Dictionary<string, object?>>? bridgeCacheTarget,
        CancellationToken ct)
    {
        var lookupTables = await PreLoadLookupTablesAsync(mapping, sourceStoreProvider, ct);

        var enabledFilters = (mapping.Filters ?? new List<FilterDto>())
            .Where(f => f.Enabled)
            .ToList();

        var columns = new List<string>();
        if (mapping.PrimaryKeyRule != null)
            columns.Add("PrimaryKey");
        foreach (var fm in mapping.FieldMappings)
        {
            if (fm.Generate && !columns.Contains(fm.FieldName, StringComparer.OrdinalIgnoreCase))
                columns.Add(fm.FieldName);
        }

        var files = new List<string>();
        int pkSequenceCounter = GetSequenceStart(mapping.PrimaryKeyRule);
        int totalRecords = 0;
        int filteredSourceCount = 0;
        var startedAt = DateTime.UtcNow;

        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
        int fileIndex = 1;
        var filePath = Path.Combine(outputDir, $"{entityDisplayName}_{timestamp}.csv");
        var writer = new StreamWriter(filePath, append: false, encoding: System.Text.Encoding.UTF8, bufferSize: 65536);
        await writer.WriteLineAsync(string.Join(",", columns));
        long currentFileBytes = System.Text.Encoding.UTF8.GetByteCount(string.Join(",", columns) + Environment.NewLine);
        int recordsInCurrentFile = 0;
        files.Add(filePath);

        try
        {
            await foreach (var record in sourceStoreProvider.StreamStoreAsync(mapping.SourceTable, ct))
            {
                if (enabledFilters.Count > 0 && !MatchesFilters(record, enabledFilters))
                    continue;

                filteredSourceCount++;

                var transformed = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

                foreach (var fm in mapping.FieldMappings)
                {
                    if (!fm.Generate) continue;

                    if (fm.FieldRule != null)
                    {
                        if (fm.FieldRule.RuleType == "Lookup")
                            transformed[fm.FieldName] = ResolveLookup(record, fm.FieldRule, lookupTables);
                        else if (fm.FieldRule.RuleType == "MultipleLookups")
                            transformed[fm.FieldName] = ResolveMultipleLookups(record, fm.FieldRule, lookupTables);
                        else
                            transformed[fm.FieldName] = ApplyFieldRule(fm.FieldRule, record, filteredSourceCount - 1, transformed);
                    }
                    else if (!string.IsNullOrEmpty(fm.SourceColumn))
                    {
                        transformed[fm.FieldName] = record.GetValueOrDefault(fm.SourceColumn);
                    }
                    else
                    {
                        transformed[fm.FieldName] = "";
                    }
                }

                if (mapping.PrimaryKeyRule != null)
                {
                    transformed["PrimaryKey"] = ApplyPkRule(
                        mapping.PrimaryKeyRule, record, filteredSourceCount - 1, transformed, lookupTables, ref pkSequenceCounter);
                }

                if (bridgeCacheFields != null && bridgeCacheTarget != null)
                {
                    var slim = new Dictionary<string, object?>(bridgeCacheFields.Count, StringComparer.OrdinalIgnoreCase);
                    foreach (var field in bridgeCacheFields)
                    {
                        if (transformed.TryGetValue(field, out var val))
                            slim[field] = val;
                    }
                    bridgeCacheTarget.Add(slim);
                }

                var values = columns.Select(col =>
                {
                    var val = transformed.GetValueOrDefault(col);
                    var str = FormatCsvValue(col, val);
                    if (str.Contains(',') || str.Contains('"') || str.Contains('\n') || str.Contains('\r'))
                        return $"\"{str.Replace("\"", "\"\"")}\"";
                    return str;
                });
                var line = string.Join(",", values);
                var lineBytes = System.Text.Encoding.UTF8.GetByteCount(line + Environment.NewLine);

                if (recordsInCurrentFile > 0 && currentFileBytes + lineBytes > maxFileSizeBytes)
                {
                    await writer.FlushAsync(ct);
                    await writer.DisposeAsync();

                    fileIndex++;
                    filePath = Path.Combine(outputDir, $"{entityDisplayName}_{timestamp}_{fileIndex:D2}.csv");
                    writer = new StreamWriter(filePath, append: false, encoding: System.Text.Encoding.UTF8, bufferSize: 65536);
                    await writer.WriteLineAsync(string.Join(",", columns));
                    currentFileBytes = System.Text.Encoding.UTF8.GetByteCount(string.Join(",", columns) + Environment.NewLine);
                    recordsInCurrentFile = 0;
                    files.Add(filePath);
                }

                await writer.WriteLineAsync(line);
                currentFileBytes += lineBytes;
                recordsInCurrentFile++;
                totalRecords++;

                if (totalRecords % PROGRESS_FLUSH_INTERVAL == 0)
                {
                    var elapsedSec = Math.Max(1, (DateTime.UtcNow - startedAt).TotalSeconds);
                    var rps = (int)(totalRecords / elapsedSec);
                    log($"  ... {mapping.SourceTable} -> {mapping.TargetEntity}: processed {totalRecords} filtered records (~{rps} rec/s)");
                }

                if (onProgressAsync != null && filteredSourceCount % SESSION_PROGRESS_SAVE_INTERVAL == 0)
                {
                    await onProgressAsync(filteredSourceCount);
                }

                if (totalRecords % CSV_FLUSH_INTERVAL == 0)
                    await writer.FlushAsync(ct);
            }
        }
        finally
        {
            await writer.FlushAsync(ct);
            await writer.DisposeAsync();
        }

        return (files, totalRecords, filteredSourceCount);
    }

    // ────────────────────────────────────────────
    //  Process REGULAR (non-bridge) mapping
    // ────────────────────────────────────────────
    private async Task<List<Dictionary<string, object?>>> ProcessRegularMappingAsync(
        TableMappingDto mapping,
        List<Dictionary<string, object?>> sourceData,
        SourceStoreProvider sourceStoreProvider,
        Action<string> log,
        CancellationToken ct)
    {
        // Pre-load lookup tables
        var lookupTables = await PreLoadLookupTablesAsync(mapping, sourceStoreProvider, ct);

        var result = new List<Dictionary<string, object?>>(sourceData.Count);
        int pkSequenceCounter = GetSequenceStart(mapping.PrimaryKeyRule);
        var startedAt = DateTime.UtcNow;

        for (int idx = 0; idx < sourceData.Count; idx++)
        {
            var record = sourceData[idx];
            var transformed = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

            // Apply field mappings
            foreach (var fm in mapping.FieldMappings)
            {
                if (!fm.Generate) continue;

                if (fm.FieldRule != null)
                {
                    if (fm.FieldRule.RuleType == "Lookup")
                    {
                        transformed[fm.FieldName] = ResolveLookup(record, fm.FieldRule, lookupTables);
                    }
                    else if (fm.FieldRule.RuleType == "MultipleLookups")
                    {
                        transformed[fm.FieldName] = ResolveMultipleLookups(record, fm.FieldRule, lookupTables);
                    }
                    else
                    {
                        transformed[fm.FieldName] = ApplyFieldRule(fm.FieldRule, record, idx, transformed);
                    }
                }
                else if (!string.IsNullOrEmpty(fm.SourceColumn))
                {
                    transformed[fm.FieldName] = record.GetValueOrDefault(fm.SourceColumn);
                }
                else
                {
                    transformed[fm.FieldName] = "";
                }
            }

            // Apply PK rule
            if (mapping.PrimaryKeyRule != null)
            {
                var pkValue = ApplyPkRule(mapping.PrimaryKeyRule, record, idx, transformed, lookupTables, ref pkSequenceCounter);
                transformed["PrimaryKey"] = pkValue;
            }

            result.Add(transformed);

            var current = idx + 1;
            if (current % PROGRESS_FLUSH_INTERVAL == 0)
            {
                var elapsedSec = Math.Max(1, (DateTime.UtcNow - startedAt).TotalSeconds);
                var rps = (int)(current / elapsedSec);
                log($"  ... {mapping.SourceTable} -> {mapping.TargetEntity}: transformed {current}/{sourceData.Count} records (~{rps} rec/s)");
            }
        }

        return result;
    }

    // ────────────────────────────────────────────
    //  Process BRIDGE mapping
    // ────────────────────────────────────────────
    private async Task<List<Dictionary<string, object?>>> ProcessBridgeMappingAsync(
        TableMappingDto mapping,
        List<Dictionary<string, object?>> bridgeSourceData,
        List<TableMappingDto> allMappings,
        SourceStoreProvider sourceStoreProvider,
        Dictionary<string, List<Dictionary<string, object?>>> entityDataCache,
        Action<string> log,
        CancellationToken ct)
    {
        var entity1Name = mapping.BridgeEntity1 ?? "";
        var entity2Name = mapping.BridgeEntity2 ?? "";
        var entity1DisplayName = FormatEntityNameForOutput(entity1Name);
        var entity2DisplayName = FormatEntityNameForOutput(entity2Name);

        // Get combined transformed data for both entities (from cache built during regular processing)
        var entity1Data = await GetOrBuildEntityDataAsync(entity1Name, allMappings, sourceStoreProvider, entityDataCache, ct);
        var entity2Data = await GetOrBuildEntityDataAsync(entity2Name, allMappings, sourceStoreProvider, entityDataCache, ct);

        // Build indexed lookups for fast joining
        var entity1Index = BuildIndex(entity1Data, mapping.BridgeEntity1JoinFields);
        var entity2Index = BuildIndex(entity2Data, mapping.BridgeEntity2JoinFields);

        log($"  Bridge entity caches: {entity1Name}={entity1Data.Count}, {entity2Name}={entity2Data.Count}");

        var result = new List<Dictionary<string, object?>>(bridgeSourceData.Count);
        int pkSequenceCounter = GetSequenceStart(mapping.PrimaryKeyRule);
        var startedAt = DateTime.UtcNow;

        for (int idx = 0; idx < bridgeSourceData.Count; idx++)
        {
            var record = bridgeSourceData[idx];
            var transformed = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
            {
                ["Source type"] = entity1DisplayName,
                ["Source PrimaryKey"] = "",
                ["Target Type"] = entity2DisplayName,
                ["Target PrimaryKey"] = "",
                ["Relationship Type"] = mapping.RelationshipType ?? "related"
            };

            // Lookup entity 1 PK
            if (mapping.BridgeEntity1JoinFields is { Count: > 0 })
            {
                var key = BuildLookupKey(record, mapping.BridgeEntity1JoinFields);
                if (entity1Index.TryGetValue(key, out var e1))
                    transformed["Source PrimaryKey"] = e1.GetValueOrDefault("PrimaryKey") ?? "";
            }

            // Lookup entity 2 PK
            if (mapping.BridgeEntity2JoinFields is { Count: > 0 })
            {
                var key = BuildLookupKey(record, mapping.BridgeEntity2JoinFields);
                if (entity2Index.TryGetValue(key, out var e2))
                    transformed["Target PrimaryKey"] = e2.GetValueOrDefault("PrimaryKey") ?? "";
            }

            // Generate PK for bridge record itself
            if (mapping.PrimaryKeyRule != null)
            {
                transformed["PrimaryKey"] = ApplyPkRule(
                    mapping.PrimaryKeyRule, record, idx, transformed, null, ref pkSequenceCounter);
            }

            result.Add(transformed);

            var current = idx + 1;
            if (current % PROGRESS_FLUSH_INTERVAL == 0)
            {
                var elapsedSec = Math.Max(1, (DateTime.UtcNow - startedAt).TotalSeconds);
                var rps = (int)(current / elapsedSec);
                log($"  ... bridge {mapping.SourceTable} -> {mapping.TargetEntity}: processed {current}/{bridgeSourceData.Count} records (~{rps} rec/s)");
            }
        }

        return result;
    }

    // ────────────────────────────────────────────
    //  Get or build entity data for bridge lookups
    // ────────────────────────────────────────────
    private async Task<List<Dictionary<string, object?>>> GetOrBuildEntityDataAsync(
        string targetEntity,
        List<TableMappingDto> allMappings,
        SourceStoreProvider sourceStoreProvider,
        Dictionary<string, List<Dictionary<string, object?>>> entityDataCache,
        CancellationToken ct)
    {
        var cacheKey = $"COMBINED_{targetEntity}";
        if (entityDataCache.TryGetValue(cacheKey, out var cached))
            return cached;

        // Build it from the mapping configurations
        var entityMappings = allMappings
            .Where(m => !m.IsBridge && m.TargetEntity == targetEntity)
            .ToList();

        var combined = new List<Dictionary<string, object?>>();
        foreach (var em in entityMappings)
        {
            var srcData = await sourceStoreProvider.GetStoreAsync(em.SourceTable, ct);
            if (srcData.Count == 0) continue;
            var filtered = ApplyFilters(srcData, em.Filters);
            var transformed = await ProcessRegularMappingAsync(em, filtered, sourceStoreProvider, _ => { }, ct);
            combined.AddRange(transformed);
        }

        entityDataCache[cacheKey] = combined;
        return combined;
    }

    // ────────────────────────────────────────────
    //  Build index for fast bridge joins
    // ────────────────────────────────────────────
    private Dictionary<string, Dictionary<string, object?>> BuildIndex(
        List<Dictionary<string, object?>> entityData,
        List<BridgeJoinFieldDto>? joinFields)
    {
        var index = new Dictionary<string, Dictionary<string, object?>>(StringComparer.OrdinalIgnoreCase);
        if (joinFields == null || joinFields.Count == 0) return index;

        foreach (var rec in entityData)
        {
            var keyParts = joinFields.Select(jf =>
            {
                var val = (rec.GetValueOrDefault(jf.EntityField)?.ToString() ?? "").Trim();
                if (!string.IsNullOrEmpty(jf.EntityPrefix)) val = jf.EntityPrefix + val;
                if (!string.IsNullOrEmpty(jf.EntitySuffix)) val += jf.EntitySuffix;
                return val.ToLowerInvariant();
            });
            var compositeKey = string.Join("||", keyParts);
            index.TryAdd(compositeKey, rec); // first-wins
        }

        return index;
    }

    private string BuildLookupKey(Dictionary<string, object?> record, List<BridgeJoinFieldDto> joinFields)
    {
        var parts = joinFields.Select(jf =>
        {
            var val = (record.GetValueOrDefault(jf.BridgeField)?.ToString() ?? "").Trim();
            if (!string.IsNullOrEmpty(jf.BridgePrefix)) val = jf.BridgePrefix + val;
            if (!string.IsNullOrEmpty(jf.BridgeSuffix)) val += jf.BridgeSuffix;
            return val.ToLowerInvariant();
        });
        return string.Join("||", parts);
    }

    // ────────────────────────────────────────────
    //  Pre-load lookup tables for a mapping
    // ────────────────────────────────────────────
    private async Task<Dictionary<string, List<Dictionary<string, object?>>>> PreLoadLookupTablesAsync(
        TableMappingDto mapping,
        SourceStoreProvider sourceStoreProvider,
        CancellationToken ct)
    {
        var lookupTables = new Dictionary<string, List<Dictionary<string, object?>>>(StringComparer.OrdinalIgnoreCase);
        var allFieldRules = mapping.FieldMappings
            .Where(fm => fm.Generate && fm.FieldRule != null)
            .Select(fm => fm.FieldRule!)
            .ToList();

        // Also include PK rule
        if (mapping.PrimaryKeyRule != null)
            allFieldRules.Add(mapping.PrimaryKeyRule);

        foreach (var rule in allFieldRules)
        {
            await CollectLookupTableNamesAsync(rule, sourceStoreProvider, lookupTables, ct);
        }

        return lookupTables;
    }

    private async Task CollectLookupTableNamesAsync(
        FieldRuleDto rule,
        SourceStoreProvider sourceStoreProvider,
        Dictionary<string, List<Dictionary<string, object?>>> lookupTables,
        CancellationToken ct)
    {
        var p = rule.Parameters;
        if (p == null) return;

        if (rule.RuleType == "Lookup")
        {
            var tableName = GetJsonString(p.Value, "sourceTable") ?? GetJsonString(p.Value, "lookupTable");
            if (tableName != null && !lookupTables.ContainsKey(tableName))
            {
                var data = await sourceStoreProvider.GetStoreAsync(tableName, ct);
                if (data.Count > 0)
                    lookupTables[tableName] = data;
            }
        }
        else if (rule.RuleType == "MultipleLookups")
        {
            if (p.Value.TryGetProperty("lookupSteps", out var stepsEl) && stepsEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var step in stepsEl.EnumerateArray())
                {
                    var tableName = GetJsonStringFromElement(step, "lookupTable");
                    if (tableName != null && !lookupTables.ContainsKey(tableName))
                    {
                        var data = await sourceStoreProvider.GetStoreAsync(tableName, ct);
                        if (data.Count > 0)
                            lookupTables[tableName] = data;
                    }
                }
            }
        }
    }

    // ────────────────────────────────────────────
    //  Apply PK Rule
    // ────────────────────────────────────────────
    private object? ApplyPkRule(
        FieldRuleDto rule,
        Dictionary<string, object?> sourceRecord,
        int index,
        Dictionary<string, object?> transformed,
        Dictionary<string, List<Dictionary<string, object?>>>? lookupTables,
        ref int sequenceCounter)
    {
        var p = rule.Parameters;
        switch (rule.RuleType)
        {
            case "Static":
                return GetJsonString(p, "value") ?? "";

            case "Sequence":
            {
                var val = sequenceCounter;
                var increment = GetJsonInt(p, "increment") ?? 1;
                sequenceCounter += increment;
                return val;
            }

            case "PrefixSequence":
            {
                var prefix = GetJsonString(p, "prefix") ?? "";
                var suffix = GetJsonString(p, "suffix") ?? "";
                var padding = GetJsonInt(p, "padding") ?? 0;
                var numStr = padding > 0
                    ? sequenceCounter.ToString().PadLeft(padding, '0')
                    : sequenceCounter.ToString();
                sequenceCounter++;
                return $"{prefix}{numStr}{suffix}";
            }

            case "Composite":
            {
                var fields = GetJsonStringArray(p, "fields");
                var sep = GetJsonString(p, "separator") ?? "-";
                var vals = fields.Select(f => transformed.GetValueOrDefault(f)?.ToString() ?? "");
                return string.Join(sep, vals);
            }

            case "CompositeConcat":
            {
                var globalPrefix = GetJsonString(p, "globalPrefix") ?? "";
                var globalSuffix = GetJsonString(p, "globalSuffix") ?? "";
                var sep = GetJsonString(p, "separator") ?? "-";
                var fields = GetJsonObjectArray(p, "fields");
                var parts = fields.Select(f =>
                {
                    var fieldName = GetJsonStringFromElement(f, "fieldName") ?? "";
                    var pre = GetJsonStringFromElement(f, "prefix") ?? "";
                    var suf = GetJsonStringFromElement(f, "suffix") ?? "";
                    var val = transformed.GetValueOrDefault(fieldName)?.ToString() ?? "";
                    return $"{pre}{val}{suf}";
                });
                return $"{globalPrefix}{string.Join(sep, parts)}{globalSuffix}";
            }

            case "Lookup":
            {
                if (lookupTables != null)
                    return ResolveLookup(sourceRecord, rule, lookupTables) ?? "";
                return "";
            }

            default:
                // Fall through to generic field rule
                return ApplyFieldRule(rule, sourceRecord, index, transformed) ?? "";
        }
    }

    // ────────────────────────────────────────────
    //  Apply Field Rule (all rule types)
    // ────────────────────────────────────────────
    private object? ApplyFieldRule(
        FieldRuleDto rule,
        Dictionary<string, object?> sourceRecord,
        int index,
        Dictionary<string, object?> transformed)
    {
        var p = rule.Parameters;
        switch (rule.RuleType)
        {
            case "Static":
            case "Enumeration":
                return GetJsonString(p, "value") ?? "";

            case "Range":
            {
                var min = GetJsonDouble(p, "min") ?? 0;
                var max = GetJsonDouble(p, "max") ?? 100;
                return Random.Shared.NextDouble() * (max - min) + min;
            }

            case "Examples":
            {
                var vals = GetJsonStringArray(p, "values");
                return vals.Count > 0 ? vals[Random.Shared.Next(vals.Count)] : "";
            }

            case "Pattern":
                return GetJsonString(p, "regex") ?? "";

            case "Sequence":
            {
                var start = GetJsonInt(p, "start") ?? 1;
                return start + index;
            }

            case "PrefixSequence":
            {
                var start = GetJsonInt(p, "start") ?? 1;
                var prefix = GetJsonString(p, "prefix") ?? "";
                var suffix = GetJsonString(p, "suffix") ?? "";
                var padding = GetJsonInt(p, "padding") ?? 0;
                var numStr = padding > 0
                    ? (start + index).ToString().PadLeft(padding, '0')
                    : (start + index).ToString();
                return $"{prefix}{numStr}{suffix}";
            }

            case "Composite":
            {
                var fields = GetJsonStringArray(p, "fields");
                var sep = GetJsonString(p, "separator") ?? "-";
                var vals = fields.Select(f => transformed.GetValueOrDefault(f)?.ToString() ?? "");
                return string.Join(sep, vals);
            }

            case "CompositeConcat":
            {
                var globalPrefix = GetJsonString(p, "globalPrefix") ?? "";
                var globalSuffix = GetJsonString(p, "globalSuffix") ?? "";
                var sep = GetJsonString(p, "separator") ?? "-";
                var fields = GetJsonObjectArray(p, "fields");
                var parts = fields.Select(f =>
                {
                    var fieldName = GetJsonStringFromElement(f, "fieldName") ?? "";
                    var pre = GetJsonStringFromElement(f, "prefix") ?? "";
                    var suf = GetJsonStringFromElement(f, "suffix") ?? "";
                    var val = transformed.GetValueOrDefault(fieldName)?.ToString() ?? "";
                    return $"{pre}{val}{suf}";
                });
                return $"{globalPrefix}{string.Join(sep, parts)}{globalSuffix}";
            }

            case "IfThen":
            {
                // Support sourceField (primary) or sourceFields (fallback)
                string conditionFieldName = "";
                string sourceValue = "";

                var sf = GetJsonString(p, "sourceField");
                if (!string.IsNullOrWhiteSpace(sf))
                {
                    conditionFieldName = sf;
                    sourceValue = sourceRecord.GetValueOrDefault(sf)?.ToString() ?? "";
                }
                else
                {
                    var sfs = GetJsonStringArray(p, "sourceFields");
                    if (sfs.Count > 0)
                    {
                        conditionFieldName = sfs[0];
                        sourceValue = sourceRecord.GetValueOrDefault(sfs[0])?.ToString() ?? "";
                    }
                }

                var condition = GetJsonString(p, "condition") ?? "";
                var conditionMet = EvaluateCondition(sourceValue, condition);
                var template = conditionMet
                    ? (GetJsonString(p, "trueValue") ?? "")
                    : (GetJsonString(p, "falseValue") ?? "");

                return ReplaceFieldPlaceholders(template, sourceRecord);
            }

            case "Case":
            {
                var srcField = GetJsonString(p, "sourceField") ?? "";
                var caseSourceValue = "";
                // Case-insensitive field lookup
                foreach (var kv in sourceRecord)
                {
                    if (string.Equals(kv.Key, srcField, StringComparison.OrdinalIgnoreCase))
                    {
                        caseSourceValue = (kv.Value?.ToString() ?? "").Trim();
                        break;
                    }
                }

                if (string.IsNullOrEmpty(caseSourceValue))
                    return GetJsonString(p, "defaultValue") ?? "";

                if (p.HasValue && p.Value.TryGetProperty("cases", out var casesEl) && casesEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var caseItem in casesEl.EnumerateArray())
                    {
                        var caseCondition = (GetJsonStringFromElement(caseItem, "case") ?? "").Trim();
                        if (string.Equals(caseSourceValue, caseCondition, StringComparison.OrdinalIgnoreCase))
                            return GetJsonStringFromElement(caseItem, "value") ?? "";
                    }
                }

                return GetJsonString(p, "defaultValue") ?? "";
            }

            case "Coalesce":
            {
                var fields = GetJsonStringArray(p, "sourceFields");
                var defaultVal = GetJsonString(p, "defaultValue") ?? "";
                foreach (var field in fields)
                {
                    var val = sourceRecord.GetValueOrDefault(field)?.ToString();
                    if (!string.IsNullOrWhiteSpace(val))
                        return val;
                }
                return defaultVal;
            }

            case "Concat":
            {
                var fields = GetJsonStringArray(p, "sourceFields");
                var sep = GetJsonString(p, "separator") ?? "";
                var prefix = GetJsonString(p, "prefix") ?? "";
                var suffix = GetJsonString(p, "suffix") ?? "";
                var vals = fields
                    .Select(f => sourceRecord.GetValueOrDefault(f)?.ToString() ?? "")
                    .Where(v => !string.IsNullOrWhiteSpace(v));
                return $"{prefix}{string.Join(sep, vals)}{suffix}";
            }

            default:
                return "";
        }
    }

    // ────────────────────────────────────────────
    //  Lookup resolution
    // ────────────────────────────────────────────
    private object? ResolveLookup(
        Dictionary<string, object?> sourceRecord,
        FieldRuleDto rule,
        Dictionary<string, List<Dictionary<string, object?>>> lookupTables)
    {
        var p = rule.Parameters;
        if (p == null) return GetJsonString(p, "defaultValue") ?? "";

        var tableName = GetJsonString(p, "sourceTable") ?? GetJsonString(p, "lookupTable");
        var returnField = GetJsonString(p, "returnField") ?? "";
        var defaultVal = GetJsonString(p, "defaultValue") ?? "";

        // Resolve field names from joinConditions (saved format) or flat params (preview format)
        string? localField = GetJsonString(p, "sourceField");
        string? matchField = GetJsonString(p, "matchField");

        // Check joinConditions
        if (p.Value.TryGetProperty("joinConditions", out var jcEl) && jcEl.ValueKind == JsonValueKind.Array)
        {
            var first = jcEl.EnumerateArray().FirstOrDefault();
            if (first.ValueKind == JsonValueKind.Object)
            {
                var jcType = GetJsonStringFromElement(first, "type");
                if (jcType == "field")
                {
                    localField = GetJsonStringFromElement(first, "localField");
                    matchField = GetJsonStringFromElement(first, "sourceField");
                }
                else if (jcType == "composite")
                {
                    // Use first field pair for simple lookup
                    localField = GetJsonStringArrayFromElement(first, "localFields").FirstOrDefault();
                    matchField = GetJsonStringArrayFromElement(first, "sourceFields").FirstOrDefault();
                }
            }
        }

        if (string.IsNullOrEmpty(tableName) || !lookupTables.TryGetValue(tableName, out var lookupData))
            return defaultVal;

        var sourceValue = sourceRecord.GetValueOrDefault(localField ?? "")?.ToString();
        if (string.IsNullOrEmpty(sourceValue)) return defaultVal;

        // Check for composite join
        Dictionary<string, object?>? matchedRecord = null;
        if (p.Value.TryGetProperty("joinConditions", out var jcEl2) && jcEl2.ValueKind == JsonValueKind.Array)
        {
            var first = jcEl2.EnumerateArray().FirstOrDefault();
            if (first.ValueKind == JsonValueKind.Object && GetJsonStringFromElement(first, "type") == "composite")
            {
                var localFields = GetJsonStringArrayFromElement(first, "localFields");
                var sourceFields = GetJsonStringArrayFromElement(first, "sourceFields");
                matchedRecord = lookupData.FirstOrDefault(r =>
                    localFields.Select((lf, i) =>
                    {
                        var sf = i < sourceFields.Count ? sourceFields[i] : "";
                        return string.Equals(
                            (r.GetValueOrDefault(sf)?.ToString() ?? "").Trim(),
                            (sourceRecord.GetValueOrDefault(lf)?.ToString() ?? "").Trim(),
                            StringComparison.OrdinalIgnoreCase);
                    }).All(x => x));
            }
        }

        matchedRecord ??= lookupData.FirstOrDefault(r =>
            string.Equals(
                (r.GetValueOrDefault(matchField ?? "")?.ToString() ?? "").Trim(),
                sourceValue.Trim(),
                StringComparison.OrdinalIgnoreCase));

        return matchedRecord?.GetValueOrDefault(returnField)?.ToString() ?? defaultVal;
    }

    private object? ResolveMultipleLookups(
        Dictionary<string, object?> sourceRecord,
        FieldRuleDto rule,
        Dictionary<string, List<Dictionary<string, object?>>> lookupTables)
    {
        var p = rule.Parameters;
        if (p == null) return "";
        var defaultVal = GetJsonString(p, "defaultValue") ?? "";

        if (!p.Value.TryGetProperty("lookupSteps", out var stepsEl) || stepsEl.ValueKind != JsonValueKind.Array)
            return defaultVal;

        string? currentValue = null;

        int stepIndex = 0;
        foreach (var step in stepsEl.EnumerateArray())
        {
            var lookupTableName = GetJsonStringFromElement(step, "lookupTable");
            var returnField = GetJsonStringFromElement(step, "returnField") ?? "";

            if (string.IsNullOrEmpty(lookupTableName) || !lookupTables.TryGetValue(lookupTableName, out var lookupData))
                return defaultVal;

            // Get match value
            string? matchValue;
            if (stepIndex == 0)
            {
                // First step: get from source record
                if (step.TryGetProperty("joinConditions", out var jcEl) && jcEl.ValueKind == JsonValueKind.Array)
                {
                    var first = jcEl.EnumerateArray().FirstOrDefault();
                    var jcType = GetJsonStringFromElement(first, "type");
                    if (jcType == "field")
                    {
                        var lf = GetJsonStringFromElement(first, "localField");
                        matchValue = sourceRecord.GetValueOrDefault(lf ?? "")?.ToString();
                    }
                    else if (jcType == "composite")
                    {
                        var lfs = GetJsonStringArrayFromElement(first, "localFields");
                        matchValue = string.Join("|", lfs.Select(f => sourceRecord.GetValueOrDefault(f)?.ToString() ?? ""));
                    }
                    else if (jcType == "concatenation")
                    {
                        var expr = GetJsonStringFromElement(first, "localExpression") ?? "";
                        foreach (var kv in sourceRecord)
                            expr = expr.Replace($"{{{kv.Key}}}", kv.Value?.ToString() ?? "");
                        matchValue = expr;
                    }
                    else
                    {
                        matchValue = null;
                    }
                }
                else
                {
                    matchValue = null;
                }
            }
            else
            {
                matchValue = currentValue;
            }

            if (string.IsNullOrEmpty(matchValue)) return defaultVal;

            // Find matching record
            Dictionary<string, object?>? matchedRecord = null;
            if (step.TryGetProperty("joinConditions", out var jcEl2) && jcEl2.ValueKind == JsonValueKind.Array)
            {
                var first = jcEl2.EnumerateArray().FirstOrDefault();
                var jcType = GetJsonStringFromElement(first, "type");
                if (jcType == "field")
                {
                    var sf = GetJsonStringFromElement(first, "sourceField");
                    matchedRecord = lookupData.FirstOrDefault(r =>
                        string.Equals(
                            (r.GetValueOrDefault(sf ?? "")?.ToString() ?? "").Trim(),
                            matchValue.Trim(),
                            StringComparison.OrdinalIgnoreCase));
                }
                else if (jcType == "composite")
                {
                    var sfs = GetJsonStringArrayFromElement(first, "sourceFields");
                    var compositeKey = string.Join("|", sfs.Select(sf => "{" + sf + "}"));
                    matchedRecord = lookupData.FirstOrDefault(r =>
                    {
                        var key = string.Join("|", sfs.Select(sf => r.GetValueOrDefault(sf)?.ToString() ?? ""));
                        return string.Equals(key.Trim(), matchValue.Trim(), StringComparison.OrdinalIgnoreCase);
                    });
                }
                else if (jcType == "concatenation")
                {
                    var sourceExpr = GetJsonStringFromElement(first, "sourceExpression") ?? "";
                    matchedRecord = lookupData.FirstOrDefault(r =>
                    {
                        var expr = sourceExpr;
                        foreach (var kv in r)
                            expr = expr.Replace($"{{{kv.Key}}}", kv.Value?.ToString() ?? "");
                        return string.Equals(expr.Trim(), matchValue.Trim(), StringComparison.OrdinalIgnoreCase);
                    });
                }
            }

            if (matchedRecord == null) return defaultVal;
            currentValue = matchedRecord.GetValueOrDefault(returnField)?.ToString();
            stepIndex++;
        }

        return currentValue ?? defaultVal;
    }

    // ────────────────────────────────────────────
    //  Condition evaluation (mirrors frontend)
    // ────────────────────────────────────────────
    private static bool EvaluateCondition(string value, string condition)
    {
        var parts = condition.Split(' ', 2, StringSplitOptions.TrimEntries);
        var op = parts.Length > 0 ? parts[0].ToLowerInvariant() : "";
        var condVal = parts.Length > 1 ? parts[1] : "";

        return op switch
        {
            "equals" or "==" or "=" => string.Equals(value, condVal, StringComparison.OrdinalIgnoreCase),
            "not_equals" or "!=" => !string.Equals(value, condVal, StringComparison.OrdinalIgnoreCase),
            "contains" => value.Contains(condVal, StringComparison.OrdinalIgnoreCase),
            "starts_with" => value.StartsWith(condVal, StringComparison.OrdinalIgnoreCase),
            "ends_with" => value.EndsWith(condVal, StringComparison.OrdinalIgnoreCase),
            "greater_than" or ">" => double.TryParse(value, out var v1) && double.TryParse(condVal, out var v2) && v1 > v2,
            "less_than" or "<" => double.TryParse(value, out var v3) && double.TryParse(condVal, out var v4) && v3 < v4,
            "isnull" or "is_null" => string.IsNullOrEmpty(value),
            "isnotnull" or "is_not_null" => !string.IsNullOrEmpty(value),
            "isempty" or "is_empty" => string.IsNullOrWhiteSpace(value),
            "isnotempty" or "is_not_empty" => !string.IsNullOrWhiteSpace(value),
            _ => !string.IsNullOrEmpty(value) // default: truthy check
        };
    }

    private static string ReplaceFieldPlaceholders(string template, Dictionary<string, object?> record)
    {
        if (string.IsNullOrEmpty(template)) return template;
        return Regex.Replace(template, @"\{([^}]+)\}", m =>
        {
            var fieldName = m.Groups[1].Value.Trim();
            return record.GetValueOrDefault(fieldName)?.ToString() ?? "";
        });
    }

    // ────────────────────────────────────────────
    //  CSV writing
    // ────────────────────────────────────────────
    private async Task<List<string>> ExportSourceStoresToCsvAsync(
        SourceStoreProvider sourceStoreProvider,
        IEnumerable<string> sourceTables,
        string sourceOutputDir,
        long maxFileSizeBytes,
        bool includeTimestampSuffix,
        bool splitFiles,
        bool exportByMasterProcess,
        CancellationToken ct)
    {
        var files = new List<string>();

        var sourceMasterDir = Path.Combine(sourceOutputDir, "master");
        var sourceProcessDir = Path.Combine(sourceOutputDir, "process");

        if (exportByMasterProcess)
        {
            Directory.CreateDirectory(sourceMasterDir);
            Directory.CreateDirectory(sourceProcessDir);
        }

        foreach (var sourceTable in sourceTables.Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(k => k, StringComparer.OrdinalIgnoreCase))
        {
            ct.ThrowIfCancellationRequested();

            var sourceData = await sourceStoreProvider.GetStoreAsync(sourceTable, ct);

            if (sourceData.Count == 0)
                continue;

            var targetDir = exportByMasterProcess
                ? (IsProcessSourceTable(sourceTable) ? sourceProcessDir : sourceMasterDir)
                : sourceOutputDir;

            var storeFiles = await WriteCsvFilesAsync(
                sourceTable,
                sourceData,
                targetDir,
                maxFileSizeBytes,
                ct,
                includeTimestampSuffix,
                splitFiles);
            files.AddRange(storeFiles);

            // Keep export memory bounded; store will be reloaded on-demand when mappings execute.
            sourceStoreProvider.ReleaseStore(sourceTable);
        }

        return files;
    }

    private async Task<List<string>> WriteCsvFilesAsync(
        string entityName,
        List<Dictionary<string, object?>> data,
        string outputDir,
        long maxFileSizeBytes,
        CancellationToken ct,
        bool includeTimestampSuffix = true,
        bool splitFiles = true)
    {
        var files = new List<string>();
        if (data.Count == 0) return files;

        var paths = await WriteSingleCsvAsync(entityName, data, outputDir, maxFileSizeBytes, includeTimestampSuffix, splitFiles, ct);
        files.AddRange(paths);

        return files;
    }

    private async Task<List<string>> WriteSingleCsvAsync(
        string entityName,
        List<Dictionary<string, object?>> data,
        string outputDir,
        long maxFileSizeBytes,
        bool includeTimestampSuffix,
        bool splitFiles,
        CancellationToken ct)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
        var timestampSuffix = includeTimestampSuffix ? $"_{timestamp}" : string.Empty;
        var files = new List<string>();
        int fileIndex = 1;
        var fileName = $"{entityName}{timestampSuffix}.csv";
        var filePath = Path.Combine(outputDir, fileName);

        // Determine columns — PrimaryKey first
        var columns = data[0].Keys.ToList();
        if (columns.Contains("PrimaryKey"))
        {
            columns.Remove("PrimaryKey");
            columns.Insert(0, "PrimaryKey");
        }

        var writer = new StreamWriter(filePath);
        await writer.WriteLineAsync(string.Join(",", columns));
        long currentFileBytes = System.Text.Encoding.UTF8.GetByteCount(string.Join(",", columns) + Environment.NewLine);
        int recordsInCurrentFile = 0;
        files.Add(filePath);

        // Rows
        try
        {
            foreach (var row in data)
            {
                ct.ThrowIfCancellationRequested();
                var values = columns.Select(col =>
                {
                    var val = row.GetValueOrDefault(col);
                    var str = FormatCsvValue(col, val);
                    // Quote if needed
                    if (str.Contains(',') || str.Contains('"') || str.Contains('\n') || str.Contains('\r'))
                        return $"\"{str.Replace("\"", "\"\"")}\"";
                    return str;
                });

                var line = string.Join(",", values);
                var lineBytes = System.Text.Encoding.UTF8.GetByteCount(line + Environment.NewLine);

                if (splitFiles && recordsInCurrentFile > 0 && currentFileBytes + lineBytes > maxFileSizeBytes)
                {
                    await writer.FlushAsync();
                    await writer.DisposeAsync();

                    fileIndex++;
                    fileName = includeTimestampSuffix
                        ? $"{entityName}_{timestamp}_{fileIndex:D2}.csv"
                        : $"{entityName}_{fileIndex:D2}.csv";
                    filePath = Path.Combine(outputDir, fileName);
                    writer = new StreamWriter(filePath);
                    await writer.WriteLineAsync(string.Join(",", columns));
                    currentFileBytes = System.Text.Encoding.UTF8.GetByteCount(string.Join(",", columns) + Environment.NewLine);
                    recordsInCurrentFile = 0;
                    files.Add(filePath);
                }

                await writer.WriteLineAsync(line);
                currentFileBytes += lineBytes;
                recordsInCurrentFile++;
            }
        }
        finally
        {
            await writer.FlushAsync();
            await writer.DisposeAsync();
        }

        return files;
    }

    private static string FormatCsvValue(string columnName, object? val)
    {
        if (val == null) return "";

        // Keep migration source timestamp aligned with target DB convention.
        if (string.Equals(columnName, "sourceTimeStamp", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(columnName, "sourceTimestamp", StringComparison.OrdinalIgnoreCase))
        {
            return FormatSourceTimestamp(val);
        }

        if (val is DateTime dt) return dt.ToString("O"); // ISO 8601
        if (val is DateTimeOffset dto) return dto.ToString("O");
        return val.ToString() ?? "";
    }

    private static string FormatSourceTimestamp(object val)
    {
        DateTime utc;

        if (val is DateTime dt)
        {
            utc = dt.Kind == DateTimeKind.Utc ? dt : dt.ToUniversalTime();
        }
        else if (val is DateTimeOffset dto)
        {
            utc = dto.UtcDateTime;
        }
        else
        {
            var raw = val.ToString() ?? string.Empty;
            if (!DateTime.TryParse(
                    raw,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                    out utc))
            {
                return raw;
            }
        }

        return utc.ToString("yyyy-MM-dd'T'HH:mm:ss.000'z'", CultureInfo.InvariantCulture);
    }

    private static string FormatEntityNameForOutput(string? entityName)
    {
        if (string.IsNullOrWhiteSpace(entityName))
            return string.Empty;

        if (entityName.Contains("_to_", StringComparison.OrdinalIgnoreCase)
            && entityName.EndsWith("_mapping", StringComparison.OrdinalIgnoreCase))
        {
            var mappingSuffixLength = "_mapping".Length;
            var withoutSuffix = entityName[..^mappingSuffixLength];
            var split = withoutSuffix.Split(new[] { "_to_" }, 2, StringSplitOptions.None);

            if (split.Length == 2)
            {
                var sourceEntity = FormatSimpleEntityLabel(split[0]);
                var targetEntity = FormatSimpleEntityLabel(split[1]);
                return $"{sourceEntity}_to_{targetEntity}_mapping";
            }
        }

        return FormatSimpleEntityLabel(entityName);
    }

    private static string FormatSimpleEntityLabel(string entityName)
    {
        if (string.IsNullOrWhiteSpace(entityName))
            return string.Empty;

        var spaced = entityName
            .Replace("_", " ")
            .Replace("-", " ");

        spaced = Regex.Replace(spaced, "([a-z0-9])([A-Z])", "$1 $2");
        spaced = Regex.Replace(spaced, "([A-Z]+)([A-Z][a-z])", "$1 $2");
        spaced = Regex.Replace(spaced, "\\s+", " ").Trim();

        var textInfo = CultureInfo.InvariantCulture.TextInfo;
        var tokens = spaced
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(token => ExpandIsa95Token(token, textInfo));

        return string.Join(" ", tokens);
    }

    private static string ExpandIsa95Token(string token, TextInfo textInfo)
    {
        var lower = token.ToLowerInvariant();

        if (!lower.All(char.IsLetter))
            return textInfo.ToTitleCase(lower);

        var words = new List<string>();
        var position = 0;

        while (position < lower.Length)
        {
            var matched = KnownIsa95TermsByLength.FirstOrDefault(term =>
                position + term.Length <= lower.Length &&
                lower.AsSpan(position, term.Length).Equals(term.AsSpan(), StringComparison.Ordinal));

            if (matched is null)
                return textInfo.ToTitleCase(lower);

            words.Add(textInfo.ToTitleCase(matched));
            position += matched.Length;
        }

        return string.Join(" ", words);
    }

    private static bool IsProcessSourceTable(string sourceTable)
    {
        return ProcessSourceTables.Contains(sourceTable);
    }

    // ────────────────────────────────────────────
    //  Helper: sequence start value
    // ────────────────────────────────────────────
    private int GetSequenceStart(FieldRuleDto? rule)
    {
        if (rule == null) return 1;
        if (rule.RuleType is "Sequence" or "PrefixSequence")
            return GetJsonInt(rule.Parameters, "start") ?? 1;
        return 1;
    }

    // ────────────────────────────────────────────
    //  JSON helpers
    // ────────────────────────────────────────────
    private static string? GetJsonString(JsonElement? el, string prop)
    {
        if (el == null) return null;
        if (el.Value.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String)
            return v.GetString();
        return null;
    }

    private static int? GetJsonInt(JsonElement? el, string prop)
    {
        if (el == null) return null;
        if (el.Value.TryGetProperty(prop, out var v))
        {
            if (v.ValueKind == JsonValueKind.Number) return v.GetInt32();
            if (v.ValueKind == JsonValueKind.String && int.TryParse(v.GetString(), out var i)) return i;
        }
        return null;
    }

    private static double? GetJsonDouble(JsonElement? el, string prop)
    {
        if (el == null) return null;
        if (el.Value.TryGetProperty(prop, out var v))
        {
            if (v.ValueKind == JsonValueKind.Number) return v.GetDouble();
            if (v.ValueKind == JsonValueKind.String && double.TryParse(v.GetString(), out var d)) return d;
        }
        return null;
    }

    private static List<string> GetJsonStringArray(JsonElement? el, string prop)
    {
        if (el == null) return new();
        if (el.Value.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Array)
            return v.EnumerateArray().Select(x => x.GetString() ?? "").ToList();
        return new();
    }

    private static List<JsonElement> GetJsonObjectArray(JsonElement? el, string prop)
    {
        if (el == null) return new();
        if (el.Value.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Array)
            return v.EnumerateArray().ToList();
        return new();
    }

    private static string? GetJsonStringFromElement(JsonElement el, string prop)
    {
        if (el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String)
            return v.GetString();
        return null;
    }

    private static List<string> GetJsonStringArrayFromElement(JsonElement el, string prop)
    {
        if (el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Array)
            return v.EnumerateArray().Select(x => x.GetString() ?? "").ToList();
        return new();
    }

    // ────────────────────────────────────────────
    //  Save session progress
    // ────────────────────────────────────────────
    private async Task SaveSession(MigrationSession session, List<string> logMessages, CancellationToken ct)
    {
        session.LogMessages = JsonSerializer.Serialize(logMessages);
        await _dbContext.SaveChangesAsync(ct);
    }
}
