using ISA95DataGenerator.Domain.Entities.MasterData;
using ISA95DataGenerator.Domain.Entities.ProcessData;
using ISA95DataGenerator.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ISA95DataGenerator.Infrastructure.Services;

/// <summary>
/// Configuration for process data generation
/// </summary>
public class ProcessDataGenerationConfig
{
    /// <summary>
    /// Number of work requests to generate
    /// </summary>
    public int WorkRequestCount { get; set; } = 10;

    /// <summary>
    /// Average number of job orders per work request
    /// </summary>
    public int JobOrdersPerWorkRequest { get; set; } = 3;

    /// <summary>
    /// Percentage of job orders that should have responses (0-100)
    /// </summary>
    public int CompletionPercentage { get; set; } = 80;

    /// <summary>
    /// Start date for the generated data
    /// </summary>
    public DateTime StartDate { get; set; } = DateTime.Today.AddDays(-30);

    /// <summary>
    /// End date for the generated data
    /// </summary>
    public DateTime EndDate { get; set; } = DateTime.Today;

    /// <summary>
    /// Random seed for reproducible generation
    /// </summary>
    public int? Seed { get; set; }

    /// <summary>
    /// Clear existing process data before generating new data
    /// </summary>
    public bool ClearExisting { get; set; } = true;

    /// <summary>
    /// Offset in minutes to apply to actual start times relative to planned start times.
    /// Positive values = actual starts later than planned, negative = actual starts earlier.
    /// If null, actual start time will match the planned start time exactly.
    /// </summary>
    public int? ActualStartTimeOffsetMinutes { get; set; }

    /// <summary>
    /// Additional downtime/delay in minutes to add to the production duration.
    /// This simulates unplanned delays, equipment breakdowns, or other downtime events.
    /// If null, no additional delay is added (only the random duration between 30-240 minutes).
    /// </summary>
    public int? DowntimeDelayMinutes { get; set; }
}

/// <summary>
/// Result of process data generation
/// </summary>
public class ProcessDataGenerationResult
{
    public int WorkRequestsGenerated { get; set; }
    public int JobOrdersGenerated { get; set; }
    public int JobResponsesGenerated { get; set; }
    public int SegmentResponsesGenerated { get; set; }
    public int MaterialActualsGenerated { get; set; }
    public int EquipmentActualsGenerated { get; set; }
    public TimeSpan Duration { get; set; }
    public List<string> Messages { get; set; } = new();
}

/// <summary>
/// Service to generate ISA-95 process data from master data
/// </summary>
public class ProcessDataGenerationService
{
    private readonly MigrationDbContext _dbContext;
    private readonly ILogger<ProcessDataGenerationService> _logger;
    private Random _random = new();

    // Master data caches
    private List<Material> _materials = new();
    private List<MaterialLot> _materialLots = new();
    private List<Equipment> _equipments = new();
    private List<ProcessSegment> _processSegments = new();
    private List<SegmentBOM> _segmentBOMs = new();
    private List<ProductionLine> _productionLines = new();
    private List<Shift> _shifts = new();
    private List<Crew> _crews = new();

    private readonly string[] _workTypes = { "Production", "Maintenance", "Quality" };
    private readonly string[] _dispatchStatuses = { "Released", "Ready", "Running", "Completed", "Waiting" };
    private readonly string[] _jobStates = { "Running", "Completed", "Held" };
    private readonly string[] _segmentStates = { "Running", "Completed" };
    private readonly string[] _materialUses = { "MaterialConsumed", "MaterialProduced" };
    private readonly string[] _priorities = { "High", "Medium", "Low" };

