namespace ISA95DataGenerator.Domain.Models;

/// <summary>
/// Represents a mapping entry between source and target entities
/// </summary>
public class MappingEntry
{
    public string SourceType { get; set; } = string.Empty;
    public string SourcePrimaryKey { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public string TargetPrimaryKey { get; set; } = string.Empty;
    public string RelationshipType { get; set; } = string.Empty;
}

/// <summary>
/// Container for all mapping entries
/// </summary>
public class MappingFile
{
    public List<MappingEntry> Mappings { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public string GeneratorVersion { get; set; } = "1.0.0";
}
