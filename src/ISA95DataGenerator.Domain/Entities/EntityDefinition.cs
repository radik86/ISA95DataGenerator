namespace ISA95DataGenerator.Domain.Entities;

/// <summary>
/// Represents an ISA-95 entity definition loaded from JSON metadata
/// </summary>
public class EntityDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Context { get; set; } = string.Empty;
    public List<AttributeDefinition> Attributes { get; set; } = new();
    public List<RelationshipDefinition> Relationships { get; set; } = new();
}
