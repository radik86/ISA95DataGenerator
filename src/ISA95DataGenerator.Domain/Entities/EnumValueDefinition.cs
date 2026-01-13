namespace ISA95DataGenerator.Domain.Entities;

/// <summary>
/// Represents an enumeration value with detailed metadata
/// </summary>
public class EnumValueDefinition
{
    public string Name { get; set; } = string.Empty;
    public string EnumValue { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
    public string? Comment { get; set; }
}
