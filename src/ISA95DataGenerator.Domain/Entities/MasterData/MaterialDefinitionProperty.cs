using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Material Definition Property - defines property types for materials
/// Matches IndexedDB MaterialDefinitionPropertyRecord
/// </summary>
public class MaterialDefinitionProperty
{
    public string Id { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ValueUnitOfMeasure { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public ICollection<MaterialDefinitionPropertyAssignment> Assignments { get; set; } = new List<MaterialDefinitionPropertyAssignment>();
}
