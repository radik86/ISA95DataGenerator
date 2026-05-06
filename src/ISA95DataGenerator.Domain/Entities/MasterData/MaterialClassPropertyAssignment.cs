using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Material Class Property Assignment - links material class properties to material definition properties
/// </summary>
public class MaterialClassPropertyAssignment
{
    public string Id { get; set; } = string.Empty;
    public string MaterialClassPropertyId { get; set; } = string.Empty;
    public string MaterialDefinitionPropertyId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastDataMigrationAt { get; set; }
    public int Version { get; set; }

    public MaterialClassProperty? MaterialClassProperty { get; set; }
    public MaterialDefinitionProperty? MaterialDefinitionProperty { get; set; }
}
