using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Equipment Property Assignment - assigns properties to equipment for specific segments
/// Matches IndexedDB EquipmentPropertyAssignmentRecord
/// </summary>
public class EquipmentPropertyAssignment
{
    public string Id { get; set; } = string.Empty;
    public string EquipmentId { get; set; } = string.Empty;
    public string ProcessSegmentId { get; set; } = string.Empty;
    public string EquipmentPropertyId { get; set; } = string.Empty;
    public string SamplingMode { get; set; } = string.Empty;
    public int? SamplingIntervalSeconds { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public Equipment? Equipment { get; set; }
    public ProcessSegment? ProcessSegment { get; set; }
    public EquipmentProperty? EquipmentProperty { get; set; }
}
