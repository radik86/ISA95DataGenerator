using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Material Class - categorizes materials (e.g., RawMaterial, FinishedProduct)
/// Matches IndexedDB MaterialClassRecord
/// </summary>
public class MaterialClass
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public ICollection<Material> Materials { get; set; } = new List<Material>();
}
