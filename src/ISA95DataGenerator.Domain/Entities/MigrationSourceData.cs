namespace ISA95DataGenerator.Domain.Entities;

/// <summary>
/// Stores source data records (from frontend IndexedDB stores) in SQL Server
/// for backend-driven migration processing. Each row holds all records for one store.
/// </summary>
public class MigrationSourceData
{
    public Guid Id { get; set; }
    public Guid MigrationSessionId { get; set; }
    
    /// <summary>
    /// The logical store/table name (e.g. "material_classes", "equipment", "segment_responses")
    /// </summary>
    public string StoreName { get; set; } = string.Empty;
    
    /// <summary>
    /// JSON-serialized array of all records for this store
    /// </summary>
    public string DataJson { get; set; } = "[]";
    
    /// <summary>
    /// Number of records in DataJson
    /// </summary>
    public int RecordCount { get; set; }
    
    public DateTime UploadedAt { get; set; }
    
    // Navigation property
    public MigrationSession MigrationSession { get; set; } = null!;
}
