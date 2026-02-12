namespace ISA95DataGenerator.Domain.Entities;

/// <summary>
/// Represents a mapping configuration for an entity in a migration
/// </summary>
public class EntityMapping
{
    public Guid Id { get; set; }
    public Guid MigrationSessionId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string SourceTable { get; set; } = string.Empty;
    public string PrimaryKeyRuleJson { get; set; } = string.Empty; // Serialized PK rule
    public string FieldMappingsJson { get; set; } = string.Empty; // Serialized field mappings
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation property
    public MigrationSession MigrationSession { get; set; } = null!;
}
