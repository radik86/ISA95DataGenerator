using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Hierarchy Scope Parent-Child relationships
/// Matches IndexedDB HierarchyScopeParentChildRecord
/// </summary>
public class HierarchyScopeParentChild
{
    public string Id { get; set; } = string.Empty;
    public string ParentEquipmentLevel { get; set; } = string.Empty;
    public string ParentEquipmentID { get; set; } = string.Empty;
    public string ChildEquipmentLevel { get; set; } = string.Empty;
    public string ChildEquipmentID { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }
}
