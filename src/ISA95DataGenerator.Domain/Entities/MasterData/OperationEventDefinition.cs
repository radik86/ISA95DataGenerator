using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Operation Event Definition - defines types of operations events/alarms
/// Matches IndexedDB OperationEventDefinitionRecord
/// </summary>
public class OperationEventDefinition
{
    public string Id { get; set; } = string.Empty;
    public string EventCategory { get; set; } = string.Empty;
    public string EventCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool CausesDowntime { get; set; }
    public bool CausesScrap { get; set; }
    public string RootCauseType { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastDataMigrationAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public ICollection<OperationEventDefinitionPropertyAssignment> PropertyAssignments { get; set; } = new List<OperationEventDefinitionPropertyAssignment>();
    public ICollection<OperationEventDefSegmentAssignment> SegmentAssignments { get; set; } = new List<OperationEventDefSegmentAssignment>();
}
