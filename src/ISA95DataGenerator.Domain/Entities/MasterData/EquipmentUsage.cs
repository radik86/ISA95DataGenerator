using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Equipment Usage - equipment used in a process segment
/// Matches IndexedDB EquipmentUsageRecord
/// </summary>
public class EquipmentUsage
{
    public string Id { get; set; } = string.Empty;
    public string ProcessSegmentId { get; set; } = string.Empty;
    public string EquipmentId { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public decimal CapacityPerRun { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation property
    public ProcessSegment? ProcessSegment { get; set; }
}
