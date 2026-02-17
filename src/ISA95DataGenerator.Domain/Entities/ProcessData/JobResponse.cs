using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ISA95DataGenerator.Domain.Entities.ProcessData;

/// <summary>
/// ISA-95 Job Response - The actual results/response for a job order
/// </summary>
public class JobResponse
{
    [Key]
    [MaxLength(100)]
    public string Id { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// Category of work: Production, Maintenance, Quality, Inventory, Mixed
    /// </summary>
    [MaxLength(50)]
    public string? WorkType { get; set; }

    /// <summary>
    /// Reference to the hierarchy scope
    /// </summary>
    [MaxLength(100)]
    public string? HierarchyScope { get; set; }

    /// <summary>
    /// Actual start time
    /// </summary>
    public DateTime? ActualStartTime { get; set; }

    /// <summary>
    /// Actual end time
    /// </summary>
    public DateTime? ActualEndTime { get; set; }

    /// <summary>
    /// Job state: Running, Completed, Aborted, Held, Suspended
    /// </summary>
    [MaxLength(50)]
    public string? JobState { get; set; }

    /// <summary>
    /// Reference to the job order this responds to
    /// </summary>
    [MaxLength(100)]
    public string? JobOrderId { get; set; }

    /// <summary>
    /// Material produced (product ID)
    /// </summary>
    [MaxLength(100)]
    public string? MaterialId { get; set; }

    /// <summary>
    /// Material lot produced
    /// </summary>
    [MaxLength(100)]
    public string? MaterialLotId { get; set; }

    /// <summary>
    /// Actual quantity produced
    /// </summary>
    [Column(TypeName = "decimal(18,4)")]
    public decimal? ActualQuantity { get; set; }

    /// <summary>
    /// Unit of measure
    /// </summary>
    [MaxLength(20)]
    public string? QuantityUOM { get; set; }

    /// <summary>
    /// Equipment used
    /// </summary>
    [MaxLength(100)]
    public string? EquipmentId { get; set; }

    /// <summary>
    /// Shift when job was executed
    /// </summary>
    [MaxLength(100)]
    public string? ShiftId { get; set; }

    /// <summary>
    /// Crew that performed the job
    /// </summary>
    [MaxLength(100)]
    public string? CrewId { get; set; }

    // Navigation
    [ForeignKey("JobOrderId")]
    public virtual JobOrder? JobOrder { get; set; }

    public virtual ICollection<SegmentResponse> SegmentResponses { get; set; } = new List<SegmentResponse>();

    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
