using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Maintenance BOM line assigned directly to equipment.
/// </summary>
public class MaintenanceBOM
{
    public string Id { get; set; } = string.Empty;
    public string EquipmentId { get; set; } = string.Empty;
    public string ProcessSegmentId { get; set; } = string.Empty;
    public int ProcessSegmentSequence { get; set; }
    public string MaterialId { get; set; } = string.Empty;
    public decimal QtyPerUnit { get; set; }
    public decimal PersonQuantity { get; set; }
    public string PersonQuantityUoM { get; set; } = "Person";
    public string? EmployeeId { get; set; }
    public string? PersonClassId { get; set; }
    public string Uom { get; set; } = string.Empty;
    public string MaterialUse { get; set; } = "CONSUME";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastDataMigrationAt { get; set; }
    public int Version { get; set; }

    public ProcessSegment? ProcessSegment { get; set; }
}
