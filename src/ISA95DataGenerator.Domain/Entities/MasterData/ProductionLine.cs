using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Production Line - a production line within a plant
/// Matches IndexedDB ProductionLineRecord
/// </summary>
public class ProductionLine
{
    public string Id { get; set; } = string.Empty;
    public string PlantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public Plant? Plant { get; set; }
    public ICollection<LineEquipment> LineEquipments { get; set; } = new List<LineEquipment>();
}
