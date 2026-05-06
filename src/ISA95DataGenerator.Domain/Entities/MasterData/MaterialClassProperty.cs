using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Material Class Property - defines properties applicable to material classes
/// </summary>
public class MaterialClassProperty
{
    public string Id { get; set; } = string.Empty;
    public string PropertyName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ValueDataType { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public string MinValue { get; set; } = string.Empty;
    public string MaxValue { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastDataMigrationAt { get; set; }
    public int Version { get; set; }

    public ICollection<MaterialClassPropertyAssignment> Assignments { get; set; } = new List<MaterialClassPropertyAssignment>();
}
