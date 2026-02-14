using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Line Equipment - equipment assigned to a production line
/// Matches IndexedDB LineEquipmentRecord
/// </summary>
public class LineEquipment
{
    public string Id { get; set; } = string.Empty;
    public string ProductionLineId { get; set; } = string.Empty;
    public string EquipmentId { get; set; } = string.Empty;
    public int Sequence { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? PlantId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation property
    public ProductionLine? ProductionLine { get; set; }
}
