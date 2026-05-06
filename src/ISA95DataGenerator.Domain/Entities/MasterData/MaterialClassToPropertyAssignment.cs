using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Links a material class to a material class property.
/// </summary>
public class MaterialClassToPropertyAssignment
{
    public string Id { get; set; } = string.Empty;
    public string MaterialClassId { get; set; } = string.Empty;
    public string MaterialClassPropertyId { get; set; } = string.Empty;
    public string? SourceTimeStamp { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastDataMigrationAt { get; set; }
    public int Version { get; set; }

    public MaterialClass? MaterialClass { get; set; }
    public MaterialClassProperty? MaterialClassProperty { get; set; }
}
