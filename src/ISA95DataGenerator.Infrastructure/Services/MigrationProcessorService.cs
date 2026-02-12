using System.Globalization;
using System.Text.Json;
using CsvHelper;
using CsvHelper.Configuration;
using ISA95DataGenerator.Domain.Entities;
using ISA95DataGenerator.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ISA95DataGenerator.Infrastructure.Services;

/// <summary>
/// Service for processing data migrations with streaming CSV generation
/// </summary>
public class MigrationProcessorService
{
    private readonly MigrationDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MigrationProcessorService> _logger;

    public MigrationProcessorService(
        MigrationDbContext dbContext,
        IConfiguration configuration,
        ILogger<MigrationProcessorService> logger)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Execute migration with streaming CSV generation to avoid memory issues
    /// </summary>
    public async Task<MigrationResult> ExecuteMigrationAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await _dbContext.MigrationSessions
            .Include(s => s.SourceTables)
            .Include(s => s.EntityMappings)
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session == null)
            throw new InvalidOperationException($"Migration session {sessionId} not found");

        try
        {
            session.Status = "Processing";
            session.StartedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Starting migration execution for session {SessionId}", sessionId);

            var outputFiles = new List<string>();
            var totalRecords = session.EntityMappings.Sum(m => 
                session.SourceTables.FirstOrDefault(t => t.TableName == m.SourceTable)?.RecordCount ?? 0);
            
            session.TotalRecords = totalRecords;
            var processedRecords = 0;

            // Process each entity mapping
            foreach (var mapping in session.EntityMappings)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    session.Status = "Cancelled";
                    await _dbContext.SaveChangesAsync(cancellationToken);
                    throw new OperationCanceledException();
                }

                _logger.LogInformation("Processing entity {EntityName} from table {SourceTable}", 
                    mapping.EntityName, mapping.SourceTable);

                var sourceTable = session.SourceTables.FirstOrDefault(t => t.TableName == mapping.SourceTable);
                if (sourceTable == null)
                {
                    _logger.LogWarning("Source table {SourceTable} not found for entity {EntityName}", 
                        mapping.SourceTable, mapping.EntityName);
                    continue;
                }

                // Load all lookup tables needed for this mapping (if any)
                var lookupTables = await LoadLookupTablesAsync(mapping, session, cancellationToken);

                // Generate output CSV file
                var outputPath = _configuration.GetValue<string>("MigrationSettings:OutputPath") ?? "Data/Outputs";
                var outputFileName = $"{sessionId}_{mapping.EntityName}_{DateTime.UtcNow:yyyyMMddHHmmss}.csv";
                var outputFilePath = Path.Combine(outputPath, outputFileName);

                var recordsProcessed = await ProcessEntityMappingAsync(
                    sourceTable,
                    mapping,
                    lookupTables,
                    outputFilePath,
                    (current, total) =>
                    {
                        processedRecords++;
                        session.ProcessedRecords = processedRecords;
                        session.ProgressPercentage = totalRecords > 0 ? (int)((processedRecords * 100.0) / totalRecords) : 0;
                        
                        // Update progress every 100 records
                        if (processedRecords % 100 == 0)
                        {
                            _dbContext.SaveChanges();
                        }
                    },
                    cancellationToken);

                outputFiles.Add(outputFilePath);
                _logger.LogInformation("Completed processing entity {EntityName} - {RecordsProcessed} records written to {OutputFile}", 
                    mapping.EntityName, recordsProcessed, outputFilePath);
            }

            session.Status = "Completed";
            session.CompletedAt = DateTime.UtcNow;
            session.ProcessedRecords = processedRecords;
            session.ProgressPercentage = 100;
            session.ResultFilesPaths = JsonSerializer.Serialize(outputFiles);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Migration session {SessionId} completed successfully", sessionId);

            return new MigrationResult
            {
                Success = true,
                OutputFiles = outputFiles,
                TotalRecords = processedRecords
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Migration session {SessionId} failed: {ErrorMessage}", sessionId, ex.Message);
            
            session.Status = "Failed";
            session.ErrorMessage = ex.Message;
            session.CompletedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);

            return new MigrationResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    /// <summary>
    /// Process a single entity mapping with streaming to avoid loading all data in memory
    /// </summary>
    private async Task<int> ProcessEntityMappingAsync(
        SourceDataTable sourceTable,
        EntityMapping mapping,
        Dictionary<string, List<Dictionary<string, string>>> lookupTables,
        string outputFilePath,
        Action<int, int> progressCallback,
        CancellationToken cancellationToken)
    {
        var primaryKeyRule = JsonSerializer.Deserialize<PrimaryKeyRuleConfig>(mapping.PrimaryKeyRuleJson);
        var fieldMappings = JsonSerializer.Deserialize<Dictionary<string, FieldMappingConfig>>(mapping.FieldMappingsJson);

        if (primaryKeyRule == null || fieldMappings == null)
            throw new InvalidOperationException("Invalid mapping configuration");

        // Read source columns
        var sourceColumns = JsonSerializer.Deserialize<string[]>(sourceTable.ColumnsJson) ?? Array.Empty<string>();
        
        // Determine output columns
        var outputColumns = new List<string> { primaryKeyRule.TargetField };
        outputColumns.AddRange(fieldMappings.Keys);

        int recordsProcessed = 0;

        // Stream read source file and stream write output file
        using var sourceReader = new StreamReader(sourceTable.FilePath);
        using var outputWriter = new StreamWriter(outputFilePath);
        using var csv = new CsvWriter(outputWriter, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true
        });

        // Write header
        foreach (var column in outputColumns)
        {
            csv.WriteField(column);
        }
        await csv.NextRecordAsync();

        // Skip source header
        await sourceReader.ReadLineAsync();

        // Process records in streaming fashion
        while (!sourceReader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await sourceReader.ReadLineAsync();
            if (string.IsNullOrWhiteSpace(line))
                continue;

            var values = ParseCsvLine(line);
            var sourceRecord = new Dictionary<string, string>();
            
            for (int i = 0; i < Math.Min(sourceColumns.Length, values.Length); i++)
            {
                sourceRecord[sourceColumns[i]] = values[i];
            }

            // Generate primary key
            var primaryKey = ApplyPrimaryKeyRule(sourceRecord, primaryKeyRule);
            csv.WriteField(primaryKey);

            // Apply field mappings
            foreach (var fieldName in fieldMappings.Keys)
            {
                var fieldConfig = fieldMappings[fieldName];
                var value = ApplyFieldMapping(sourceRecord, fieldConfig, lookupTables);
                csv.WriteField(value);
            }

            await csv.NextRecordAsync();
            recordsProcessed++;
            progressCallback(recordsProcessed, sourceTable.RecordCount);
        }

        return recordsProcessed;
    }

    /// <summary>
    /// Load all lookup tables referenced in the mapping
    /// </summary>
    private async Task<Dictionary<string, List<Dictionary<string, string>>>> LoadLookupTablesAsync(
        EntityMapping mapping,
        MigrationSession session,
        CancellationToken cancellationToken)
    {
        var lookupTables = new Dictionary<string, List<Dictionary<string, string>>>();
        
        var fieldMappings = JsonSerializer.Deserialize<Dictionary<string, FieldMappingConfig>>(mapping.FieldMappingsJson);
        if (fieldMappings == null)
            return lookupTables;

        // Find all lookup table references
        var lookupTableNames = new HashSet<string>();
        foreach (var fieldConfig in fieldMappings.Values)
        {
            if (fieldConfig.RuleType == "Lookup" && !string.IsNullOrEmpty(fieldConfig.LookupTable))
            {
                lookupTableNames.Add(fieldConfig.LookupTable);
            }
            else if (fieldConfig.RuleType == "MultipleLookups" && fieldConfig.LookupSteps != null)
            {
                foreach (var step in fieldConfig.LookupSteps)
                {
                    if (!string.IsNullOrEmpty(step.LookupTable))
                    {
                        lookupTableNames.Add(step.LookupTable);
                    }
                }
            }
        }

        // Load each lookup table
        foreach (var tableName in lookupTableNames)
        {
            var sourceTable = session.SourceTables.FirstOrDefault(t => t.TableName == tableName);
            if (sourceTable == null)
            {
                _logger.LogWarning("Lookup table {TableName} not found in session", tableName);
                continue;
            }

            var tableData = await LoadTableDataAsync(sourceTable, cancellationToken);
            lookupTables[tableName] = tableData;
            _logger.LogInformation("Loaded lookup table {TableName} with {RecordCount} records", 
                tableName, tableData.Count);
        }

        return lookupTables;
    }

    /// <summary>
    /// Load entire table data into memory for lookups
    /// </summary>
    private async Task<List<Dictionary<string, string>>> LoadTableDataAsync(
        SourceDataTable sourceTable,
        CancellationToken cancellationToken)
    {
        var data = new List<Dictionary<string, string>>();
        var columns = JsonSerializer.Deserialize<string[]>(sourceTable.ColumnsJson) ?? Array.Empty<string>();

        using var reader = new StreamReader(sourceTable.FilePath);
        
        // Skip header
        await reader.ReadLineAsync();

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync();
            if (string.IsNullOrWhiteSpace(line))
                continue;

            var values = ParseCsvLine(line);
            var record = new Dictionary<string, string>();
            
            for (int i = 0; i < Math.Min(columns.Length, values.Length); i++)
            {
                record[columns[i]] = values[i];
            }
            
            data.Add(record);
        }

        return data;
    }

    /// <summary>
    /// Apply primary key rule to generate PK value
    /// </summary>
    private string ApplyPrimaryKeyRule(Dictionary<string, string> sourceRecord, PrimaryKeyRuleConfig rule)
    {
        return rule.RuleType switch
        {
            "Static" => rule.Value ?? "",
            "SourceField" => sourceRecord.GetValueOrDefault(rule.SourceField ?? "", ""),
            "Concatenation" => EvaluateExpression(rule.Expression ?? "", sourceRecord),
            "Sequence" => $"{rule.Prefix}{rule.StartValue + sourceRecord.GetHashCode()}", // Simplified
            _ => ""
        };
    }

    /// <summary>
    /// Apply field mapping rule to generate field value
    /// </summary>
    private string ApplyFieldMapping(
        Dictionary<string, string> sourceRecord,
        FieldMappingConfig config,
        Dictionary<string, List<Dictionary<string, string>>> lookupTables)
    {
        return config.RuleType switch
        {
            "Static" => config.Value ?? "",
            "SourceField" => sourceRecord.GetValueOrDefault(config.SourceField ?? "", ""),
            "Concatenation" => EvaluateExpression(config.Expression ?? "", sourceRecord),
            "Lookup" => ApplyLookupRule(sourceRecord, config, lookupTables),
            "MultipleLookups" => ApplyMultipleLookupsRule(sourceRecord, config, lookupTables),
            "Coalesce" => ApplyCoalesceRule(sourceRecord, config),
            _ => config.DefaultValue ?? ""
        };
    }

    /// <summary>
    /// Apply single lookup rule
    /// </summary>
    private string ApplyLookupRule(
        Dictionary<string, string> sourceRecord,
        FieldMappingConfig config,
        Dictionary<string, List<Dictionary<string, string>>> lookupTables)
    {
        if (string.IsNullOrEmpty(config.LookupTable) || !lookupTables.ContainsKey(config.LookupTable))
            return config.DefaultValue ?? "";

        var lookupData = lookupTables[config.LookupTable];
        var matchValue = sourceRecord.GetValueOrDefault(config.LocalField ?? "", "");

        if (string.IsNullOrEmpty(matchValue))
            return config.DefaultValue ?? "";

        var matchedRecord = lookupData.FirstOrDefault(r => 
            r.GetValueOrDefault(config.SourceField ?? "", "") == matchValue);

        if (matchedRecord != null)
        {
            return matchedRecord.GetValueOrDefault(config.ReturnField ?? "", config.DefaultValue ?? "");
        }

        return config.DefaultValue ?? "";
    }

    /// <summary>
    /// Apply chained multiple lookups rule
    /// </summary>
    private string ApplyMultipleLookupsRule(
        Dictionary<string, string> sourceRecord,
        FieldMappingConfig config,
        Dictionary<string, List<Dictionary<string, string>>> lookupTables)
    {
        if (config.LookupSteps == null || config.LookupSteps.Count == 0)
            return config.DefaultValue ?? "";

        string? currentValue = null;

        // Execute lookups sequentially
        for (int i = 0; i < config.LookupSteps.Count; i++)
        {
            var step = config.LookupSteps[i];
            
            if (string.IsNullOrEmpty(step.LookupTable) || !lookupTables.ContainsKey(step.LookupTable))
                return config.DefaultValue ?? "";

            var lookupData = lookupTables[step.LookupTable];
            
            // Get match value (from source record for first step, from previous result for subsequent steps)
            string? matchValue = i == 0 
                ? sourceRecord.GetValueOrDefault(step.LocalField ?? "", "")
                : currentValue;

            if (string.IsNullOrEmpty(matchValue))
                return config.DefaultValue ?? "";

            // Find matching record
            var matchedRecord = lookupData.FirstOrDefault(r => 
                r.GetValueOrDefault(step.SourceField ?? "", "") == matchValue);

            if (matchedRecord == null)
                return config.DefaultValue ?? "";

            // Get return value
            currentValue = matchedRecord.GetValueOrDefault(step.ReturnField ?? "", "");
        }

        return currentValue ?? config.DefaultValue ?? "";
    }

    /// <summary>
    /// Apply coalesce rule (return first non-empty value)
    /// </summary>
    private string ApplyCoalesceRule(Dictionary<string, string> sourceRecord, FieldMappingConfig config)
    {
        if (config.SourceFields == null)
            return config.DefaultValue ?? "";

        foreach (var field in config.SourceFields)
        {
            var value = sourceRecord.GetValueOrDefault(field, "");
            if (!string.IsNullOrWhiteSpace(value))
                return value;
        }

        return config.DefaultValue ?? "";
    }

    /// <summary>
    /// Evaluate concatenation expression like "{field1} + '_' + {field2}"
    /// </summary>
    private string EvaluateExpression(string expression, Dictionary<string, string> record)
    {
        var result = expression;
        
        // Replace {fieldName} with actual values
        foreach (var kvp in record)
        {
            result = result.Replace($"{{{kvp.Key}}}", kvp.Value);
        }
        
        // Remove quotes and evaluate concatenation
        result = result.Replace("'", "").Replace("\"", "");
        result = result.Replace(" + ", "");
        
        return result;
    }

    /// <summary>
    /// Parse CSV line handling quoted fields
    /// </summary>
    private string[] ParseCsvLine(string line)
    {
        var values = new List<string>();
        var currentValue = "";
        var inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            var c = line[i];

            if (c == '"')
            {
                inQuotes = !inQuotes;
            }
            else if (c == ',' && !inQuotes)
            {
                values.Add(currentValue);
                currentValue = "";
            }
            else
            {
                currentValue += c;
            }
        }
        
        values.Add(currentValue);
        return values.ToArray();
    }
}

// Configuration models
public class PrimaryKeyRuleConfig
{
    public string RuleType { get; set; } = "";
    public string TargetField { get; set; } = "";
    public string? SourceField { get; set; }
    public string? Expression { get; set; }
    public string? Value { get; set; }
    public string? Prefix { get; set; }
    public int StartValue { get; set; }
}

public class FieldMappingConfig
{
    public string RuleType { get; set; } = "";
    public string? SourceField { get; set; }
    public string? Expression { get; set; }
    public string? Value { get; set; }
    public string? DefaultValue { get; set; }
    public string? LookupTable { get; set; }
    public string? LocalField { get; set; }
    public string? ReturnField { get; set; }
    public List<string>? SourceFields { get; set; }
    public List<LookupStepConfig>? LookupSteps { get; set; }
}

public class LookupStepConfig
{
    public string? LookupTable { get; set; }
    public string? LocalField { get; set; }
    public string? SourceField { get; set; }
    public string? ReturnField { get; set; }
}

public class MigrationResult
{
    public bool Success { get; set; }
    public List<string> OutputFiles { get; set; } = new();
    public int TotalRecords { get; set; }
    public string? ErrorMessage { get; set; }
}
