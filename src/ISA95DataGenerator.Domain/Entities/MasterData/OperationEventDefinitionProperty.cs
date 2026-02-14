using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Operation Event Definition Property - property types for event definitions
/// Matches IndexedDB OperationEventDefinitionPropertyRecord
/// </summary>
public class OperationEventDefinitionProperty
{
    public string Id { get; set; } = string.Empty;
    public string PossibleValues { get; set; } = string.Empty;
    public string ValueUnitOfMeasure { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public ICollection<OperationEventDefinitionPropertyAssignment> Assignments { get; set; } = new List<OperationEventDefinitionPropertyAssignment>();
}
