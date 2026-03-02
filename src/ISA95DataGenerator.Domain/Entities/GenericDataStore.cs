using System.ComponentModel.DataAnnotations;

namespace ISA95DataGenerator.Domain.Entities;

/// <summary>
/// Generic key-value data store that replaces browser IndexedDB.
/// Each row holds one record (as JSON) in a named store.
/// </summary>
public class GenericDataStore
{
    public long Id { get; set; } // auto-increment PK

    /// <summary>
    /// Logical store name, e.g. "operationsRequests", "segmentRequirements", "configs", "currentConfig"
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string StoreName { get; set; } = string.Empty;

    /// <summary>
    /// The record's application-level ID (the "id" field from the JSON object).
    /// </summary>
    [Required]
    [MaxLength(400)]
    public string RecordId { get; set; } = string.Empty;

    /// <summary>
    /// Full JSON payload of the record.
    /// </summary>
    [Required]
    public string DataJson { get; set; } = "{}";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
