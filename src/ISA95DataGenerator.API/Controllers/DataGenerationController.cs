using System.Data;
using System.Diagnostics;
using System.IO.Compression;
using System.Text.Json;
using System.Text.RegularExpressions;
using ISA95DataGenerator.Application.Interfaces;
using ISA95DataGenerator.Domain.Entities;
using ISA95DataGenerator.Domain.Models;
using ISA95DataGenerator.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ISA95DataGenerator.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DataGenerationController : ControllerBase
{
    private readonly ITestDataGeneratorService _generatorService;
    private readonly IMappingFileService _mappingFileService;
    private readonly MigrationDbContext _dbContext;
    private readonly ILogger<DataGenerationController> _logger;
    private static readonly string[] Isa95Terms =
    {
        "operations", "operation", "segment", "material", "equipment", "personnel", "person",
        "requirement", "requirements", "response", "responses", "actual", "actuals",
        "definition", "definitions", "property", "properties", "class", "classes",
        "capability", "capabilities", "specification", "specifications", "hierarchy", "scope",
        "line", "plant", "production", "test"
    };

    public DataGenerationController(
        ITestDataGeneratorService generatorService,
        IMappingFileService mappingFileService,
        MigrationDbContext dbContext,
        ILogger<DataGenerationController> logger)
    {
        _generatorService = generatorService;
        _mappingFileService = mappingFileService;
        _dbContext = dbContext;
        _logger = logger;
    }

    private static string FormatEntityName(string entityName)
    {
        if (string.IsNullOrWhiteSpace(entityName))
        {
            return entityName;
        }

        var normalized = entityName.Trim().Replace("_", " ").Replace("-", " ");
        normalized = Regex.Replace(normalized, "([a-z])([A-Z])", "$1 $2");

        if (!normalized.Contains(' '))
        {
            var lower = normalized.ToLowerInvariant();
            foreach (var term in Isa95Terms.OrderByDescending(t => t.Length))
            {
                lower = Regex.Replace(lower, term, $" {term} ");
            }
            normalized = Regex.Replace(lower, "\\s+", " ").Trim();
        }

        var words = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        for (int i = 0; i < words.Length; i++)
        {
            words[i] = char.ToUpper(words[i][0]) + words[i][1..];
        }

        return string.Join(" ", words);
    }

    [HttpPost("generate-data")]
    public async Task<IActionResult> GenerateData([FromBody] DataGenerationRequest request)
    {
        try
        {
            _logger.LogInformation("Generating data for entity {EntityName}", request.RootEntityName);
            
            var response = await _generatorService.GenerateDataAsync(request);
            
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating data");
            return StatusCode(500, new { error = "Failed to generate data", message = ex.Message });
        }
    }

    [HttpPost("generate-mapping")]
    public async Task<IActionResult> GenerateMappingFile([FromBody] DataGenerationRequest request)
    {
        try
        {
            _logger.LogInformation("Generating mapping file for entity {EntityName}", request.RootEntityName);
            
            var response = await _generatorService.GenerateDataAsync(request);
            
            return Ok(response.MappingFile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating mapping file");
            return StatusCode(500, new { error = "Failed to generate mapping file", message = ex.Message });
        }
    }

    [HttpPost("download")]
    public async Task<IActionResult> DownloadGeneratedData([FromBody] DataGenerationRequest request)
    {
        try
        {
            _logger.LogInformation("Preparing download for entity {EntityName}", request.RootEntityName);
            
            var response = await _generatorService.GenerateDataAsync(request);
            
            using var memoryStream = new MemoryStream();
            using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
            {
                // Generate CSV file for each entity
                _logger.LogInformation("\n--- CSV Export: Creating {Count} files ---", response.GeneratedData.Count);
                foreach (var kvp in response.GeneratedData)
                {
                    var entityDisplayName = FormatEntityName(kvp.Key);
                    _logger.LogInformation("Exporting {EntityName}.csv ({InstanceCount} rows)", entityDisplayName, kvp.Value.Count);
                    
                    var entry = archive.CreateEntry($"{entityDisplayName}.csv");
                    using var entryStream = entry.Open();
                    using var writer = new StreamWriter(entryStream);
                    
                    if (kvp.Value.Count > 0)
                    {
                        // Write CSV header - include id and other fields, exclude internal fields starting with _
                        var firstRow = kvp.Value[0];
                        var dataHeaders = firstRow.Keys
                            .Where(k => k == "id" || !k.StartsWith("_"))
                            .OrderBy(k => k == "id" ? 0 : 1) // Put id first
                            .ToList();
                        
                        // Add PrimaryKey as first column, then id, then rest
                        var allHeaders = new List<string> { "PrimaryKey", "id" };
                        allHeaders.AddRange(dataHeaders.Where(h => h != "id"));
                        
                        await writer.WriteLineAsync(string.Join(",", allHeaders.Select(h => $"\"{h}\"")));
                        
                        // Write CSV rows
                        foreach (var row in kvp.Value)
                        {
                            var values = allHeaders.Select(h =>
                            {
                                // PrimaryKey and id have the same value
                                var value = h == "PrimaryKey" ? (row.ContainsKey("id") ? row["id"] : "") : (row.ContainsKey(h) ? row[h] : "");
                                if (value is System.Collections.IEnumerable enumerable && value is not string)
                                {
                                    var items = enumerable.Cast<object>().Select(i => i?.ToString() ?? "");
                                    return $"\"{string.Join(";", items)}\"";
                                }
                                return $"\"{value?.ToString()?.Replace("\"", "\"\"") ?? ""}\"";
                            });
                            await writer.WriteLineAsync(string.Join(",", values));
                        }
                    }
                }

                // Generate separate mapping CSV file for each relationship
                _logger.LogInformation("Generating mapping files. Total mappings: {Count}", response.MappingFile.Mappings.Count);
                
                var mappingsByRelationship = response.MappingFile.Mappings
                    .GroupBy(m => new { m.SourceType, m.TargetType, m.RelationshipType })
                    .ToList();
                
                _logger.LogInformation("Grouped into {Count} relationship files", mappingsByRelationship.Count);
                
                foreach (var group in mappingsByRelationship)
                {
                    // Format: ParentEntity_to_ChildEntity_mapping.csv
                    var mappingFileName = $"{group.Key.SourceType}_to_{group.Key.TargetType}_mapping.csv";
                    _logger.LogInformation("Creating mapping file: {FileName} with {Count} mappings", mappingFileName, group.Count());
                    
                    var mappingEntry = archive.CreateEntry(mappingFileName);
                    using var mappingStream = mappingEntry.Open();
                    using var mappingWriter = new StreamWriter(mappingStream);
                    
                    // Write mapping CSV header
                    await mappingWriter.WriteLineAsync("\"Source type\",\"Source PrimaryKey\",\"Target Type\",\"Target PrimaryKey\",\"Relationship Type\"");
                    
                    // Write mapping rows for this relationship
                    foreach (var mapping in group)
                    {
                        await mappingWriter.WriteLineAsync($"\"{mapping.SourceType}\",\"{mapping.SourcePrimaryKey}\",\"{mapping.TargetType}\",\"{mapping.TargetPrimaryKey}\",\"{mapping.RelationshipType}\"");
                    }
                }
            }

            memoryStream.Position = 0;
            var fileName = $"ISA95_TestData_{request.RootEntityName}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.zip";
            
            return File(memoryStream.ToArray(), "application/zip", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error preparing download");
            return StatusCode(500, new { error = "Failed to prepare download", message = ex.Message });
        }
    }

    // ─────────────────────── Mass persist ───────────────────────

    /// <summary>
    /// Generate large volumes of dummy data for selected entities based on the DTDL schema
    /// and persist them directly to GenericDataStores for performance testing.
    /// </summary>
    [HttpPost("mass-persist")]
    [RequestSizeLimit(50_000_000)]
    public async Task<IActionResult> MassPersist([FromBody] MassPersistRequest request)
    {
        if (request.Entities == null || request.Entities.Count == 0)
            return BadRequest("At least one entity must be specified.");

        var sw = Stopwatch.StartNew();
        var result = new MassPersistResult();

        foreach (var cfg in request.Entities)
        {
            if (string.IsNullOrWhiteSpace(cfg.EntityName) || cfg.Count <= 0)
                continue;

            var storeName = cfg.StoreName ?? DeriveStoreName(cfg.EntityName);
            var entityResult = new MassPersistEntityResult
            {
                EntityName = cfg.EntityName,
                StoreName = storeName,
            };

            try
            {
                _logger.LogInformation("Mass-persist: generating {Count} records for entity '{Entity}' -> store '{Store}'",
                    cfg.Count, cfg.EntityName, storeName);

                var genRequest = new DataGenerationRequest
                {
                    RootEntityName = cfg.EntityName,
                    IncludedRelatedEntities = new List<string>(),
                    InstanceCount = cfg.Count,
                    Seed = request.Seed,
                    PrimaryKeyRules = request.PrimaryKeyRules,
                    FieldRules = request.FieldRules,
                    MaxDepth = 1,
                    SkipMappingFile = true,
                };

                var genResponse = await _generatorService.GenerateDataAsync(genRequest);

                // Get the records for this entity from the response
                var records = genResponse.GeneratedData.TryGetValue(cfg.EntityName, out var found)
                    ? found
                    : genResponse.GeneratedData.Values.FirstOrDefault() ?? new();

                entityResult.Generated = records.Count;

                if (records.Count == 0)
                {
                    result.Results.Add(entityResult);
                    continue;
                }

                var now = DateTime.UtcNow;
                var incoming = records
                    .Select(r =>
                    {
                        var json = JsonSerializer.Serialize(r);
                        var recordId = r.TryGetValue("id", out var idVal) ? idVal?.ToString() : null;
                        return (RecordId: recordId, Json: json);
                    })
                    .Where(x => !string.IsNullOrWhiteSpace(x.RecordId))
                    .ToList();

                // Bulk-upsert via SqlBulkCopy into a temp staging table, then MERGE
                var conn = (SqlConnection)_dbContext.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                    await conn.OpenAsync();

                // 1. Create temp table
                await using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = """
                        CREATE TABLE #MassInsertStage (
                            StoreName   NVARCHAR(200)  NOT NULL,
                            RecordId    NVARCHAR(400)  NOT NULL,
                            DataJson    NVARCHAR(MAX)  NOT NULL,
                            CreatedAt   DATETIME2      NOT NULL,
                            UpdatedAt   DATETIME2      NOT NULL,
                            IsMassData  BIT            NOT NULL
                        );
                        """;
                    await cmd.ExecuteNonQueryAsync();
                }

                // 2. Bulk-load into temp table
                using (var dt = new DataTable())
                {
                    dt.Columns.Add("StoreName",  typeof(string));
                    dt.Columns.Add("RecordId",   typeof(string));
                    dt.Columns.Add("DataJson",   typeof(string));
                    dt.Columns.Add("CreatedAt",  typeof(DateTime));
                    dt.Columns.Add("UpdatedAt",  typeof(DateTime));
                    dt.Columns.Add("IsMassData", typeof(bool));
                    foreach (var (recordId, json) in incoming)
                        dt.Rows.Add(storeName, recordId, json, now, now, true);

                    using var bulkCopy = new SqlBulkCopy(conn)
                    {
                        DestinationTableName = "#MassInsertStage",
                        BatchSize = 10_000,
                    };
                    await bulkCopy.WriteToServerAsync(dt);
                }

                // 3. MERGE into GenericDataStores
                int added, updated;
                await using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandTimeout = 300;
                    cmd.CommandText = """
                        MERGE GenericDataStores AS target
                        USING #MassInsertStage AS src
                            ON target.StoreName = src.StoreName AND target.RecordId = src.RecordId
                        WHEN MATCHED THEN
                            UPDATE SET target.DataJson   = src.DataJson,
                                       target.UpdatedAt  = src.UpdatedAt
                        WHEN NOT MATCHED BY TARGET THEN
                            INSERT (StoreName, RecordId, DataJson, CreatedAt, UpdatedAt, LastDataMigrationAt, IsMassData)
                            VALUES (src.StoreName, src.RecordId, src.DataJson, src.CreatedAt, src.UpdatedAt, NULL, 1)
                        OUTPUT $action;
                        """;
                    added = 0; updated = 0;
                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        if (reader.GetString(0) == "INSERT") added++;
                        else updated++;
                    }
                }

                // 4. Drop temp table
                await using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "DROP TABLE IF EXISTS #MassInsertStage;";
                    await cmd.ExecuteNonQueryAsync();
                }

                entityResult.Added   = added;
                entityResult.Updated = updated;
                result.TotalRecords += added + updated;
                _logger.LogInformation("Mass-persist '{Entity}': {Added} added, {Updated} updated",
                    cfg.EntityName, entityResult.Added, entityResult.Updated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Mass-persist failed for entity '{Entity}'", cfg.EntityName);
                entityResult.Error = ex.Message;
            }

            result.Results.Add(entityResult);
        }

        sw.Stop();
        result.ElapsedMs = sw.ElapsedMilliseconds;
        result.GeneratedAt = DateTime.UtcNow;

        return Ok(result);
    }

    /// <summary>
    /// Derives a camelCase plural store name from an entity name.
    /// e.g. "MaterialLot" → "materialLots", "EquipmentClass" → "equipmentClasses"
    /// </summary>
    private static string DeriveStoreName(string entityName)
    {
        if (string.IsNullOrWhiteSpace(entityName)) return entityName;
        var camel = char.ToLower(entityName[0]) + entityName[1..];
        if (camel.EndsWith("y") && camel.Length > 1 && !"aeiou".Contains(camel[^2]))
            return camel[..^1] + "ies";
        if (camel.EndsWith("s") || camel.EndsWith("x") || camel.EndsWith("z") ||
            camel.EndsWith("sh") || camel.EndsWith("ch"))
            return camel + "es";
        return camel + "s";
    }

    // ─────────────────────── Cleanup ───────────────────────

    /// <summary>
    /// Returns the count of mass-generated records (optionally filtered by store name).
    /// </summary>
    [HttpGet("mass-persist/count")]
    public async Task<IActionResult> GetMassDataCount([FromQuery] string? storeName = null)
    {
        var query = _dbContext.GenericDataStores.Where(r => r.IsMassData);
        if (!string.IsNullOrWhiteSpace(storeName))
            query = query.Where(r => r.StoreName == storeName);

        var total = await query.CountAsync();
        var byStore = await query
            .GroupBy(r => r.StoreName)
            .Select(g => new { storeName = g.Key, count = g.Count() })
            .ToListAsync();

        return Ok(new { total, byStore });
    }

    /// <summary>
    /// Deletes all mass-generated records (optionally filtered by store name).
    /// </summary>
    [HttpDelete("mass-persist")]
    public async Task<IActionResult> ClearMassData([FromQuery] string? storeName = null)
    {
        var query = _dbContext.GenericDataStores.Where(r => r.IsMassData);
        if (!string.IsNullOrWhiteSpace(storeName))
            query = query.Where(r => r.StoreName == storeName);

        var deleted = await query.ExecuteDeleteAsync();
        _logger.LogInformation("Cleared {Count} mass-generated records (store filter: {Store})", deleted, storeName ?? "all");
        return Ok(new { deleted });
    }
}
