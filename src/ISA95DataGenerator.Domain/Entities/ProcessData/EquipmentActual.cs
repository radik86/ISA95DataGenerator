using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ISA95DataGenerator.Domain.Entities.ProcessData;

/// <summary>
/// ISA-95 Equipment Actual - Actual equipment usage
/// </summary>
public class EquipmentActual
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
    /// Equipment use: Actual, Required, Scheduled
    /// </summary>
    [MaxLength(50)]
    public string? EquipmentUse { get; set; }

    /// <summary>
    /// Reference to equipment
    /// </summary>
    [MaxLength(100)]
    public string? EquipmentId { get; set; }

    /// <summary>
    /// Reference to equipment class
    /// </summary>
    [MaxLength(100)]
    public string? EquipmentClassId { get; set; }

    /// <summary>
    /// Actual start time
    /// </summary>
    public DateTime? ActualStartTime { get; set; }

    /// <summary>
    /// Actual end time
    /// </summary>
    public DateTime? ActualEndTime { get; set; }

    /// <summary>
    /// Duration in minutes
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? DurationMinutes { get; set; }

    /// <summary>
    /// Equipment state during usage
    /// </summary>
    [MaxLength(50)]
    public string? EquipmentState { get; set; }

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

    // Navigation
    [ForeignKey("JobOrderId")]
    public virtual JobOrder? JobOrder { get; set; }

    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
