using ISA95DataGenerator.Domain.Rules;

namespace ISA95DataGenerator.Domain.Models;

/// <summary>
/// Relationship cardinality definition for parent-child relationships in graph
/// </summary>
public class GraphRelationshipCardinality
{
    public string SourceEntity { get; set; } = string.Empty;
    public string TargetEntity { get; set; } = string.Empty;
    public string RelationshipName { get; set; } = string.Empty;
    public int Cardinality { get; set; } // Number of child records per parent
}

/// <summary>
/// Request model for data generation
/// </summary>
public class DataGenerationRequest
{
    public string RootEntityName { get; set; } = string.Empty;
    public List<string> IncludedRelatedEntities { get; set; } = new();
    public int InstanceCount { get; set; } = 10;
    public int? Seed { get; set; } // For deterministic generation
    public List<PrimaryKeyRule> PrimaryKeyRules { get; set; } = new();
    public List<FieldRule> FieldRules { get; set; } = new();
    public int MaxDepth { get; set; } = 5; // Prevent infinite recursion
    public List<string> ExcludedFields { get; set; } = new(); // Format: "EntityName.FieldName"
    public Dictionary<string, int>? EntityInstanceCounts { get; set; } // Per-entity instance counts
    public List<GraphRelationshipCardinality>? RelationshipCardinalities { get; set; } // Relationship cardinality rules
    /// <summary>Skip mapping file generation (saves significant time when the caller won't use it).</summary>
    public bool SkipMappingFile { get; set; } = false;
}

/// <summary>
/// Response model for data generation
/// </summary>
public class DataGenerationResponse
{
    public Dictionary<string, List<Dictionary<string, object>>> GeneratedData { get; set; } = new();
    public MappingFile MappingFile { get; set; } = new();
    public int TotalInstancesGenerated { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Request to mass-generate dummy data and persist it to GenericDataStores for performance testing.
/// </summary>
public class MassPersistRequest
{
    public List<MassPersistEntityConfig> Entities { get; set; } = new();
    public int? Seed { get; set; }
    public List<PrimaryKeyRule> PrimaryKeyRules { get; set; } = new();
    public List<FieldRule> FieldRules { get; set; } = new();
}

public class MassPersistEntityConfig
{
    public string EntityName { get; set; } = string.Empty;
    public int Count { get; set; } = 100;
    /// <summary>
    /// Override the target store name. If null, derived automatically from EntityName (camelCase plural).
    /// </summary>
    public string? StoreName { get; set; }
}

/// <summary>
/// Summary returned after mass persist completes.
/// </summary>
public class MassPersistResult
{
    public List<MassPersistEntityResult> Results { get; set; } = new();
    public int TotalRecords { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public long ElapsedMs { get; set; }
}

public class MassPersistEntityResult
{
    public string EntityName { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public int Generated { get; set; }
    public int Added { get; set; }
    public int Updated { get; set; }
    public string? Error { get; set; }
}
