namespace ISA95DataGenerator.Domain.Entities;

/// <summary>
/// Represents a field/property of an entity
/// </summary>
public class AttributeDefinition
{
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Schema { get; set; } = string.Empty; // The data type (string, integer, double, dateTime, etc.)
    public bool IsRequired { get; set; }
    public string? MinValue { get; set; }
    public string? MaxValue { get; set; }
    public int? MinLength { get; set; }
    public int? MaxLength { get; set; }
    public string? Pattern { get; set; }
    public List<string>? EnumValues { get; set; }
    public bool CanBePrimaryKey { get; set; } = true; // Whether this field can be used as PK
    public bool IsPrimaryKey { get; set; } = false; // Whether this field is defined as PK in JSON
}
