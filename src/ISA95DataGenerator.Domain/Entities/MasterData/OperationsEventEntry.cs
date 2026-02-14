using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Operations Event Entry - an entry within an operations event record
/// Matches IndexedDB OperationsEventEntryRecord
/// </summary>
public class OperationsEventEntry
{
    public string Id { get; set; } = string.Empty;
    public string OperationsEventEntryID { get; set; } = string.Empty;
    public string OperationsEventRecordID { get; set; } = string.Empty;
    public string EntryType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation property
    public OperationsEventRecord? OperationsEventRecord { get; set; }
}
