using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Material - represents a specific material/product
/// Matches IndexedDB MaterialRecord
/// </summary>
public class Material
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public string DefaultUoM { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public MaterialClass? MaterialClass { get; set; }
    public ICollection<MaterialLot> MaterialLots { get; set; } = new List<MaterialLot>();
}
