using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ISA95DataGenerator.Domain.Entities.ProcessData;

/// <summary>
/// ISA-95 Material Actual - Actual material consumption or production
/// </summary>
public class MaterialActual
{
    [Key]
    [MaxLength(100)]
    public string Id { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// Reference to the hierarchy scope
    /// </summary>
    [MaxLength(100)]
    public string? HierarchyScope { get; set; }

    /// <summary>
    /// Material use: Consumable, MaterialConsumed, MaterialProduced, ByProductProduced, CoProductProduced
    /// </summary>
    [MaxLength(50)]
    public string MaterialUse { get; set; } = "MaterialConsumed";

    /// <summary>
    /// Reference to material definition
    /// </summary>
    [MaxLength(100)]
    public string? MaterialId { get; set; }

    /// <summary>
    /// Reference to material class
    /// </summary>
    [MaxLength(100)]
    public string? MaterialClassId { get; set; }

    /// <summary>
    /// Reference to material lot
    /// </summary>
    [MaxLength(100)]
    public string? MaterialLotId { get; set; }

    /// <summary>
    /// Reference to material sublot
    /// </summary>
    [MaxLength(100)]
    public string? MaterialSublotId { get; set; }

    /// <summary>
    /// Actual quantity
    /// </summary>
    [Column(TypeName = "decimal(18,4)")]
    public decimal? Quantity { get; set; }

    /// <summary>
    /// Unit of measure
    /// </summary>
    [MaxLength(20)]
    public string? QuantityUOM { get; set; }

    /// <summary>
    /// Storage location
    /// </summary>
    [MaxLength(200)]
    public string? StorageLocation { get; set; }

    /// <summary>
    /// Storage location type: OperationalLocation, Equipment, PhysicalAsset, Description
    /// </summary>
    [MaxLength(50)]
    public string? StorageLocationType { get; set; }

    /// <summary>
    /// Timestamp when material was consumed/produced
    /// </summary>
    public DateTime? Timestamp { get; set; }

    /// <summary>
    /// Reference to job order
    /// </summary>
    [MaxLength(100)]
    public string? JobOrderId { get; set; }

    /// <summary>
    /// Reference to segment response
    /// </summary>
    [MaxLength(100)]
    public string? SegmentResponseId { get; set; }

    /// <summary>
    /// Reference to process segment
    /// </summary>
    [MaxLength(100)]
    public string? ProcessSegmentId { get; set; }

    /// <summary>
    /// Equipment where material was used
    /// </summary>
    [MaxLength(100)]
    public string? EquipmentId { get; set; }

    // Navigation
    [ForeignKey("JobOrderId")]
    public virtual JobOrder? JobOrder { get; set; }

    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
