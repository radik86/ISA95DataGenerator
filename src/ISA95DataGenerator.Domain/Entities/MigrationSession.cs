namespace ISA95DataGenerator.Domain.Entities;

/// <summary>
/// Represents a data migration session
/// </summary>
public class MigrationSession
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = "Created"; // Created, Uploading, Configuring, Processing, Completed, Failed
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int TotalRecords { get; set; }
    public int ProcessedRecords { get; set; }
    public int ProgressPercentage { get; set; }
    public string? ErrorMessage { get; set; }
    public string? ResultFilesPaths { get; set; } // JSON array of output file paths
    
    // Navigation properties
    public ICollection<SourceDataTable> SourceTables { get; set; } = new List<SourceDataTable>();
    public ICollection<EntityMapping> EntityMappings { get; set; } = new List<EntityMapping>();
}
