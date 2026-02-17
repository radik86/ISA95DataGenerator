using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ISA95DataGenerator.Domain.Entities.ProcessData;

/// <summary>
/// ISA-95 Job Order - A specific job/batch to be executed
/// </summary>
public class JobOrder
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
    /// Reference to the hierarchy scope (plant/line/equipment)
    /// </summary>
    [MaxLength(100)]
    public string? HierarchyScope { get; set; }

    /// <summary>
    /// Reference to work master (recipe/routing)
    /// </summary>
    [MaxLength(100)]
    public string? WorkMasterId { get; set; }

    [MaxLength(50)]
    public string? WorkMasterVersion { get; set; }

    /// <summary>
    /// Scheduled start time
    /// </summary>
    public DateTime? StartTime { get; set; }

    /// <summary>
    /// Scheduled end time
    /// </summary>
    public DateTime? EndTime { get; set; }

    /// <summary>
    /// Priority of the job order
    /// </summary>
    [MaxLength(50)]
    public string? Priority { get; set; }

    /// <summary>
    /// State of dispatch: Forecast, Released, Cancelled, Waiting, Ready, Running, Completed, Aborted, Held, Suspended, Closed
    /// </summary>
    [MaxLength(50)]
    public string? DispatchStatus { get; set; }

    /// <summary>
    /// Command: Store, StoreAndSend, Send
    /// </summary>
    [MaxLength(50)]
    public string? Command { get; set; }

    /// <summary>
    /// Reference to process segment
    /// </summary>
    [MaxLength(100)]
    public string? ProcessSegmentId { get; set; }

    /// <summary>
    /// Material being produced (product ID)
    /// </summary>
    [MaxLength(100)]
    public string? MaterialId { get; set; }

    /// <summary>
    /// Quantity to produce
    /// </summary>
    [Column(TypeName = "decimal(18,4)")]
    public decimal? PlannedQuantity { get; set; }

    /// <summary>
    /// Unit of measure
    /// </summary>
    [MaxLength(20)]
    public string? QuantityUOM { get; set; }

    /// <summary>
    /// Equipment assigned to this job
    /// </summary>
    [MaxLength(100)]
    public string? EquipmentId { get; set; }

    /// <summary>
    /// Reference to parent work request
    /// </summary>
    [MaxLength(100)]
    public string? WorkRequestId { get; set; }

    // Navigation
    [ForeignKey("WorkRequestId")]
    public virtual WorkRequest? WorkRequest { get; set; }

    public virtual ICollection<JobResponse> JobResponses { get; set; } = new List<JobResponse>();
    public virtual ICollection<MaterialActual> MaterialActuals { get; set; } = new List<MaterialActual>();
    public virtual ICollection<EquipmentActual> EquipmentActuals { get; set; } = new List<EquipmentActual>();

    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
