using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Material Sublot - a portion of a material lot
/// Matches IndexedDB MaterialSublotRecord
/// </summary>
public class MaterialSublot
{
    public string Id { get; set; } = string.Empty;
    public string MaterialLotId { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string QuantityUnitOfMeasure { get; set; } = string.Empty;
    public string? StorageLocation { get; set; }
    public string? Status { get; set; }
    public string? Disposition { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation property
    public MaterialLot? MaterialLot { get; set; }
}
