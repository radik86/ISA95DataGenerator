using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Operations Event Class - categorizes operations events
/// Matches IndexedDB OperationsEventClassRecord
/// </summary>
public class OperationsEventClass
{
    public string OperationsEventClassID { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }
}
