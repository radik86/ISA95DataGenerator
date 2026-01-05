namespace ISA95DataGenerator.Domain.Entities;

/// <summary>
/// Represents a relationship between entities
/// </summary>
public class RelationshipDefinition
{
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string TargetEntityId { get; set; } = string.Empty;
    public string TargetEntityName { get; set; } = string.Empty;
    public RelationshipCardinality Cardinality { get; set; }
    public RelationshipDirection Direction { get; set; }
}

public enum RelationshipCardinality
{
    OneToOne,
    OneToMany,
    ManyToOne,
    ManyToMany
}

public enum RelationshipDirection
{
    Outgoing,
    Incoming,
    Bidirectional
}
