using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Shift - a work shift
/// Matches IndexedDB ShiftRecord
/// </summary>
public class Shift
{
    public string Id { get; set; } = string.Empty;
    public int ShiftNumber { get; set; }
    public string ShiftName { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastDataMigrationAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public ICollection<ShiftCrewAssignment> ShiftCrewAssignments { get; set; } = new List<ShiftCrewAssignment>();
}