    public ProcessDataGenerationService(
        MigrationDbContext dbContext,
        ILogger<ProcessDataGenerationService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Generate process data based on existing master data
    /// </summary>
    public async Task<ProcessDataGenerationResult> GenerateAsync(ProcessDataGenerationConfig config)
    {
        var result = new ProcessDataGenerationResult();
        var startTime = DateTime.UtcNow;

        try
        {
            // Initialize random with seed if provided
            _random = config.Seed.HasValue ? new Random(config.Seed.Value) : new Random();

            // Load master data from database
            await LoadMasterDataAsync(result);

            // Validate we have enough master data
            if (!ValidateMasterData(result))
            {
                result.Messages.Add("ERROR: Insufficient master data to generate process data");
                return result;
            }

            // Clear existing process data if requested
            if (config.ClearExisting)
            {
                await ClearExistingProcessDataAsync();
                result.Messages.Add("Cleared existing process data");
            }

            // Generate work requests
            var workRequests = await GenerateWorkRequestsAsync(config);
            result.WorkRequestsGenerated = workRequests.Count;

            // Generate job orders for each work request
            var jobOrders = await GenerateJobOrdersAsync(workRequests, config);
            result.JobOrdersGenerated = jobOrders.Count;

            // Generate responses for completed job orders
            var (jobResponses, segmentResponses, materialActuals, equipmentActuals) = 
                await GenerateJobResponsesAsync(jobOrders, config);
            
            result.JobResponsesGenerated = jobResponses.Count;
            result.SegmentResponsesGenerated = segmentResponses.Count;
            result.MaterialActualsGenerated = materialActuals.Count;
            result.EquipmentActualsGenerated = equipmentActuals.Count;

            await _dbContext.SaveChangesAsync();

            result.Duration = DateTime.UtcNow - startTime;
            result.Messages.Add($"Process data generation completed in {result.Duration.TotalSeconds:F2}s");

            _logger.LogInformation(
                "Generated process data: {WorkRequests} work requests, {JobOrders} job orders, {JobResponses} responses, {MaterialActuals} material actuals",
                result.WorkRequestsGenerated, result.JobOrdersGenerated, 
                result.JobResponsesGenerated, result.MaterialActualsGenerated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating process data");
            result.Messages.Add($"ERROR: {ex.Message}");
            throw;
        }

        return result;
    }

    private async Task LoadMasterDataAsync(ProcessDataGenerationResult result)
    {
        _logger.LogInformation("Loading master data from database...");

        _materials = await _dbContext.Materials.ToListAsync();
        _materialLots = await _dbContext.MaterialLots.ToListAsync();
        _equipments = await _dbContext.Equipments.ToListAsync();
        _processSegments = await _dbContext.ProcessSegments.ToListAsync();
        _segmentBOMs = await _dbContext.SegmentBOMs.ToListAsync();
        _productionLines = await _dbContext.ProductionLines.ToListAsync();
        _shifts = await _dbContext.Shifts.ToListAsync();
        _crews = await _dbContext.Crews.ToListAsync();

        result.Messages.Add($"Loaded master data: {_materials.Count} materials, {_materialLots.Count} lots, " +
            $"{_equipments.Count} equipment, {_processSegments.Count} segments, {_productionLines.Count} lines");
    }

    private bool ValidateMasterData(ProcessDataGenerationResult result)
    {
        var isValid = true;

        if (_materials.Count == 0)
        {
            result.Messages.Add("WARNING: No materials found in database");
            isValid = false;
        }

        if (_equipments.Count == 0)
        {
            result.Messages.Add("WARNING: No equipment found in database");
            isValid = false;
        }

        if (_processSegments.Count == 0)
        {
            result.Messages.Add("WARNING: No process segments found in database");
            isValid = false;
        }

        return isValid;
    }

    private async Task ClearExistingProcessDataAsync()
    {
        _logger.LogInformation("Clearing existing process data...");

        _dbContext.EquipmentActuals.RemoveRange(_dbContext.EquipmentActuals);
        _dbContext.MaterialActuals.RemoveRange(_dbContext.MaterialActuals);
        _dbContext.SegmentResponses.RemoveRange(_dbContext.SegmentResponses);
        _dbContext.JobResponses.RemoveRange(_dbContext.JobResponses);
        _dbContext.JobOrders.RemoveRange(_dbContext.JobOrders);
        _dbContext.WorkRequests.RemoveRange(_dbContext.WorkRequests);

        await _dbContext.SaveChangesAsync();
    }

    private async Task<List<WorkRequest>> GenerateWorkRequestsAsync(ProcessDataGenerationConfig config)
    {
        var workRequests = new List<WorkRequest>();
        var dateRange = (config.EndDate - config.StartDate).Days;

        for (int i = 1; i <= config.WorkRequestCount; i++)
        {
            var startDate = config.StartDate.AddDays(_random.Next(dateRange));
            var productionLine = _productionLines.Count > 0 
                ? _productionLines[_random.Next(_productionLines.Count)] 
                : null;

            var workRequest = new WorkRequest
            {
                Id = $"WR-{startDate:yyyyMMdd}-{i:D4}",
                Description = $"Work Request for {productionLine?.Id ?? "Production"}",
                WorkType = _workTypes[_random.Next(_workTypes.Length)],
                HierarchyScope = productionLine?.PlantId,
                StartTime = startDate.AddHours(6), // Start at 6 AM
                EndTime = startDate.AddHours(18), // End at 6 PM
                Priority = _priorities[_random.Next(_priorities.Length)],
                RequestState = "Released",
                CreatedAt = DateTime.UtcNow
            };

            workRequests.Add(workRequest);
        }

        await _dbContext.WorkRequests.AddRangeAsync(workRequests);
        _logger.LogInformation("Generated {Count} work requests", workRequests.Count);

        return workRequests;
    }

    private async Task<List<JobOrder>> GenerateJobOrdersAsync(
        List<WorkRequest> workRequests, 
        ProcessDataGenerationConfig config)
    {
        var jobOrders = new List<JobOrder>();
        int jobCounter = 1;

        foreach (var workRequest in workRequests)
        {
            var jobCount = _random.Next(1, config.JobOrdersPerWorkRequest + 2);
            
            for (int j = 0; j < jobCount; j++)
            {
                var material = _materials[_random.Next(_materials.Count)];
                var equipment = _equipments[_random.Next(_equipments.Count)];
                var processSegment = _processSegments.Count > 0 
                    ? _processSegments[_random.Next(_processSegments.Count)] 
                    : null;

                var startTime = workRequest.StartTime?.AddHours(_random.Next(0, 8));
                var endTime = startTime?.AddHours(_random.Next(1, 4));

                // Determine dispatch status - mostly completed for history
                var statusIndex = _random.Next(100);
                string dispatchStatus;
                if (statusIndex < config.CompletionPercentage)
                    dispatchStatus = "Completed";
                else if (statusIndex < config.CompletionPercentage + 10)
                    dispatchStatus = "Running";
                else
                    dispatchStatus = _dispatchStatuses[_random.Next(_dispatchStatuses.Length)];

                var jobOrder = new JobOrder
                {
                    Id = $"JO-{workRequest.StartTime:yyyyMMdd}-{jobCounter:D5}",
                    Description = $"Produce {material.Id}",
                    WorkType = workRequest.WorkType,
                    HierarchyScope = workRequest.HierarchyScope,
                    WorkMasterId = processSegment?.Id,
                    WorkMasterVersion = "1.0",
                    StartTime = startTime,
                    EndTime = endTime,
                    Priority = workRequest.Priority,
                    DispatchStatus = dispatchStatus,
                    Command = "Send",
                    ProcessSegmentId = processSegment?.Id,
                    MaterialId = material.Id,
                    PlannedQuantity = _random.Next(100, 10000),
                    QuantityUOM = "KG",
                    EquipmentId = equipment.Id,
                    WorkRequestId = workRequest.Id,
                    CreatedAt = DateTime.UtcNow
                };

                jobOrders.Add(jobOrder);
                jobCounter++;
            }
        }

        await _dbContext.JobOrders.AddRangeAsync(jobOrders);
        _logger.LogInformation("Generated {Count} job orders", jobOrders.Count);

        return jobOrders;
    }

    private async Task<(List<JobResponse>, List<SegmentResponse>, List<MaterialActual>, List<EquipmentActual>)> 
        GenerateJobResponsesAsync(List<JobOrder> jobOrders, ProcessDataGenerationConfig config)
    {
        var jobResponses = new List<JobResponse>();
        var segmentResponses = new List<SegmentResponse>();
        var materialActuals = new List<MaterialActual>();
        var equipmentActuals = new List<EquipmentActual>();

        int responseCounter = 1;
        int segmentCounter = 1;
        int materialCounter = 1;
        int equipmentCounter = 1;

        // Only generate responses for completed or running job orders
        var completedOrRunning = jobOrders
            .Where(j => j.DispatchStatus == "Completed" || j.DispatchStatus == "Running")
            .ToList();

        foreach (var jobOrder in completedOrRunning)
        {
            var shift = _shifts.Count > 0 ? _shifts[_random.Next(_shifts.Count)] : null;
            var crew = _crews.Count > 0 ? _crews[_random.Next(_crews.Count)] : null;

            // Generate actual times with configured offset
            DateTime? actualStartTime;
            if (config.ActualStartTimeOffsetMinutes.HasValue)
            {
                actualStartTime = jobOrder.StartTime?.AddMinutes(config.ActualStartTimeOffsetMinutes.Value);
            }
            else
            {
                // No offset: use exact planned start time
                actualStartTime = jobOrder.StartTime;
            }
            
            var durationMinutes = _random.Next(30, 240);
            
            // Add downtime delay if configured
            if (config.DowntimeDelayMinutes.HasValue)
            {
                durationMinutes += config.DowntimeDelayMinutes.Value;
            }
            
            var actualEndTime = jobOrder.DispatchStatus == "Completed" 
                ? actualStartTime?.AddMinutes(durationMinutes) 
                : null;

            // Generate a new lot for produced material
            var producedLotId = $"LOT-{jobOrder.MaterialId}-{jobOrder.StartTime:yyyyMMdd}-{responseCounter:D4}";

            // Calculate actual quantity with variance
            var variance = 1.0 + (_random.NextDouble() * 0.1 - 0.05); // +/- 5%
            var actualQuantity = (decimal)((double)(jobOrder.PlannedQuantity ?? 1000) * variance);

            var jobResponse = new JobResponse
            {
                Id = $"JR-{jobOrder.StartTime:yyyyMMdd}-{responseCounter:D5}",
                Description = $"Response for {jobOrder.Id}",
                WorkType = jobOrder.WorkType,
                HierarchyScope = jobOrder.HierarchyScope,
                ActualStartTime = actualStartTime,
                ActualEndTime = actualEndTime,
                JobState = jobOrder.DispatchStatus == "Completed" ? "Completed" : "Running",
                JobOrderId = jobOrder.Id,
                MaterialId = jobOrder.MaterialId,
                MaterialLotId = producedLotId,
                ActualQuantity = actualQuantity,
                QuantityUOM = jobOrder.QuantityUOM,
                EquipmentId = jobOrder.EquipmentId,
                ShiftId = shift?.Id,
                CrewId = crew?.Id,
                CreatedAt = DateTime.UtcNow
            };

            jobResponses.Add(jobResponse);

            // Generate segment responses (1-3 segments per job)
            var segmentCount = _random.Next(1, 4);
            var segmentStartTime = actualStartTime;
            
            for (int s = 0; s < segmentCount; s++)
            {
                var segDuration = durationMinutes / segmentCount;
                var segmentEndTime = jobOrder.DispatchStatus == "Completed" 
                    ? segmentStartTime?.AddMinutes(segDuration) 
                    : null;

                var segmentResponse = new SegmentResponse
                {
                    Id = $"SR-{jobOrder.StartTime:yyyyMMdd}-{segmentCounter:D6}",
                    Description = $"Segment {s + 1} for {jobResponse.Id}",
                    ProcessSegmentId = jobOrder.ProcessSegmentId,
                    HierarchyScope = jobOrder.HierarchyScope,
                    ActualStartTime = segmentStartTime,
                    ActualEndTime = segmentEndTime,
                    SegmentState = jobOrder.DispatchStatus == "Completed" ? "Completed" : "Running",
                    DurationMinutes = segDuration,
                    JobResponseId = jobResponse.Id,
                    EquipmentId = jobOrder.EquipmentId,
                    SequenceNumber = s + 1,
                    CreatedAt = DateTime.UtcNow
                };

                segmentResponses.Add(segmentResponse);
                segmentStartTime = segmentEndTime;
                segmentCounter++;
            }

            // Generate material actuals (consumed and produced)
            // 1. Material Produced
            var producedMaterial = new MaterialActual
            {
                Id = $"MA-{jobOrder.StartTime:yyyyMMdd}-{materialCounter:D6}",
                Description = $"Produced material for {jobOrder.Id}",
                HierarchyScope = jobOrder.HierarchyScope,
                MaterialUse = "MaterialProduced",
                MaterialId = jobOrder.MaterialId,
                MaterialLotId = producedLotId,
                Quantity = actualQuantity,
                QuantityUOM = jobOrder.QuantityUOM,
                Timestamp = actualEndTime ?? actualStartTime,
                JobOrderId = jobOrder.Id,
                ProcessSegmentId = jobOrder.ProcessSegmentId,
                EquipmentId = jobOrder.EquipmentId,
                CreatedAt = DateTime.UtcNow
            };
            materialActuals.Add(producedMaterial);
            materialCounter++;

            // 2. Materials Consumed (based on BOM if available, otherwise random)
            var bomItems = _segmentBOMs.Where(b => b.ProcessSegmentId == jobOrder.ProcessSegmentId).ToList();
            if (bomItems.Any())
            {
                foreach (var bom in bomItems)
                {
                    var consumedQuantity = actualQuantity * bom.QtyPerUnit;
                    var consumedLot = _materialLots.FirstOrDefault(l => l.MaterialId == bom.MaterialId)
                        ?? _materialLots.FirstOrDefault();

                    var consumedMaterial = new MaterialActual
                    {
                        Id = $"MA-{jobOrder.StartTime:yyyyMMdd}-{materialCounter:D6}",
                        Description = $"Consumed {bom.MaterialId} for {jobOrder.Id}",
                        HierarchyScope = jobOrder.HierarchyScope,
                        MaterialUse = "MaterialConsumed",
                        MaterialId = bom.MaterialId,
                        MaterialLotId = consumedLot?.Id,
                        Quantity = consumedQuantity,
                        QuantityUOM = bom.Uom ?? "KG",
                        Timestamp = actualStartTime,
                        JobOrderId = jobOrder.Id,
                        ProcessSegmentId = jobOrder.ProcessSegmentId,
                        EquipmentId = jobOrder.EquipmentId,
                        CreatedAt = DateTime.UtcNow
                    };
                    materialActuals.Add(consumedMaterial);
                    materialCounter++;
                }
            }
            else
            {
                // Generate 1-3 random consumed materials
                var consumedCount = _random.Next(1, 4);
                for (int c = 0; c < consumedCount && c < _materialLots.Count; c++)
                {
                    var lot = _materialLots[_random.Next(_materialLots.Count)];
                    var consumedMaterial = new MaterialActual
                    {
                        Id = $"MA-{jobOrder.StartTime:yyyyMMdd}-{materialCounter:D6}",
                        Description = $"Consumed {lot.MaterialId} for {jobOrder.Id}",
                        HierarchyScope = jobOrder.HierarchyScope,
                        MaterialUse = "MaterialConsumed",
                        MaterialId = lot.MaterialId,
                        MaterialLotId = lot.Id,
                        Quantity = actualQuantity * (decimal)(0.1 + _random.NextDouble() * 0.2),
                        QuantityUOM = "KG",
                        Timestamp = actualStartTime,
                        JobOrderId = jobOrder.Id,
                        ProcessSegmentId = jobOrder.ProcessSegmentId,
                        EquipmentId = jobOrder.EquipmentId,
                        CreatedAt = DateTime.UtcNow
                    };
                    materialActuals.Add(consumedMaterial);
                    materialCounter++;
                }
            }

            // Generate equipment actual
            var equipmentActual = new EquipmentActual
            {
                Id = $"EA-{jobOrder.StartTime:yyyyMMdd}-{equipmentCounter:D6}",
                Description = $"Equipment usage for {jobOrder.Id}",
                HierarchyScope = jobOrder.HierarchyScope,
                EquipmentUse = "Actual",
                EquipmentId = jobOrder.EquipmentId,
                ActualStartTime = actualStartTime,
                ActualEndTime = actualEndTime,
                DurationMinutes = durationMinutes,
                EquipmentState = jobOrder.DispatchStatus == "Completed" ? "Idle" : "Running",
                JobOrderId = jobOrder.Id,
                CreatedAt = DateTime.UtcNow
            };
            equipmentActuals.Add(equipmentActual);
            equipmentCounter++;

            responseCounter++;
        }

        await _dbContext.JobResponses.AddRangeAsync(jobResponses);
        await _dbContext.SegmentResponses.AddRangeAsync(segmentResponses);
        await _dbContext.MaterialActuals.AddRangeAsync(materialActuals);
        await _dbContext.EquipmentActuals.AddRangeAsync(equipmentActuals);

        _logger.LogInformation(
            "Generated {JobResponses} job responses, {SegmentResponses} segment responses, " +
            "{MaterialActuals} material actuals, {EquipmentActuals} equipment actuals",
            jobResponses.Count, segmentResponses.Count, materialActuals.Count, equipmentActuals.Count);

        return (jobResponses, segmentResponses, materialActuals, equipmentActuals);
    }

    /// <summary>
    /// Get summary of existing process data
    /// </summary>
    public async Task<ProcessDataSummary> GetSummaryAsync()
    {
        return new ProcessDataSummary
        {
            WorkRequestCount = await _dbContext.WorkRequests.CountAsync(),
            JobOrderCount = await _dbContext.JobOrders.CountAsync(),
            JobResponseCount = await _dbContext.JobResponses.CountAsync(),
            SegmentResponseCount = await _dbContext.SegmentResponses.CountAsync(),
            MaterialActualCount = await _dbContext.MaterialActuals.CountAsync(),
            EquipmentActualCount = await _dbContext.EquipmentActuals.CountAsync(),
            EarliestDate = await _dbContext.JobOrders
                .Where(j => j.StartTime.HasValue)
                .Select(j => j.StartTime)
                .MinAsync() ?? DateTime.MinValue,
            LatestDate = await _dbContext.JobOrders
                .Where(j => j.StartTime.HasValue)
                .Select(j => j.StartTime)
                .MaxAsync() ?? DateTime.MinValue
        };
    }
}

/// <summary>
/// Summary of process data in the database
/// </summary>
public class ProcessDataSummary
{
    public int WorkRequestCount { get; set; }
    public int JobOrderCount { get; set; }
    public int JobResponseCount { get; set; }
    public int SegmentResponseCount { get; set; }
    public int MaterialActualCount { get; set; }
    public int EquipmentActualCount { get; set; }
    public DateTime EarliestDate { get; set; }
    public DateTime LatestDate { get; set; }
}
