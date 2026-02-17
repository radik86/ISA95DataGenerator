using ISA95DataGenerator.Domain.Entities.ProcessData;
using ISA95DataGenerator.Infrastructure.Data;
using ISA95DataGenerator.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ISA95DataGenerator.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProcessDataController : ControllerBase
{
    private readonly MigrationDbContext _dbContext;
    private readonly ProcessDataGenerationService _generationService;
    private readonly ILogger<ProcessDataController> _logger;

    public ProcessDataController(
        MigrationDbContext dbContext,
        ProcessDataGenerationService generationService,
        ILogger<ProcessDataController> logger)
    {
        _dbContext = dbContext;
        _generationService = generationService;
        _logger = logger;
    }

    #region Summary & Generation

    /// <summary>
    /// Get summary of all process data
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<ProcessDataSummary>> GetSummary()
    {
        var summary = await _generationService.GetSummaryAsync();
        return Ok(summary);
    }

    /// <summary>
    /// Generate process data from master data
    /// </summary>
    [HttpPost("generate")]
    public async Task<ActionResult<ProcessDataGenerationResult>> Generate([FromBody] ProcessDataGenerationConfig? config = null)
    {
        try
        {
            config ??= new ProcessDataGenerationConfig();
            
            _logger.LogInformation(
                "Starting process data generation: {WorkRequests} work requests, completion: {Completion}%",
                config.WorkRequestCount, config.CompletionPercentage);

            var result = await _generationService.GenerateAsync(config);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating process data");
            return StatusCode(500, new { error = "Failed to generate process data", message = ex.Message });
        }
    }

    /// <summary>
    /// Clear all process data
    /// </summary>
    [HttpDelete("clear")]
    public async Task<ActionResult> ClearAll()
    {
        try
        {
            _dbContext.EquipmentActuals.RemoveRange(_dbContext.EquipmentActuals);
            _dbContext.MaterialActuals.RemoveRange(_dbContext.MaterialActuals);
            _dbContext.SegmentResponses.RemoveRange(_dbContext.SegmentResponses);
            _dbContext.JobResponses.RemoveRange(_dbContext.JobResponses);
            _dbContext.JobOrders.RemoveRange(_dbContext.JobOrders);
            _dbContext.WorkRequests.RemoveRange(_dbContext.WorkRequests);

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Cleared all process data");
            return Ok(new { message = "All process data cleared" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing process data");
            return StatusCode(500, new { error = "Failed to clear process data", message = ex.Message });
        }
    }

    #endregion

    #region Work Requests

    [HttpGet("work-requests")]
    public async Task<ActionResult<List<WorkRequest>>> GetWorkRequests(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 50,
        [FromQuery] string? status = null)
    {
        var query = _dbContext.WorkRequests.AsQueryable();
        
        if (!string.IsNullOrEmpty(status))
            query = query.Where(w => w.RequestState == status);

        var result = await query
            .OrderByDescending(w => w.StartTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("work-requests/{id}")]
    public async Task<ActionResult<WorkRequest>> GetWorkRequest(string id)
    {
        var entity = await _dbContext.WorkRequests
            .Include(w => w.JobOrders)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (entity == null)
            return NotFound();

        return Ok(entity);
    }

    #endregion

    #region Job Orders

    [HttpGet("job-orders")]
    public async Task<ActionResult<List<JobOrder>>> GetJobOrders(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? status = null,
        [FromQuery] string? materialId = null,
        [FromQuery] string? equipmentId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var query = _dbContext.JobOrders.AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(j => j.DispatchStatus == status);
        if (!string.IsNullOrEmpty(materialId))
            query = query.Where(j => j.MaterialId == materialId);
        if (!string.IsNullOrEmpty(equipmentId))
            query = query.Where(j => j.EquipmentId == equipmentId);
        if (fromDate.HasValue)
            query = query.Where(j => j.StartTime >= fromDate);
        if (toDate.HasValue)
            query = query.Where(j => j.StartTime <= toDate);

        var result = await query
            .OrderByDescending(j => j.StartTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("job-orders/{id}")]
    public async Task<ActionResult<JobOrder>> GetJobOrder(string id)
    {
        var entity = await _dbContext.JobOrders
            .Include(j => j.JobResponses)
            .Include(j => j.MaterialActuals)
            .Include(j => j.EquipmentActuals)
            .FirstOrDefaultAsync(j => j.Id == id);

        if (entity == null)
            return NotFound();

        return Ok(entity);
    }

    [HttpGet("job-orders/by-work-request/{workRequestId}")]
    public async Task<ActionResult<List<JobOrder>>> GetJobOrdersByWorkRequest(string workRequestId)
    {
        var result = await _dbContext.JobOrders
            .Where(j => j.WorkRequestId == workRequestId)
            .OrderBy(j => j.StartTime)
            .ToListAsync();

        return Ok(result);
    }

    #endregion

    #region Job Responses

    [HttpGet("job-responses")]
    public async Task<ActionResult<List<JobResponse>>> GetJobResponses(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? state = null)
    {
        var query = _dbContext.JobResponses.AsQueryable();

        if (!string.IsNullOrEmpty(state))
            query = query.Where(j => j.JobState == state);

        var result = await query
            .OrderByDescending(j => j.ActualStartTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("job-responses/{id}")]
    public async Task<ActionResult<JobResponse>> GetJobResponse(string id)
    {
        var entity = await _dbContext.JobResponses
            .Include(j => j.SegmentResponses)
            .FirstOrDefaultAsync(j => j.Id == id);

        if (entity == null)
            return NotFound();

        return Ok(entity);
    }

    [HttpGet("job-responses/by-job-order/{jobOrderId}")]
    public async Task<ActionResult<List<JobResponse>>> GetJobResponsesByJobOrder(string jobOrderId)
    {
        var result = await _dbContext.JobResponses
            .Where(j => j.JobOrderId == jobOrderId)
            .Include(j => j.SegmentResponses)
            .OrderBy(j => j.ActualStartTime)
            .ToListAsync();

        return Ok(result);
    }

    #endregion

    #region Segment Responses

    [HttpGet("segment-responses")]
    public async Task<ActionResult<List<SegmentResponse>>> GetSegmentResponses(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var result = await _dbContext.SegmentResponses
            .OrderByDescending(s => s.ActualStartTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("segment-responses/{id}")]
    public async Task<ActionResult<SegmentResponse>> GetSegmentResponse(string id)
    {
        var entity = await _dbContext.SegmentResponses.FindAsync(id);
        if (entity == null)
            return NotFound();

        return Ok(entity);
    }

    [HttpGet("segment-responses/by-job-response/{jobResponseId}")]
    public async Task<ActionResult<List<SegmentResponse>>> GetSegmentResponsesByJobResponse(string jobResponseId)
    {
        var result = await _dbContext.SegmentResponses
            .Where(s => s.JobResponseId == jobResponseId)
            .OrderBy(s => s.SequenceNumber)
            .ToListAsync();

        return Ok(result);
    }

    #endregion

    #region Material Actuals

    [HttpGet("material-actuals")]
    public async Task<ActionResult<List<MaterialActual>>> GetMaterialActuals(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? materialUse = null,
        [FromQuery] string? materialId = null,
        [FromQuery] string? jobOrderId = null)
    {
        var query = _dbContext.MaterialActuals.AsQueryable();

        if (!string.IsNullOrEmpty(materialUse))
            query = query.Where(m => m.MaterialUse == materialUse);
        if (!string.IsNullOrEmpty(materialId))
            query = query.Where(m => m.MaterialId == materialId);
        if (!string.IsNullOrEmpty(jobOrderId))
            query = query.Where(m => m.JobOrderId == jobOrderId);

        var result = await query
            .OrderByDescending(m => m.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("material-actuals/{id}")]
    public async Task<ActionResult<MaterialActual>> GetMaterialActual(string id)
    {
        var entity = await _dbContext.MaterialActuals.FindAsync(id);
        if (entity == null)
            return NotFound();

        return Ok(entity);
    }

    [HttpGet("material-actuals/by-job-order/{jobOrderId}")]
    public async Task<ActionResult<List<MaterialActual>>> GetMaterialActualsByJobOrder(string jobOrderId)
    {
        var result = await _dbContext.MaterialActuals
            .Where(m => m.JobOrderId == jobOrderId)
            .OrderBy(m => m.Timestamp)
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("material-actuals/by-material/{materialId}")]
    public async Task<ActionResult<List<MaterialActual>>> GetMaterialActualsByMaterial(string materialId)
    {
        var result = await _dbContext.MaterialActuals
            .Where(m => m.MaterialId == materialId)
            .OrderByDescending(m => m.Timestamp)
            .Take(100)
            .ToListAsync();

        return Ok(result);
    }

    #endregion

    #region Equipment Actuals

    [HttpGet("equipment-actuals")]
    public async Task<ActionResult<List<EquipmentActual>>> GetEquipmentActuals(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? equipmentId = null,
        [FromQuery] string? jobOrderId = null)
    {
        var query = _dbContext.EquipmentActuals.AsQueryable();

        if (!string.IsNullOrEmpty(equipmentId))
            query = query.Where(e => e.EquipmentId == equipmentId);
        if (!string.IsNullOrEmpty(jobOrderId))
            query = query.Where(e => e.JobOrderId == jobOrderId);

        var result = await query
            .OrderByDescending(e => e.ActualStartTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("equipment-actuals/{id}")]
    public async Task<ActionResult<EquipmentActual>> GetEquipmentActual(string id)
    {
        var entity = await _dbContext.EquipmentActuals.FindAsync(id);
        if (entity == null)
            return NotFound();

        return Ok(entity);
    }

    [HttpGet("equipment-actuals/by-equipment/{equipmentId}")]
    public async Task<ActionResult<List<EquipmentActual>>> GetEquipmentActualsByEquipment(string equipmentId)
    {
        var result = await _dbContext.EquipmentActuals
            .Where(e => e.EquipmentId == equipmentId)
            .OrderByDescending(e => e.ActualStartTime)
            .Take(100)
            .ToListAsync();

        return Ok(result);
    }

    #endregion

    #region Analytics

    /// <summary>
    /// Get production statistics by material
    /// </summary>
    [HttpGet("analytics/production-by-material")]
    public async Task<ActionResult> GetProductionByMaterial(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var query = _dbContext.MaterialActuals
            .Where(m => m.MaterialUse == "MaterialProduced");

        if (fromDate.HasValue)
            query = query.Where(m => m.Timestamp >= fromDate);
        if (toDate.HasValue)
            query = query.Where(m => m.Timestamp <= toDate);

        var result = await query
            .GroupBy(m => m.MaterialId)
            .Select(g => new
            {
                MaterialId = g.Key,
                TotalQuantity = g.Sum(m => m.Quantity ?? 0),
                BatchCount = g.Count(),
                UOM = g.First().QuantityUOM
            })
            .OrderByDescending(x => x.TotalQuantity)
            .ToListAsync();

        return Ok(result);
    }

    /// <summary>
    /// Get production statistics by equipment
    /// </summary>
    [HttpGet("analytics/production-by-equipment")]
    public async Task<ActionResult> GetProductionByEquipment(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var query = _dbContext.EquipmentActuals.AsQueryable();

        if (fromDate.HasValue)
            query = query.Where(e => e.ActualStartTime >= fromDate);
        if (toDate.HasValue)
            query = query.Where(e => e.ActualStartTime <= toDate);

        var result = await query
            .GroupBy(e => e.EquipmentId)
            .Select(g => new
            {
                EquipmentId = g.Key,
                TotalDurationMinutes = g.Sum(e => e.DurationMinutes ?? 0),
                JobCount = g.Count()
            })
            .OrderByDescending(x => x.TotalDurationMinutes)
            .ToListAsync();

        return Ok(result);
    }

    /// <summary>
    /// Get job order statistics by status
    /// </summary>
    [HttpGet("analytics/job-status-summary")]
    public async Task<ActionResult> GetJobStatusSummary()
    {
        var result = await _dbContext.JobOrders
            .GroupBy(j => j.DispatchStatus)
            .Select(g => new
            {
                Status = g.Key,
                Count = g.Count()
            })
            .ToListAsync();

        return Ok(result);
    }

    #endregion
}
