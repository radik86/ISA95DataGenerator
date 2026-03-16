using System.Text;
using System.Text.RegularExpressions;
using ISA95DataGenerator.Domain.Entities.MasterData;
using ISA95DataGenerator.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ISA95DataGenerator.API.Controllers;

/// <summary>
/// CSV Import API Controller - replicates the frontend csvParser.ts logic
/// Parses CSV files and imports master data into the database
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class CsvImportController : ControllerBase
{
    private readonly MigrationDbContext _context;
    private readonly ILogger<CsvImportController> _logger;

    public CsvImportController(MigrationDbContext context, ILogger<CsvImportController> logger)
    {
        _context = context;
        _logger = logger;
    }

    #region CSV Parsing Utilities

    /// <summary>
    /// Parse CSV text into list of dictionaries (matching frontend parseCSV logic)
    /// </summary>
    private List<Dictionary<string, string>> ParseCSV(string csvText)
    {
        // Normalize line endings
        var normalizedText = csvText.Replace("\r\n", "\n").Replace("\r", "\n");
        var lines = normalizedText.Trim().Split('\n');

        if (lines.Length < 2)
            return new List<Dictionary<string, string>>();

        var headers = lines[0].Split(',').Select(h => h.Trim()).ToArray();
        var records = new List<Dictionary<string, string>>();

        for (int i = 1; i < lines.Length; i++)
        {
            var values = ParseCSVLine(lines[i]);
            if (values.Count == headers.Length)
            {
                var record = new Dictionary<string, string>();
                for (int j = 0; j < headers.Length; j++)
                {
                    record[headers[j]] = values[j];
                }
                records.Add(record);
            }
        }

        return records;
    }

    /// <summary>
    /// Parse a single CSV line handling quoted values (matching frontend parseCSVLine logic)
    /// </summary>
    private List<string> ParseCSVLine(string line)
    {
        var result = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        foreach (var c in line)
        {
            if (c == '"')
            {
                inQuotes = !inQuotes;
            }
            else if (c == ',' && !inQuotes)
            {
                result.Add(current.ToString().Trim());
                current.Clear();
            }
            else
            {
                current.Append(c);
            }
        }

        result.Add(current.ToString().Trim());
        return result;
    }

    private string GetValue(Dictionary<string, string> record, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (record.TryGetValue(key, out var value) && !string.IsNullOrEmpty(value))
                return value;
        }
        return string.Empty;
    }

    private string? GetNullableValue(Dictionary<string, string> record, params string[] keys)
    {
        var value = GetValue(record, keys);
        return string.IsNullOrEmpty(value) ? null : value;
    }

    private decimal ParseDecimal(string value) => decimal.TryParse(value, out var result) ? result : 0;
    private int ParseInt(string value) => int.TryParse(value, out var result) ? result : 0;
    private bool ParseBool(string value) => value.Equals("TRUE", StringComparison.OrdinalIgnoreCase) || 
                                            value.Equals("true", StringComparison.OrdinalIgnoreCase) ||
                                            value.Equals("True", StringComparison.OrdinalIgnoreCase);

    #endregion

    #region Material Classes

    /// <summary>
    /// Import Material Classes from CSV
    /// CSV Headers: MaterialClassID, MaterialClassName, Description
    /// </summary>
    [HttpPost("material-classes")]
    public async Task<IActionResult> ImportMaterialClasses(IFormFile file)
    {
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var csvText = await reader.ReadToEndAsync();
            var records = ParseCSV(csvText);

            var entities = records.Select(r => new MaterialClass
            {
                Id = GetValue(r, "MaterialClassID"),
                Name = GetValue(r, "MaterialClassName"),
                Description = GetValue(r, "Description"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 1
            }).Where(e => !string.IsNullOrEmpty(e.Id)).ToList();

            // Upsert logic
            foreach (var entity in entities)
            {
                var existing = await _context.MaterialClasses.FindAsync(entity.Id);
                if (existing != null)
                {
                    existing.Name = entity.Name;
                    existing.Description = entity.Description;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Version++;
                }
                else
                {
                    _context.MaterialClasses.Add(entity);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Imported {Count} material classes", entities.Count);
            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing material classes");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion

    #region Materials

    /// <summary>
    /// Import Materials from CSV
    /// CSV Headers: MaterialID, MaterialName, MaterialClassID, MaterialClass, DefaultUoM, Description
    /// </summary>
    [HttpPost("materials")]
    public async Task<IActionResult> ImportMaterials(IFormFile file)
    {
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var csvText = await reader.ReadToEndAsync();
            var records = ParseCSV(csvText);

            var entities = records.Select(r => new Material
            {
                Id = GetValue(r, "MaterialID"),
                Name = GetValue(r, "MaterialName"),
                ClassId = GetValue(r, "MaterialClassID"),
                ClassName = GetValue(r, "MaterialClass"),
                DefaultUoM = GetValue(r, "DefaultUoM"),
                Description = GetValue(r, "Description"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 1
            }).Where(e => !string.IsNullOrEmpty(e.Id)).ToList();

            foreach (var entity in entities)
            {
                var existing = await _context.Materials.FindAsync(entity.Id);
                if (existing != null)
                {
                    existing.Name = entity.Name;
                    existing.ClassId = entity.ClassId;
                    existing.ClassName = entity.ClassName;
                    existing.DefaultUoM = entity.DefaultUoM;
                    existing.Description = entity.Description;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Version++;
                }
                else
                {
                    _context.Materials.Add(entity);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Imported {Count} materials", entities.Count);
            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing materials");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion

    #region Material Lots

    /// <summary>
    /// Import Material Lots from CSV
    /// CSV Headers: MaterialLotID, MaterialID, LotQuantity, LotUoM, ReceivedDateTime, ProducedDateTime, etc.
    /// </summary>
    [HttpPost("material-lots")]
    public async Task<IActionResult> ImportMaterialLots(IFormFile file)
    {
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var csvText = await reader.ReadToEndAsync();
            var records = ParseCSV(csvText);

            var entities = records.Select(r => new MaterialLot
            {
                Id = GetValue(r, "MaterialLotID"),
                MaterialId = GetValue(r, "MaterialID"),
                LotQuantity = ParseDecimal(GetValue(r, "LotQuantity")),
                LotUoM = GetValue(r, "LotUoM"),
                ReceivedDateTime = GetNullableValue(r, "ReceivedDateTime"),
                ProducedDateTime = GetNullableValue(r, "ProducedDateTime"),
                SupplierOrProducerId = GetNullableValue(r, "SupplierOrProducerID"),
                SupplierOrProducerName = GetNullableValue(r, "SupplierOrProducerName"),
                ProducedByProcessSegmentId = GetNullableValue(r, "ProducedByProcessSegmentID"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 1
            }).Where(e => !string.IsNullOrEmpty(e.Id)).ToList();

            foreach (var entity in entities)
            {
                var existing = await _context.MaterialLots.FindAsync(entity.Id);
                if (existing != null)
                {
                    existing.MaterialId = entity.MaterialId;
                    existing.LotQuantity = entity.LotQuantity;
                    existing.LotUoM = entity.LotUoM;
                    existing.ReceivedDateTime = entity.ReceivedDateTime;
                    existing.ProducedDateTime = entity.ProducedDateTime;
                    existing.SupplierOrProducerId = entity.SupplierOrProducerId;
                    existing.SupplierOrProducerName = entity.SupplierOrProducerName;
                    existing.ProducedByProcessSegmentId = entity.ProducedByProcessSegmentId;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Version++;
                }
                else
                {
                    _context.MaterialLots.Add(entity);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Imported {Count} material lots", entities.Count);
            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing material lots");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion

    #region Equipment Classes

    /// <summary>
    /// Import Equipment Classes from CSV
    /// CSV Headers: EquipmentClassID, EquipmentClassName, Description, EquipmentClassParentID
    /// </summary>
    [HttpPost("equipment-classes")]
    public async Task<IActionResult> ImportEquipmentClasses(IFormFile file)
    {
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var csvText = await reader.ReadToEndAsync();
            var records = ParseCSV(csvText);

            var entities = records.Select(r => new EquipmentClass
            {
                Id = GetValue(r, "EquipmentClassID"),
                Name = GetValue(r, "EquipmentClassName"),
                Description = GetValue(r, "Description"),
                ParentId = GetNullableValue(r, "EquipmentClassParentID"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 1
            }).Where(e => !string.IsNullOrEmpty(e.Id)).ToList();

            foreach (var entity in entities)
            {
                var existing = await _context.EquipmentClasses.FindAsync(entity.Id);
                if (existing != null)
                {
                    existing.Name = entity.Name;
                    existing.Description = entity.Description;
                    existing.ParentId = entity.ParentId;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Version++;
                }
                else
                {
                    _context.EquipmentClasses.Add(entity);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Imported {Count} equipment classes", entities.Count);
            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing equipment classes");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion

    #region Equipment

    /// <summary>
    /// Import Equipment from CSV
    /// CSV Headers: EquipmentID, EquipmentName, EquipmentClassID, EquipmentClass, EquipmentParentId, EquipmentDescription
    /// </summary>
    [HttpPost("equipment")]
    public async Task<IActionResult> ImportEquipment(IFormFile file)
    {
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var csvText = await reader.ReadToEndAsync();
            var records = ParseCSV(csvText);

            var entities = records.Select(r => new Equipment
            {
                Id = GetValue(r, "EquipmentID"),
                Name = GetValue(r, "EquipmentName", "EquipmentID"),
                ClassId = GetValue(r, "EquipmentClassID"),
                ClassName = GetValue(r, "EquipmentClass"),
                Description = GetNullableValue(r, "EquipmentDescription"),
                ParentEquipmentId = GetNullableValue(r, "EquipmentParentId"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 1
            }).Where(e => !string.IsNullOrEmpty(e.Id)).ToList();

            foreach (var entity in entities)
            {
                var existing = await _context.Equipments.FindAsync(entity.Id);
                if (existing != null)
                {
                    existing.Name = entity.Name;
                    existing.ClassId = entity.ClassId;
                    existing.ClassName = entity.ClassName;
                    existing.Description = entity.Description;
                    existing.ParentEquipmentId = entity.ParentEquipmentId;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Version++;
                }
                else
                {
                    _context.Equipments.Add(entity);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Imported {Count} equipment", entities.Count);
            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing equipment");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion

    #region Process Segments

    /// <summary>
    /// Import Process Segments from CSV
    /// CSV Headers: ProcessSegmentID, ProcessSegmentName, ProductMaterialID, Sequence, DurationHours[, ProcessSegmentDescription]
    /// </summary>
    [HttpPost("process-segments")]
    public async Task<IActionResult> ImportProcessSegments(IFormFile file)
    {
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var csvText = await reader.ReadToEndAsync();
            var records = ParseCSV(csvText);

            var entities = records.Select(r => new ProcessSegment
            {
                Id = GetValue(r, "ProcessSegmentID"),
                ProductMaterialId = GetValue(r, "ProductMaterialID"),
                Name = GetValue(r, "ProcessSegmentName"),
                Sequence = ParseInt(GetValue(r, "Sequence", "Seq")),
                DurationHours = ParseDecimal(GetValue(r, "DurationHours", "SegmentDurationHours")),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 1
            }).Where(e => !string.IsNullOrEmpty(e.Id)).ToList();

            foreach (var entity in entities)
            {
                var existing = await _context.ProcessSegments.FindAsync(entity.Id);
                if (existing != null)
                {
                    existing.ProductMaterialId = entity.ProductMaterialId;
                    existing.Name = entity.Name;
                    existing.Sequence = entity.Sequence;
                    existing.DurationHours = entity.DurationHours;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Version++;
                }
                else
                {
                    _context.ProcessSegments.Add(entity);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Imported {Count} process segments", entities.Count);
            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing process segments");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion

    #region Segment BOMs

    /// <summary>
    /// Import Segment BOMs from CSV
    /// CSV Headers: BOMLineID, ProcessSegmentID, MaterialID, MaterialQtyPerUnit, MaterialUoM, MaterialUse
    /// </summary>
    [HttpPost("segment-boms")]
    public async Task<IActionResult> ImportSegmentBOMs(IFormFile file)
    {
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var csvText = await reader.ReadToEndAsync();
            var records = ParseCSV(csvText);

            var entities = records.Select(r => new SegmentBOM
            {
                Id = GetValue(r, "BOMLineID"),
                ProcessSegmentId = GetValue(r, "ProcessSegmentID"),
                MaterialId = GetValue(r, "MaterialID"),
                QtyPerUnit = ParseDecimal(GetValue(r, "MaterialQtyPerUnit")),
                Uom = GetValue(r, "MaterialUoM"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 1
            }).Where(e => !string.IsNullOrEmpty(e.Id)).ToList();

            foreach (var entity in entities)
            {
                var existing = await _context.SegmentBOMs.FindAsync(entity.Id);
                if (existing != null)
                {
                    existing.ProcessSegmentId = entity.ProcessSegmentId;
                    existing.MaterialId = entity.MaterialId;
                    existing.QtyPerUnit = entity.QtyPerUnit;
                    existing.Uom = entity.Uom;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Version++;
                }
                else
                {
                    _context.SegmentBOMs.Add(entity);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Imported {Count} segment BOMs", entities.Count);
            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing segment BOMs");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion

    #region Plants

    /// <summary>
    /// Import Plants from CSV
    /// CSV Headers: PlantID, PlantName, Location, Description
    /// </summary>
    [HttpPost("plants")]
    public async Task<IActionResult> ImportPlants(IFormFile file)
    {
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var csvText = await reader.ReadToEndAsync();
            var records = ParseCSV(csvText);

            var entities = records.Select(r => new Plant
            {
                Id = GetValue(r, "PlantID"),
                Name = GetValue(r, "PlantName"),
                Location = GetValue(r, "Location"),
                Description = GetValue(r, "Description"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 1
            }).Where(e => !string.IsNullOrEmpty(e.Id)).ToList();

            foreach (var entity in entities)
            {
                var existing = await _context.Plants.FindAsync(entity.Id);
                if (existing != null)
                {
                    existing.Name = entity.Name;
                    existing.Location = entity.Location;
                    existing.Description = entity.Description;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Version++;
                }
                else
                {
                    _context.Plants.Add(entity);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Imported {Count} plants", entities.Count);
            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing plants");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion

    #region Production Lines

    /// <summary>
    /// Import Production Lines from CSV
    /// CSV Headers: LineID, PlantID, LineName, Description
    /// </summary>
    [HttpPost("production-lines")]
    public async Task<IActionResult> ImportProductionLines(IFormFile file)
    {
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var csvText = await reader.ReadToEndAsync();
            var records = ParseCSV(csvText);

            var entities = records.Select(r => new ProductionLine
            {
                Id = GetValue(r, "LineID"),
                PlantId = GetValue(r, "PlantID"),
                Name = GetValue(r, "LineName"),
                Description = GetValue(r, "Description"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 1
            }).Where(e => !string.IsNullOrEmpty(e.Id)).ToList();

            foreach (var entity in entities)
            {
                var existing = await _context.ProductionLines.FindAsync(entity.Id);
                if (existing != null)
                {
                    existing.PlantId = entity.PlantId;
                    existing.Name = entity.Name;
                    existing.Description = entity.Description;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Version++;
                }
                else
                {
                    _context.ProductionLines.Add(entity);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Imported {Count} production lines", entities.Count);
            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing production lines");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion

    #region Shifts

    /// <summary>
    /// Import Shifts from CSV
    /// CSV Headers: ShiftID, ShiftNumber, ShiftName, StartTime, EndTime, Description
    /// </summary>
    [HttpPost("shifts")]
    public async Task<IActionResult> ImportShifts(IFormFile file)
    {
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var csvText = await reader.ReadToEndAsync();
            var records = ParseCSV(csvText);

            var entities = records.Select(r => new Shift
            {
                Id = GetValue(r, "ShiftID"),
                ShiftNumber = ParseInt(GetValue(r, "ShiftNumber")),
                ShiftName = GetValue(r, "ShiftName"),
                StartTime = GetValue(r, "StartTime"),
                EndTime = GetValue(r, "EndTime"),
                Description = GetValue(r, "Description"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 1
            }).Where(e => !string.IsNullOrEmpty(e.Id)).ToList();

            foreach (var entity in entities)
            {
                var existing = await _context.Shifts.FindAsync(entity.Id);
                if (existing != null)
                {
                    existing.ShiftNumber = entity.ShiftNumber;
                    existing.ShiftName = entity.ShiftName;
                    existing.StartTime = entity.StartTime;
                    existing.EndTime = entity.EndTime;
                    existing.Description = entity.Description;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Version++;
                }
                else
                {
                    _context.Shifts.Add(entity);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Imported {Count} shifts", entities.Count);
            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing shifts");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion

    #region Crews

    /// <summary>
    /// Import Crews from CSV
    /// CSV Headers: CrewID, CrewName, PeopleCount, Skills, Description
    /// </summary>
    [HttpPost("crews")]
    public async Task<IActionResult> ImportCrews(IFormFile file)
    {
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var csvText = await reader.ReadToEndAsync();
            var records = ParseCSV(csvText);

            var entities = records.Select(r => new Crew
            {
                Id = GetValue(r, "CrewID"),
                CrewName = GetValue(r, "CrewName"),
                PeopleCount = ParseInt(GetValue(r, "PeopleCount")),
                Skills = GetValue(r, "Skills"),
                Description = GetValue(r, "Description"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 1
            }).Where(e => !string.IsNullOrEmpty(e.Id)).ToList();

            foreach (var entity in entities)
            {
                var existing = await _context.Crews.FindAsync(entity.Id);
                if (existing != null)
                {
                    existing.CrewName = entity.CrewName;
                    existing.PeopleCount = entity.PeopleCount;
                    existing.Skills = entity.Skills;
                    existing.Description = entity.Description;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Version++;
                }
                else
                {
                    _context.Crews.Add(entity);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Imported {Count} crews", entities.Count);
            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing crews");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion

    #region Operation Event Definitions

    /// <summary>
    /// Import Operation Event Definitions from CSV
    /// CSV Headers: OperationsEventDefinitionID, EventCategory, EventCode, Description, CausesDowntime, CausesScrap, RootCauseType, EventType
    /// </summary>
    [HttpPost("operation-event-definitions")]
    public async Task<IActionResult> ImportOperationEventDefinitions(IFormFile file)
    {
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var csvText = await reader.ReadToEndAsync();
            var records = ParseCSV(csvText);

            var entities = records.Select(r => new OperationEventDefinition
            {
                Id = GetValue(r, "OperationsEventDefinitionID"),
                EventCategory = GetValue(r, "EventCategory"),
                EventCode = GetValue(r, "EventCode"),
                Description = GetValue(r, "Description"),
                CausesDowntime = ParseBool(GetValue(r, "CausesDowntime")),
                CausesScrap = ParseBool(GetValue(r, "CausesScrap")),
                RootCauseType = GetValue(r, "RootCauseType"),
                EventType = GetValue(r, "EventType", "Alarm"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 1
            }).Where(e => !string.IsNullOrEmpty(e.Id)).ToList();

            foreach (var entity in entities)
            {
                var existing = await _context.OperationEventDefinitions.FindAsync(entity.Id);
                if (existing != null)
                {
                    existing.EventCategory = entity.EventCategory;
                    existing.EventCode = entity.EventCode;
                    existing.Description = entity.Description;
                    existing.CausesDowntime = entity.CausesDowntime;
                    existing.CausesScrap = entity.CausesScrap;
                    existing.RootCauseType = entity.RootCauseType;
                    existing.EventType = entity.EventType;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Version++;
                }
                else
                {
                    _context.OperationEventDefinitions.Add(entity);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Imported {Count} operation event definitions", entities.Count);
            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing operation event definitions");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion

    #region Hierarchy Scopes

    /// <summary>
    /// Import Hierarchy Scopes from CSV
    /// CSV Headers: id (or HierarchyScopeID), equipmentID, equipmentLevel
    /// </summary>
    [HttpPost("hierarchy-scopes")]
    public async Task<IActionResult> ImportHierarchyScopes(IFormFile file)
    {
        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var csvText = await reader.ReadToEndAsync();
            var records = ParseCSV(csvText);

            var entities = records.Select(r => new HierarchyScope
            {
                Id = GetValue(r, "id", "HierarchyScopeID", "ID"),
                EquipmentID = GetValue(r, "equipmentID", "EquipmentID"),
                EquipmentLevel = GetValue(r, "equipmentLevel", "EquipmentLevel"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 1
            }).Where(e => !string.IsNullOrEmpty(e.Id)).ToList();

            foreach (var entity in entities)
            {
                var existing = await _context.HierarchyScopes.FindAsync(entity.Id);
                if (existing != null)
                {
                    existing.EquipmentID = entity.EquipmentID;
                    existing.EquipmentLevel = entity.EquipmentLevel;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.Version++;
                }
                else
                {
                    _context.HierarchyScopes.Add(entity);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Imported {Count} hierarchy scopes", entities.Count);
            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing hierarchy scopes");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion

    #region Import All from Templates Directory

    /// <summary>
    /// Import all master data from CSV files in templates/masterdata directory
    /// </summary>
    [HttpPost("import-all-templates")]
    public async Task<IActionResult> ImportAllTemplates([FromQuery] string templatesPath)
    {
        try
        {
            var results = new Dictionary<string, object>();

            // Define file mappings
            var fileMappings = new Dictionary<string, Func<string, Task<int>>>
            {
                { "material_classes.csv", async (csv) => await ImportFromCsv<MaterialClass>(csv, ParseMaterialClass) },
                { "materials.csv", async (csv) => await ImportFromCsv<Material>(csv, ParseMaterial) },
                { "material_lots.csv", async (csv) => await ImportFromCsv<MaterialLot>(csv, ParseMaterialLot) },
                { "equipment_classes.csv", async (csv) => await ImportFromCsv<EquipmentClass>(csv, ParseEquipmentClass) },
                { "equipment.csv", async (csv) => await ImportFromCsv<Equipment>(csv, ParseEquipment) },
                { "process_segments.csv", async (csv) => await ImportFromCsv<ProcessSegment>(csv, ParseProcessSegment) },
                { "segment_material_bom.csv", async (csv) => await ImportFromCsv<SegmentBOM>(csv, ParseSegmentBOM) },
                { "plants.csv", async (csv) => await ImportFromCsv<Plant>(csv, ParsePlant) },
                { "production_lines.csv", async (csv) => await ImportFromCsv<ProductionLine>(csv, ParseProductionLine) },
                { "shifts.csv", async (csv) => await ImportFromCsv<Shift>(csv, ParseShift) },
                { "crews.csv", async (csv) => await ImportFromCsv<Crew>(csv, ParseCrew) },
            };

            foreach (var mapping in fileMappings)
            {
                var filePath = Path.Combine(templatesPath, mapping.Key);
                if (System.IO.File.Exists(filePath))
                {
                    var csvContent = await System.IO.File.ReadAllTextAsync(filePath);
                    var count = await mapping.Value(csvContent);
                    results[mapping.Key] = new { imported = count };
                    _logger.LogInformation("Imported {Count} records from {File}", count, mapping.Key);
                }
            }

            await _context.SaveChangesAsync();
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing all templates");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    private async Task<int> ImportFromCsv<T>(string csvText, Func<Dictionary<string, string>, T> parser) where T : class
    {
        var records = ParseCSV(csvText);
        var entities = records.Select(parser).ToList();
        var dbSet = _context.Set<T>();
        
        foreach (var entity in entities)
        {
            dbSet.Add(entity);
        }
        
        return entities.Count;
    }

    private MaterialClass ParseMaterialClass(Dictionary<string, string> r) => new()
    {
        Id = GetValue(r, "MaterialClassID"),
        Name = GetValue(r, "MaterialClassName"),
        Description = GetValue(r, "Description"),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        Version = 1
    };

    private Material ParseMaterial(Dictionary<string, string> r) => new()
    {
        Id = GetValue(r, "MaterialID"),
        Name = GetValue(r, "MaterialName"),
        ClassId = GetValue(r, "MaterialClassID"),
        ClassName = GetValue(r, "MaterialClass"),
        DefaultUoM = GetValue(r, "DefaultUoM"),
        Description = GetValue(r, "Description"),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        Version = 1
    };

    private MaterialLot ParseMaterialLot(Dictionary<string, string> r) => new()
    {
        Id = GetValue(r, "MaterialLotID"),
        MaterialId = GetValue(r, "MaterialID"),
        LotQuantity = ParseDecimal(GetValue(r, "LotQuantity")),
        LotUoM = GetValue(r, "LotUoM"),
        ReceivedDateTime = GetNullableValue(r, "ReceivedDateTime"),
        ProducedDateTime = GetNullableValue(r, "ProducedDateTime"),
        SupplierOrProducerId = GetNullableValue(r, "SupplierOrProducerID"),
        SupplierOrProducerName = GetNullableValue(r, "SupplierOrProducerName"),
        ProducedByProcessSegmentId = GetNullableValue(r, "ProducedByProcessSegmentID"),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        Version = 1
    };

    private EquipmentClass ParseEquipmentClass(Dictionary<string, string> r) => new()
    {
        Id = GetValue(r, "EquipmentClassID"),
        Name = GetValue(r, "EquipmentClassName"),
        Description = GetValue(r, "Description"),
        ParentId = GetNullableValue(r, "EquipmentClassParentID"),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        Version = 1
    };

    private Equipment ParseEquipment(Dictionary<string, string> r) => new()
    {
        Id = GetValue(r, "EquipmentID"),
        Name = GetValue(r, "EquipmentName", "EquipmentID"),
        ClassId = GetValue(r, "EquipmentClassID"),
        ClassName = GetValue(r, "EquipmentClass"),
        Description = GetNullableValue(r, "EquipmentDescription"),
        ParentEquipmentId = GetNullableValue(r, "EquipmentParentId"),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        Version = 1
    };

    private ProcessSegment ParseProcessSegment(Dictionary<string, string> r) => new()
    {
        Id = GetValue(r, "ProcessSegmentID"),
        ProductMaterialId = GetValue(r, "ProductMaterialID"),
        Name = GetValue(r, "ProcessSegmentName"),
        Sequence = ParseInt(GetValue(r, "Sequence", "Seq")),
        DurationHours = ParseDecimal(GetValue(r, "DurationHours", "SegmentDurationHours")),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        Version = 1
    };

    private SegmentBOM ParseSegmentBOM(Dictionary<string, string> r) => new()
    {
        Id = GetValue(r, "BOMLineID"),
        ProcessSegmentId = GetValue(r, "ProcessSegmentID"),
        MaterialId = GetValue(r, "MaterialID"),
        QtyPerUnit = ParseDecimal(GetValue(r, "MaterialQtyPerUnit")),
        Uom = GetValue(r, "MaterialUoM"),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        Version = 1
    };

    private Plant ParsePlant(Dictionary<string, string> r) => new()
    {
        Id = GetValue(r, "PlantID"),
        Name = GetValue(r, "PlantName"),
        Location = GetValue(r, "Location"),
        Description = GetValue(r, "Description"),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        Version = 1
    };

    private ProductionLine ParseProductionLine(Dictionary<string, string> r) => new()
    {
        Id = GetValue(r, "LineID"),
        PlantId = GetValue(r, "PlantID"),
        Name = GetValue(r, "LineName"),
        Description = GetValue(r, "Description"),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        Version = 1
    };

    private Shift ParseShift(Dictionary<string, string> r) => new()
    {
        Id = GetValue(r, "ShiftID"),
        ShiftNumber = ParseInt(GetValue(r, "ShiftNumber")),
        ShiftName = GetValue(r, "ShiftName"),
        StartTime = GetValue(r, "StartTime"),
        EndTime = GetValue(r, "EndTime"),
        Description = GetValue(r, "Description"),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        Version = 1
    };

    private Crew ParseCrew(Dictionary<string, string> r) => new()
    {
        Id = GetValue(r, "CrewID"),
        CrewName = GetValue(r, "CrewName"),
        PeopleCount = ParseInt(GetValue(r, "PeopleCount")),
        Skills = GetValue(r, "Skills"),
        Description = GetValue(r, "Description"),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        Version = 1
    };

    #endregion
}
