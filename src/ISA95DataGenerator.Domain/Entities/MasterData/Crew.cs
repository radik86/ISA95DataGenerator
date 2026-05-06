using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Crew - a work crew
/// Matches IndexedDB CrewRecord
/// </summary>
public class Crew
{
    public string Id { get; set; } = string.Empty;
    public string CrewName { get; set; } = string.Empty;
    public int PeopleCount { get; set; }
    public string Skills { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastDataMigrationAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public ICollection<ShiftCrewAssignment> ShiftCrewAssignments { get; set; } = new List<ShiftCrewAssignment>();
}
