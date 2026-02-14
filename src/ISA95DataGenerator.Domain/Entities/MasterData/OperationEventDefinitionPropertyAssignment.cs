using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Operation Event Definition Property Assignment - assigns properties to event definitions
/// Matches IndexedDB OperationEventDefinitionPropertyAssignmentRecord
/// </summary>
public class OperationEventDefinitionPropertyAssignment
{
    public string Id { get; set; } = string.Empty;
    public string OperationsEventDefinitionId { get; set; } = string.Empty;
    public string OperationsEventDefinitionPropertyId { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string ValueUnitOfMeasure { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public OperationEventDefinition? OperationEventDefinition { get; set; }
    public OperationEventDefinitionProperty? OperationEventDefinitionProperty { get; set; }
}
