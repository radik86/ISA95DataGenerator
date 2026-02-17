using System.ComponentModel.DataAnnotations;

namespace ISA95DataGenerator.Domain.Entities.ProcessData;

/// <summary>
/// ISA-95 Work Request - A request for work to be performed
/// </summary>
public class WorkRequest
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
    /// Scheduled start time
    /// </summary>
    public DateTime? StartTime { get; set; }

    /// <summary>
    /// Scheduled end time
    /// </summary>
    public DateTime? EndTime { get; set; }

    /// <summary>
    /// Priority of the work request
    /// </summary>
    [MaxLength(50)]
    public string? Priority { get; set; }

    /// <summary>
    /// State: Forecast, Released, Cancelled, Waiting, Ready, Running, Completed, Aborted, Held, Suspended, Closed
    /// </summary>
    [MaxLength(50)]
    public string? RequestState { get; set; }

    /// <summary>
    /// Reference to the work schedule
    /// </summary>
    [MaxLength(100)]
    public string? WorkScheduleId { get; set; }

    // Navigation
    public virtual ICollection<JobOrder> JobOrders { get; set; } = new List<JobOrder>();

    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
