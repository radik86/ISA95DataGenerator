using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Employee - personnel resource linked to a person class and capability.
/// </summary>
public class Employee
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string PersonClassId { get; set; } = string.Empty;
    public string PersonnelCapabilityId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public PersonClass? PersonClass { get; set; }
    public PersonnelCapability? PersonnelCapability { get; set; }
}
