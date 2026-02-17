using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ISA95DataGenerator.Domain.Entities.ProcessData;

/// <summary>
/// ISA-95 Segment Response - Actual execution data for a process segment
/// </summary>
public class SegmentResponse
{
    [Key]
    [MaxLength(100)]
    public string Id { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// Reference to the process segment definition
    /// </summary>
    [MaxLength(100)]
    public string? ProcessSegmentId { get; set; }

    /// <summary>
    /// Reference to the hierarchy scope
    /// </summary>
    [MaxLength(100)]
    public string? HierarchyScope { get; set; }

    /// <summary>
    /// Actual start time of the segment
    /// </summary>
    public DateTime? ActualStartTime { get; set; }

    /// <summary>
    /// Actual end time of the segment
    /// </summary>
    public DateTime? ActualEndTime { get; set; }

    /// <summary>
    /// Segment state: Running, Completed, Aborted
    /// </summary>
    [MaxLength(50)]
    public string? SegmentState { get; set; }

    /// <summary>
    /// Duration in minutes
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? DurationMinutes { get; set; }

    /// <summary>
    /// Reference to the parent job response
    /// </summary>
    [MaxLength(100)]
    public string? JobResponseId { get; set; }

    /// <summary>
    /// Equipment used for this segment
    /// </summary>
    [MaxLength(100)]
    public string? EquipmentId { get; set; }

    /// <summary>
    /// Sequence number within the job
    /// </summary>
    public int? SequenceNumber { get; set; }

    // Navigation
    [ForeignKey("JobResponseId")]
    public virtual JobResponse? JobResponse { get; set; }

    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
