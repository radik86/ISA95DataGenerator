using System.Text.Json;
using System.Text.Json.Serialization;

namespace ISA95DataGenerator.Domain.Models;

/// <summary>
/// Request to upload source data for a specific store
/// </summary>
public class UploadStoreDataRequest
{
    public string StoreName { get; set; } = string.Empty;
    
    /// <summary>
    /// Raw JSON array of records
    /// </summary>
    public JsonElement Records { get; set; }
}

/// <summary>
/// Request to execute migration with full mapping configuration
/// </summary>
public class ExecuteMigrationRequest
{
    public List<TableMappingDto> Mappings { get; set; } = new();
    public int? MaxFileSizeMb { get; set; }
    public bool SeparateMasterProcessFiles { get; set; }
}

/// <summary>
/// Mirrors frontend TableMapping interface
/// </summary>
public class TableMappingDto
{
    public string SourceTable { get; set; } = string.Empty;
    public string TargetEntity { get; set; } = string.Empty;
    public List<FieldMappingDto> FieldMappings { get; set; } = new();
    public bool Enabled { get; set; }
    public FieldRuleDto? PrimaryKeyRule { get; set; }
    
    // Bridge table config
    public bool IsBridge { get; set; }
    public string? BridgeEntity1 { get; set; }
    public string? BridgeEntity2 { get; set; }
    public string? RelationshipType { get; set; }
    public List<BridgeJoinFieldDto>? BridgeEntity1JoinFields { get; set; }
    public List<BridgeJoinFieldDto>? BridgeEntity2JoinFields { get; set; }
    
    // Filters
    public List<FilterDto>? Filters { get; set; }
}

/// <summary>
/// Mirrors frontend FieldMapping interface
/// </summary>
public class FieldMappingDto
{
    public string FieldName { get; set; } = string.Empty;
    public string? SourceColumn { get; set; }
    public bool Generate { get; set; }
    public string? Transformation { get; set; }
    public FieldRuleDto? FieldRule { get; set; }
}

/// <summary>
/// Mirrors frontend FieldRuleConfig interface
/// </summary>
public class FieldRuleDto
{
    public string RuleType { get; set; } = string.Empty;
    
    /// <summary>
    /// Dynamic parameters bag — contents depend on RuleType
    /// </summary>
    public JsonElement? Parameters { get; set; }
}

/// <summary>
/// Mirrors frontend bridge join field configuration
/// </summary>
public class BridgeJoinFieldDto
{
    public string BridgeField { get; set; } = string.Empty;
    public string EntityField { get; set; } = string.Empty;
    public string? BridgePrefix { get; set; }
    public string? BridgeSuffix { get; set; }
    public string? EntityPrefix { get; set; }
    public string? EntitySuffix { get; set; }
}

/// <summary>
/// Mirrors frontend filter configuration
/// </summary>
public class FilterDto
{
    [JsonPropertyName("column")]
    public string Field { get; set; } = string.Empty;
    
    [JsonPropertyName("operator")]
    public string Operator { get; set; } = string.Empty;
    
    public string Value { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
}

/// <summary>
/// Response for migration execution status
/// </summary>
public class MigrationStatusResponse
{
    public Guid SessionId { get; set; }
    public string Status { get; set; } = string.Empty;
    public int ProgressPercentage { get; set; }
    public int ProcessedRecords { get; set; }
    public int TotalRecords { get; set; }
    public string? ErrorMessage { get; set; }
    public List<string> OutputFiles { get; set; } = new();
    public List<string> Log { get; set; } = new();
}
