using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Material Definition Property Assignment - assigns properties to specific materials
/// Matches IndexedDB MaterialDefinitionPropertyAssignmentRecord
/// </summary>
public class MaterialDefinitionPropertyAssignment
{
    public string Pk { get; set; } = string.Empty;  // Primary key
    public string Id { get; set; } = string.Empty;  // Property Id (can be duplicated)
    public string MaterialDefinitionPropertyId { get; set; } = string.Empty;
    public string MaterialDefinitionId { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ValueUnitOfMeasure { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastDataMigrationAt { get; set; }
    public int Version { get; set; }

    // Navigation property
    public MaterialDefinitionProperty? MaterialDefinitionProperty { get; set; }
}
