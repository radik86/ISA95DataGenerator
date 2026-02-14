using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Operation Event Definition Segment Assignment - assigns event definitions to segments
/// </summary>
public class OperationEventDefSegmentAssignment
{
    public string Id { get; set; } = string.Empty;
    public string OperationsEventDefinitionId { get; set; } = string.Empty;
    public string ProcessSegmentId { get; set; } = string.Empty;
    public string StartOrEndEvent { get; set; } = string.Empty;
    public bool IsMandatory { get; set; }
    public bool IsPrimarySegment { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public OperationEventDefinition? OperationEventDefinition { get; set; }
    public ProcessSegment? ProcessSegment { get; set; }
}
