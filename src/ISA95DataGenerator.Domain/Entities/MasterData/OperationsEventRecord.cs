using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Operations Event Record - an instance of an operations event
/// Matches IndexedDB OperationsEventRecordRecord
/// </summary>
public class OperationsEventRecord
{
    public string Id { get; set; } = string.Empty;
    public string OperationsEventRecordID { get; set; } = string.Empty;
    public string OperationsEventDefinitionID { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Comments { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastDataMigrationAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public ICollection<OperationsEventEntry> Entries { get; set; } = new List<OperationsEventEntry>();
}
