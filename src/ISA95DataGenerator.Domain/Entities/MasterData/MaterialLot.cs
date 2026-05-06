using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Material Lot - a batch/lot of a material
/// Matches IndexedDB MaterialLotRecord
/// </summary>
public class MaterialLot
{
    public string Id { get; set; } = string.Empty;
    public string MaterialId { get; set; } = string.Empty;
    public decimal LotQuantity { get; set; }
    public string LotUoM { get; set; } = string.Empty;
    public string? ReceivedDateTime { get; set; }
    public string? ProducedDateTime { get; set; }
    public string? SupplierOrProducerId { get; set; }
    public string? SupplierOrProducerName { get; set; }
    public string? ProducedByProcessSegmentId { get; set; }
    public string? ParentLotId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastDataMigrationAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public Material? Material { get; set; }
    public ICollection<MaterialSublot> MaterialSublots { get; set; } = new List<MaterialSublot>();
}
