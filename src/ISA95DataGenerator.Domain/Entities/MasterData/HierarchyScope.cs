using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Hierarchy Scope - defines equipment hierarchy levels
/// Matches IndexedDB HierarchyScopeRecord
/// </summary>
public class HierarchyScope
{
    public string Id { get; set; } = string.Empty;
    public string EquipmentID { get; set; } = string.Empty;
    public string EquipmentLevel { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }
}
