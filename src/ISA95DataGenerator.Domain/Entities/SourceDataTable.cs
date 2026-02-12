namespace ISA95DataGenerator.Domain.Entities;

/// <summary>
/// Represents a source data table uploaded for migration
/// </summary>
public class SourceDataTable
{
    public Guid Id { get; set; }
    public Guid MigrationSessionId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty; // Path to uploaded CSV file
    public int RecordCount { get; set; }
    public string ColumnsJson { get; set; } = string.Empty; // JSON array of column names
    public DateTime UploadedAt { get; set; }
    
    // Navigation property
    public MigrationSession MigrationSession { get; set; } = null!;
}
