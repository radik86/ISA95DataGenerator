using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Plant - a manufacturing facility
/// Matches IndexedDB PlantRecord
/// </summary>
public class Plant
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastDataMigrationAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public ICollection<ProductionLine> ProductionLines { get; set; } = new List<ProductionLine>();
}
