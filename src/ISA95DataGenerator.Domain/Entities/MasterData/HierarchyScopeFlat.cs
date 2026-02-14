using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Hierarchy Scope Flat - flattened hierarchy view
/// Matches IndexedDB HierarchyScopeFlatRecord
/// </summary>
public class HierarchyScopeFlat
{
    public string Id { get; set; } = string.Empty;
    public string Enterprise { get; set; } = string.Empty;
    public string Site { get; set; } = string.Empty;
    public string Area { get; set; } = string.Empty;
    public string WorkCenter { get; set; } = string.Empty;
    public string WorkUnit { get; set; } = string.Empty;
    public string ProcessCell { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public string ProductionLine { get; set; } = string.Empty;
    public string ProductionUnit { get; set; } = string.Empty;
    public string WorkCell { get; set; } = string.Empty;
    public string StorageZone { get; set; } = string.Empty;
    public string StorageUnit { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }
}
