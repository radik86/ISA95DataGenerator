using ISA95DataGenerator.Infrastructure.Data;
using ISA95DataGenerator.Domain.Entities;
using ISA95DataGenerator.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ISA95DataGenerator.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DataMigrationController : ControllerBase
{
    private readonly MigrationDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DataMigrationController> _logger;
    private readonly MigrationProcessorService _processorService;

    public DataMigrationController(
        MigrationDbContext dbContext,
        IConfiguration configuration,
        ILogger<DataMigrationController> logger,
        MigrationProcessorService processorService)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
        _processorService = processorService;
    }

    /// <summary>
    /// Create a new migration session
    /// </summary>
    [HttpPost("session")]
    public async Task<ActionResult<MigrationSession>> CreateSession([FromBody] CreateSessionRequest request)
    {
        var session = new MigrationSession
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Status = "Created",
            CreatedAt = DateTime.UtcNow,
            ProgressPercentage = 0
        };

        _dbContext.MigrationSessions.Add(session);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Created migration session {SessionId} - {SessionName}", session.Id, session.Name);
        return Ok(session);
    }

    /// <summary>
    /// Get migration session by ID
    /// </summary>
    [HttpGet("session/{id}")]
    public async Task<ActionResult<MigrationSession>> GetSession(Guid id)
    {
        var session = await _dbContext.MigrationSessions
            .Include(s => s.SourceTables)
            .Include(s => s.EntityMappings)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (session == null)
            return NotFound();

        return Ok(session);
    }

    /// <summary>
    /// List all migration sessions
    /// </summary>
    [HttpGet("sessions")]
    public async Task<ActionResult<List<MigrationSession>>> ListSessions()
    {
        var sessions = await _dbContext.MigrationSessions
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return Ok(sessions);
    }

    /// <summary>
    /// Delete a migration session
    /// </summary>
    [HttpDelete("session/{id}")]
    public async Task<ActionResult> DeleteSession(Guid id)
    {
        var session = await _dbContext.MigrationSessions.FindAsync(id);
        if (session == null)
            return NotFound();

        // Delete uploaded files
        var sourceTables = await _dbContext.SourceDataTables
            .Where(t => t.MigrationSessionId == id)
            .ToListAsync();

        foreach (var table in sourceTables)
        {
            if (System.IO.File.Exists(table.FilePath))
            {
                System.IO.File.Delete(table.FilePath);
            }
        }

        // Delete output files if exists
        if (!string.IsNullOrEmpty(session.ResultFilesPaths))
        {
            var outputFiles = JsonSerializer.Deserialize<string[]>(session.ResultFilesPaths);
            if (outputFiles != null)
            {
                foreach (var file in outputFiles)
                {
                    if (System.IO.File.Exists(file))
                    {
                        System.IO.File.Delete(file);
                    }
                }
            }
        }

        _dbContext.MigrationSessions.Remove(session);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Deleted migration session {SessionId}", id);
        return NoContent();
    }

    /// <summary>
    /// Upload source data CSV file
    /// </summary>
    [HttpPost("session/{sessionId}/upload")]
    public async Task<ActionResult<SourceDataTable>> UploadSourceData(Guid sessionId, [FromForm] IFormFile file, [FromForm] string tableName)
    {
        var session = await _dbContext.MigrationSessions.FindAsync(sessionId);
        if (session == null)
            return NotFound("Session not found");

        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        // Save file to disk
        var uploadPath = _configuration.GetValue<string>("MigrationSettings:UploadPath") ?? "Data/Uploads";
        var fileName = $"{sessionId}_{tableName}_{Guid.NewGuid()}.csv";
        var filePath = Path.Combine(uploadPath, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Read column headers
        string[] columns;
        int recordCount = 0;
        using (var reader = new StreamReader(filePath))
        {
            var headerLine = await reader.ReadLineAsync();
            columns = headerLine?.Split(',') ?? Array.Empty<string>();
            
            // Count records
            while (await reader.ReadLineAsync() != null)
            {
                recordCount++;
            }
        }

        var sourceTable = new SourceDataTable
        {
            Id = Guid.NewGuid(),
            MigrationSessionId = sessionId,
            TableName = tableName,
            FilePath = filePath,
            RecordCount = recordCount,
            ColumnsJson = JsonSerializer.Serialize(columns),
            UploadedAt = DateTime.UtcNow
        };

        _dbContext.SourceDataTables.Add(sourceTable);
        
        session.Status = "Uploading";
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Uploaded source table {TableName} for session {SessionId} - {RecordCount} records", 
            tableName, sessionId, recordCount);

        return Ok(sourceTable);
    }

    /// <summary>
    /// Get source data tables for a session
    /// </summary>
    [HttpGet("session/{sessionId}/tables")]
    public async Task<ActionResult<List<SourceDataTable>>> GetSourceTables(Guid sessionId)
    {
        var tables = await _dbContext.SourceDataTables
            .Where(t => t.MigrationSessionId == sessionId)
            .ToListAsync();

        return Ok(tables);
    }

    /// <summary>
    /// Get preview data from source table
    /// </summary>
    [HttpGet("session/{sessionId}/table/{tableName}/preview")]
    public async Task<ActionResult<TablePreviewResponse>> GetTablePreview(Guid sessionId, string tableName, [FromQuery] int rows = 10)
    {
        var sourceTable = await _dbContext.SourceDataTables
            .FirstOrDefaultAsync(t => t.MigrationSessionId == sessionId && t.TableName == tableName);

        if (sourceTable == null)
            return NotFound();

        var columns = JsonSerializer.Deserialize<string[]>(sourceTable.ColumnsJson) ?? Array.Empty<string>();
        var previewData = new List<Dictionary<string, string>>();

        using (var reader = new StreamReader(sourceTable.FilePath))
        {
            // Skip header
            await reader.ReadLineAsync();
            
            int count = 0;
            while (count < rows && !reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                if (line != null)
                {
                    var values = line.Split(',');
                    var row = new Dictionary<string, string>();
                    for (int i = 0; i < Math.Min(columns.Length, values.Length); i++)
                    {
                        row[columns[i]] = values[i];
                    }
                    previewData.Add(row);
                    count++;
                }
            }
        }

        return Ok(new TablePreviewResponse
        {
            Columns = columns,
            Data = previewData,
            TotalRecords = sourceTable.RecordCount
        });
    }

    /// <summary>
    /// Save entity mapping configuration
    /// </summary>
    [HttpPost("session/{sessionId}/mapping")]
    public async Task<ActionResult<EntityMapping>> SaveEntityMapping(Guid sessionId, [FromBody] SaveMappingRequest request)
    {
        var session = await _dbContext.MigrationSessions.FindAsync(sessionId);
        if (session == null)
            return NotFound("Session not found");

        // Check if mapping already exists
        var existingMapping = await _dbContext.EntityMappings
            .FirstOrDefaultAsync(m => m.MigrationSessionId == sessionId && m.EntityName == request.EntityName);

        EntityMapping mapping;
        if (existingMapping != null)
        {
            existingMapping.SourceTable = request.SourceTable;
            existingMapping.PrimaryKeyRuleJson = request.PrimaryKeyRuleJson;
            existingMapping.FieldMappingsJson = request.FieldMappingsJson;
            existingMapping.UpdatedAt = DateTime.UtcNow;
            mapping = existingMapping;
        }
        else
        {
            mapping = new EntityMapping
            {
                Id = Guid.NewGuid(),
                MigrationSessionId = sessionId,
                EntityName = request.EntityName,
                SourceTable = request.SourceTable,
                PrimaryKeyRuleJson = request.PrimaryKeyRuleJson,
                FieldMappingsJson = request.FieldMappingsJson,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.EntityMappings.Add(mapping);
        }

        session.Status = "Configuring";
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Saved entity mapping for {EntityName} in session {SessionId}", 
            request.EntityName, sessionId);

        return Ok(mapping);
    }

    /// <summary>
    /// Get entity mappings for a session
    /// </summary>
    [HttpGet("session/{sessionId}/mappings")]
    public async Task<ActionResult<List<EntityMapping>>> GetEntityMappings(Guid sessionId)
    {
        var mappings = await _dbContext.EntityMappings
            .Where(m => m.MigrationSessionId == sessionId)
            .ToListAsync();

        return Ok(mappings);
    }

    /// <summary>
    /// Execute migration (starts background processing)
    /// </summary>
    [HttpPost("session/{sessionId}/execute")]
    public async Task<ActionResult> ExecuteMigration(Guid sessionId)
    {
        var session = await _dbContext.MigrationSessions.FindAsync(sessionId);
        if (session == null)
            return NotFound("Session not found");

        if (session.Status == "Processing")
            return BadRequest("Migration is already in progress");

        // Start migration in background
        _ = Task.Run(async () =>
        {
            try
            {
                await _processorService.ExecuteMigrationAsync(sessionId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background migration execution failed for session {SessionId}", sessionId);
            }
        });

        _logger.LogInformation("Started migration execution for session {SessionId}", sessionId);
        return Accepted(new { message = "Migration started", sessionId });
    }

    /// <summary>
    /// Download migration result file
    /// </summary>
    [HttpGet("session/{sessionId}/download/{fileName}")]
    public async Task<IActionResult> DownloadFile(Guid sessionId, string fileName)
    {
        var session = await _dbContext.MigrationSessions.FindAsync(sessionId);
        if (session == null)
            return NotFound("Session not found");

        if (string.IsNullOrEmpty(session.ResultFilesPaths))
            return NotFound("No result files available");

        var outputFiles = JsonSerializer.Deserialize<string[]>(session.ResultFilesPaths);
        var filePath = outputFiles?.FirstOrDefault(f => Path.GetFileName(f) == fileName);

        if (string.IsNullOrEmpty(filePath) || !System.IO.File.Exists(filePath))
            return NotFound("File not found");

        var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(fileBytes, "text/csv", fileName);
    }
}

// Request/Response models
public class CreateSessionRequest
{
    public string Name { get; set; } = string.Empty;
}

public class SaveMappingRequest
{
    public string EntityName { get; set; } = string.Empty;
    public string SourceTable { get; set; } = string.Empty;
    public string PrimaryKeyRuleJson { get; set; } = string.Empty;
    public string FieldMappingsJson { get; set; } = string.Empty;
}

public class TablePreviewResponse
{
    public string[] Columns { get; set; } = Array.Empty<string>();
    public List<Dictionary<string, string>> Data { get; set; } = new();
    public int TotalRecords { get; set; }
}
