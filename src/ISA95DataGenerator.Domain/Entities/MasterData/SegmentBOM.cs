using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Segment BOM - Bill of Materials for a process segment
/// Matches IndexedDB SegmentBOMRecord
/// </summary>
public class SegmentBOM
{
    public string Id { get; set; } = string.Empty;
    public string ProcessSegmentId { get; set; } = string.Empty;
    public string MaterialId { get; set; } = string.Empty;
    public decimal QtyPerUnit { get; set; }
    public string Uom { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public ProcessSegment? ProcessSegment { get; set; }
}
