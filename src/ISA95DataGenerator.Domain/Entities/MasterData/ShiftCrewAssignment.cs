using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Shift Crew Assignment - assigns crews to shifts
/// Matches IndexedDB ShiftCrewAssignmentRecord
/// </summary>
public class ShiftCrewAssignment
{
    public string Id { get; set; } = string.Empty;
    public string ShiftId { get; set; } = string.Empty;
    public string CrewId { get; set; } = string.Empty;
    public string EffectiveDate { get; set; } = string.Empty;
    public string ExpiryDate { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public Shift? Shift { get; set; }
    public Crew? Crew { get; set; }
}
