using ISA95DataGenerator.Domain.Entities.MasterData;
using ISA95DataGenerator.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ISA95DataGenerator.API.Controllers;

/// <summary>
/// Master Data CRUD Controller - provides GET/POST/PUT/DELETE operations for all master data entities
/// </summary>
[ApiController]
[Route("api/masterdata")]
public class MasterDataController : ControllerBase
{
    private readonly MigrationDbContext _context;
    private readonly ILogger<MasterDataController> _logger;

    public MasterDataController(MigrationDbContext context, ILogger<MasterDataController> logger)
    {
        _context = context;
        _logger = logger;
    }

    #region Material Classes

    [HttpGet("material-classes")]
    public async Task<IActionResult> GetMaterialClasses()
    {
        var data = await _context.MaterialClasses.OrderBy(x => x.Name).ToListAsync();
        return Ok(data);
    }

    [HttpGet("material-classes/{id}")]
    public async Task<IActionResult> GetMaterialClass(string id)
    {
        var entity = await _context.MaterialClasses.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("material-classes")]
    public async Task<IActionResult> CreateMaterialClass([FromBody] MaterialClass entity)
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
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.MaterialClasses.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("material-classes/{id}")]
    public async Task<IActionResult> UpdateMaterialClass(string id, [FromBody] MaterialClass entity)
    {
        var existing = await _context.MaterialClasses.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.Name = entity.Name;
        existing.Description = entity.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("material-classes/{id}")]
    public async Task<IActionResult> DeleteMaterialClass(string id)
    {
        var entity = await _context.MaterialClasses.FindAsync(id);
        if (entity == null) return NotFound();
        _context.MaterialClasses.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Materials

    [HttpGet("materials")]
    public async Task<IActionResult> GetMaterials()
    {
        var data = await _context.Materials.OrderBy(x => x.Name).ToListAsync();
        return Ok(data);
    }

    [HttpGet("materials/{id}")]
    public async Task<IActionResult> GetMaterial(string id)
    {
        var entity = await _context.Materials.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("materials")]
    public async Task<IActionResult> CreateMaterial([FromBody] Material entity)
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
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.Materials.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("materials/{id}")]
    public async Task<IActionResult> UpdateMaterial(string id, [FromBody] Material entity)
    {
        var existing = await _context.Materials.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.Name = entity.Name;
        existing.ClassId = entity.ClassId;
        existing.ClassName = entity.ClassName;
        existing.DefaultUoM = entity.DefaultUoM;
        existing.Description = entity.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("materials/{id}")]
    public async Task<IActionResult> DeleteMaterial(string id)
    {
        var entity = await _context.Materials.FindAsync(id);
        if (entity == null) return NotFound();
        _context.Materials.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Material Lots

    [HttpGet("material-lots")]
    public async Task<IActionResult> GetMaterialLots()
    {
        var data = await _context.MaterialLots.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("material-lots/{id}")]
    public async Task<IActionResult> GetMaterialLot(string id)
    {
        var entity = await _context.MaterialLots.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("material-lots")]
    public async Task<IActionResult> CreateMaterialLot([FromBody] MaterialLot entity)
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
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.MaterialLots.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("material-lots/{id}")]
    public async Task<IActionResult> UpdateMaterialLot(string id, [FromBody] MaterialLot entity)
    {
        var existing = await _context.MaterialLots.FindAsync(id);
        if (existing == null) return NotFound();
        
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
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("material-lots/{id}")]
    public async Task<IActionResult> DeleteMaterialLot(string id)
    {
        var entity = await _context.MaterialLots.FindAsync(id);
        if (entity == null) return NotFound();
        _context.MaterialLots.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Material Sublots

    [HttpGet("material-sublots")]
    public async Task<IActionResult> GetMaterialSublots()
    {
        var data = await _context.MaterialSublots.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("material-sublots/{id}")]
    public async Task<IActionResult> GetMaterialSublot(string id)
    {
        var entity = await _context.MaterialSublots.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("material-sublots")]
    public async Task<IActionResult> CreateMaterialSublot([FromBody] MaterialSublot entity)
    {
        var existing = await _context.MaterialSublots.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.MaterialLotId = entity.MaterialLotId;
            existing.Quantity = entity.Quantity;
            existing.QuantityUnitOfMeasure = entity.QuantityUnitOfMeasure;
            existing.StorageLocation = entity.StorageLocation;
            existing.Status = entity.Status;
            existing.Disposition = entity.Disposition;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.MaterialSublots.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("material-sublots/{id}")]
    public async Task<IActionResult> UpdateMaterialSublot(string id, [FromBody] MaterialSublot entity)
    {
        var existing = await _context.MaterialSublots.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.MaterialLotId = entity.MaterialLotId;
        existing.Quantity = entity.Quantity;
        existing.QuantityUnitOfMeasure = entity.QuantityUnitOfMeasure;
        existing.StorageLocation = entity.StorageLocation;
        existing.Status = entity.Status;
        existing.Disposition = entity.Disposition;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("material-sublots/{id}")]
    public async Task<IActionResult> DeleteMaterialSublot(string id)
    {
        var entity = await _context.MaterialSublots.FindAsync(id);
        if (entity == null) return NotFound();
        _context.MaterialSublots.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Equipment Classes

    [HttpGet("equipment-classes")]
    public async Task<IActionResult> GetEquipmentClasses()
    {
        var data = await _context.EquipmentClasses.OrderBy(x => x.Name).ToListAsync();
        return Ok(data);
    }

    [HttpGet("equipment-classes/{id}")]
    public async Task<IActionResult> GetEquipmentClass(string id)
    {
        var entity = await _context.EquipmentClasses.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("equipment-classes")]
    public async Task<IActionResult> CreateEquipmentClass([FromBody] EquipmentClass entity)
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
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.EquipmentClasses.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("equipment-classes/{id}")]
    public async Task<IActionResult> UpdateEquipmentClass(string id, [FromBody] EquipmentClass entity)
    {
        var existing = await _context.EquipmentClasses.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.Name = entity.Name;
        existing.Description = entity.Description;
        existing.ParentId = entity.ParentId;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("equipment-classes/{id}")]
    public async Task<IActionResult> DeleteEquipmentClass(string id)
    {
        var entity = await _context.EquipmentClasses.FindAsync(id);
        if (entity == null) return NotFound();
        _context.EquipmentClasses.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Equipment

    [HttpGet("equipment")]
    public async Task<IActionResult> GetEquipment()
    {
        var data = await _context.Equipments.OrderBy(x => x.Name).ToListAsync();
        return Ok(data);
    }

    [HttpGet("equipment/{id}")]
    public async Task<IActionResult> GetEquipmentById(string id)
    {
        var entity = await _context.Equipments.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("equipment")]
    public async Task<IActionResult> CreateEquipment([FromBody] Equipment entity)
    {
        var existing = await _context.Equipments.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.Name = entity.Name;
            existing.ClassId = entity.ClassId;
            existing.ClassName = entity.ClassName;
            existing.Description = entity.Description;
            existing.ProductionLineId = entity.ProductionLineId;
            existing.ParentEquipmentId = entity.ParentEquipmentId;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.Equipments.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("equipment/{id}")]
    public async Task<IActionResult> UpdateEquipment(string id, [FromBody] Equipment entity)
    {
        var existing = await _context.Equipments.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.Name = entity.Name;
        existing.ClassId = entity.ClassId;
        existing.ClassName = entity.ClassName;
        existing.Description = entity.Description;
        existing.ProductionLineId = entity.ProductionLineId;
        existing.ParentEquipmentId = entity.ParentEquipmentId;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("equipment/{id}")]
    public async Task<IActionResult> DeleteEquipment(string id)
    {
        var entity = await _context.Equipments.FindAsync(id);
        if (entity == null) return NotFound();
        _context.Equipments.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Process Segments

    [HttpGet("process-segments")]
    public async Task<IActionResult> GetProcessSegments()
    {
        var data = await _context.ProcessSegments.OrderBy(x => x.Name).ToListAsync();
        return Ok(data);
    }

    [HttpGet("process-segments/{id}")]
    public async Task<IActionResult> GetProcessSegment(string id)
    {
        var entity = await _context.ProcessSegments.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("process-segments")]
    public async Task<IActionResult> CreateProcessSegment([FromBody] ProcessSegment entity)
    {
        var existing = await _context.ProcessSegments.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.ProductMaterialId = entity.ProductMaterialId ?? string.Empty;
            existing.Name = entity.Name;
            existing.Sequence = entity.Sequence;
            existing.DurationHours = entity.DurationHours;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.ProductMaterialId ??= string.Empty;
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.ProcessSegments.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("process-segments/{id}")]
    public async Task<IActionResult> UpdateProcessSegment(string id, [FromBody] ProcessSegment entity)
    {
        var existing = await _context.ProcessSegments.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.ProductMaterialId = entity.ProductMaterialId ?? string.Empty;
        existing.Name = entity.Name;
        existing.Sequence = entity.Sequence;
        existing.DurationHours = entity.DurationHours;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("process-segments/{id}")]
    public async Task<IActionResult> DeleteProcessSegment(string id)
    {
        var entity = await _context.ProcessSegments.FindAsync(id);
        if (entity == null) return NotFound();
        _context.ProcessSegments.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Segment BOMs

    [HttpGet("segment-boms")]
    public async Task<IActionResult> GetSegmentBOMs()
    {
        var data = await _context.SegmentBOMs.OrderBy(x => x.ProcessSegmentId).ToListAsync();
        return Ok(data);
    }

    [HttpGet("segment-boms/{id}")]
    public async Task<IActionResult> GetSegmentBOM(string id)
    {
        var entity = await _context.SegmentBOMs.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("segment-boms")]
    public async Task<IActionResult> CreateSegmentBOM([FromBody] SegmentBOM entity)
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
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.SegmentBOMs.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("segment-boms/{id}")]
    public async Task<IActionResult> UpdateSegmentBOM(string id, [FromBody] SegmentBOM entity)
    {
        var existing = await _context.SegmentBOMs.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.ProcessSegmentId = entity.ProcessSegmentId;
        existing.MaterialId = entity.MaterialId;
        existing.QtyPerUnit = entity.QtyPerUnit;
        existing.Uom = entity.Uom;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("segment-boms/{id}")]
    public async Task<IActionResult> DeleteSegmentBOM(string id)
    {
        var entity = await _context.SegmentBOMs.FindAsync(id);
        if (entity == null) return NotFound();
        _context.SegmentBOMs.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Maintenance BOMs

    [HttpGet("maintenance-boms")]
    public async Task<IActionResult> GetMaintenanceBOMs()
    {
        var data = await _context.MaintenanceBOMs
            .OrderBy(x => x.EquipmentId)
            .ThenBy(x => x.ProcessSegmentId)
            .ThenBy(x => x.MaterialId)
            .ToListAsync();
        return Ok(data);
    }

    [HttpGet("maintenance-boms/{id}")]
    public async Task<IActionResult> GetMaintenanceBOM(string id)
    {
        var entity = await _context.MaintenanceBOMs.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("maintenance-boms")]
    public async Task<IActionResult> CreateMaintenanceBOM([FromBody] MaintenanceBOM entity)
    {
        var segmentSequence = await _context.ProcessSegments
            .Where(ps => ps.Id == entity.ProcessSegmentId)
            .Select(ps => (int?)ps.Sequence)
            .FirstOrDefaultAsync();

        entity.ProcessSegmentSequence = segmentSequence ?? entity.ProcessSegmentSequence;
        entity.PersonQuantityUoM = string.Equals(entity.PersonQuantityUoM, "FTE", StringComparison.OrdinalIgnoreCase) ? "FTE" : "Person";

        var existing = await _context.MaintenanceBOMs.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.EquipmentId = entity.EquipmentId;
            existing.ProcessSegmentId = entity.ProcessSegmentId;
            existing.ProcessSegmentSequence = entity.ProcessSegmentSequence;
            existing.MaterialId = entity.MaterialId;
            existing.QtyPerUnit = entity.QtyPerUnit;
            existing.PersonQuantity = entity.PersonQuantity;
            existing.PersonQuantityUoM = entity.PersonQuantityUoM;
            existing.EmployeeId = entity.EmployeeId;
            existing.PersonClassId = entity.PersonClassId;
            existing.Uom = entity.Uom;
            existing.MaterialUse = entity.MaterialUse;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.MaintenanceBOMs.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("maintenance-boms/{id}")]
    public async Task<IActionResult> UpdateMaintenanceBOM(string id, [FromBody] MaintenanceBOM entity)
    {
        var existing = await _context.MaintenanceBOMs.FindAsync(id);
        if (existing == null) return NotFound();

        var segmentSequence = await _context.ProcessSegments
            .Where(ps => ps.Id == entity.ProcessSegmentId)
            .Select(ps => (int?)ps.Sequence)
            .FirstOrDefaultAsync();

        existing.EquipmentId = entity.EquipmentId;
        existing.ProcessSegmentId = entity.ProcessSegmentId;
        existing.ProcessSegmentSequence = segmentSequence ?? entity.ProcessSegmentSequence;
        existing.MaterialId = entity.MaterialId;
        existing.QtyPerUnit = entity.QtyPerUnit;
        existing.PersonQuantity = entity.PersonQuantity;
        existing.PersonQuantityUoM = string.Equals(entity.PersonQuantityUoM, "FTE", StringComparison.OrdinalIgnoreCase) ? "FTE" : "Person";
        existing.EmployeeId = entity.EmployeeId;
        existing.PersonClassId = entity.PersonClassId;
        existing.Uom = entity.Uom;
        existing.MaterialUse = entity.MaterialUse;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;

        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("maintenance-boms/{id}")]
    public async Task<IActionResult> DeleteMaintenanceBOM(string id)
    {
        var entity = await _context.MaintenanceBOMs.FindAsync(id);
        if (entity == null) return NotFound();
        _context.MaintenanceBOMs.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Plants

    [HttpGet("plants")]
    public async Task<IActionResult> GetPlants()
    {
        var data = await _context.Plants.OrderBy(x => x.Name).ToListAsync();
        return Ok(data);
    }

    [HttpGet("plants/{id}")]
    public async Task<IActionResult> GetPlant(string id)
    {
        var entity = await _context.Plants.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("plants")]
    public async Task<IActionResult> CreatePlant([FromBody] Plant entity)
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
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.Plants.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("plants/{id}")]
    public async Task<IActionResult> UpdatePlant(string id, [FromBody] Plant entity)
    {
        var existing = await _context.Plants.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.Name = entity.Name;
        existing.Location = entity.Location;
        existing.Description = entity.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("plants/{id}")]
    public async Task<IActionResult> DeletePlant(string id)
    {
        var entity = await _context.Plants.FindAsync(id);
        if (entity == null) return NotFound();
        _context.Plants.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Production Lines

    [HttpGet("production-lines")]
    public async Task<IActionResult> GetProductionLines()
    {
        var data = await _context.ProductionLines.OrderBy(x => x.Name).ToListAsync();
        return Ok(data);
    }

    [HttpGet("production-lines/{id}")]
    public async Task<IActionResult> GetProductionLine(string id)
    {
        var entity = await _context.ProductionLines.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("production-lines")]
    public async Task<IActionResult> CreateProductionLine([FromBody] ProductionLine entity)
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
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.ProductionLines.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("production-lines/{id}")]
    public async Task<IActionResult> UpdateProductionLine(string id, [FromBody] ProductionLine entity)
    {
        var existing = await _context.ProductionLines.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.PlantId = entity.PlantId;
        existing.Name = entity.Name;
        existing.Description = entity.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("production-lines/{id}")]
    public async Task<IActionResult> DeleteProductionLine(string id)
    {
        var entity = await _context.ProductionLines.FindAsync(id);
        if (entity == null) return NotFound();
        _context.ProductionLines.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Shifts

    [HttpGet("shifts")]
    public async Task<IActionResult> GetShifts()
    {
        var data = await _context.Shifts.OrderBy(x => x.ShiftNumber).ToListAsync();
        return Ok(data);
    }

    [HttpGet("shifts/{id}")]
    public async Task<IActionResult> GetShift(string id)
    {
        var entity = await _context.Shifts.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("shifts")]
    public async Task<IActionResult> CreateShift([FromBody] Shift entity)
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
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.Shifts.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("shifts/{id}")]
    public async Task<IActionResult> UpdateShift(string id, [FromBody] Shift entity)
    {
        var existing = await _context.Shifts.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.ShiftNumber = entity.ShiftNumber;
        existing.ShiftName = entity.ShiftName;
        existing.StartTime = entity.StartTime;
        existing.EndTime = entity.EndTime;
        existing.Description = entity.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("shifts/{id}")]
    public async Task<IActionResult> DeleteShift(string id)
    {
        var entity = await _context.Shifts.FindAsync(id);
        if (entity == null) return NotFound();
        _context.Shifts.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Crews

    [HttpGet("crews")]
    public async Task<IActionResult> GetCrews()
    {
        var data = await _context.Crews.OrderBy(x => x.CrewName).ToListAsync();
        return Ok(data);
    }

    [HttpGet("crews/{id}")]
    public async Task<IActionResult> GetCrew(string id)
    {
        var entity = await _context.Crews.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("crews")]
    public async Task<IActionResult> CreateCrew([FromBody] Crew entity)
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
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.Crews.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("crews/{id}")]
    public async Task<IActionResult> UpdateCrew(string id, [FromBody] Crew entity)
    {
        var existing = await _context.Crews.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.CrewName = entity.CrewName;
        existing.PeopleCount = entity.PeopleCount;
        existing.Skills = entity.Skills;
        existing.Description = entity.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("crews/{id}")]
    public async Task<IActionResult> DeleteCrew(string id)
    {
        var entity = await _context.Crews.FindAsync(id);
        if (entity == null) return NotFound();
        _context.Crews.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Person Classes

    [HttpGet("person-classes")]
    public async Task<IActionResult> GetPersonClasses()
    {
        var data = await _context.PersonClasses.OrderBy(x => x.Name).ToListAsync();
        return Ok(data);
    }

    [HttpGet("person-classes/{id}")]
    public async Task<IActionResult> GetPersonClass(string id)
    {
        var entity = await _context.PersonClasses.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("person-classes")]
    public async Task<IActionResult> CreatePersonClass([FromBody] PersonClass entity)
    {
        var existing = await _context.PersonClasses.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.Name = entity.Name;
            existing.Description = entity.Description;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.PersonClasses.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("person-classes/{id}")]
    public async Task<IActionResult> UpdatePersonClass(string id, [FromBody] PersonClass entity)
    {
        var existing = await _context.PersonClasses.FindAsync(id);
        if (existing == null) return NotFound();

        existing.Name = entity.Name;
        existing.Description = entity.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;

        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("person-classes/{id}")]
    public async Task<IActionResult> DeletePersonClass(string id)
    {
        var entity = await _context.PersonClasses.FindAsync(id);
        if (entity == null) return NotFound();
        _context.PersonClasses.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Personnel Capabilities

    [HttpGet("personnel-capabilities")]
    public async Task<IActionResult> GetPersonnelCapabilities()
    {
        var data = await _context.PersonnelCapabilities.OrderBy(x => x.CapabilityName).ToListAsync();
        return Ok(data);
    }

    [HttpGet("personnel-capabilities/{id}")]
    public async Task<IActionResult> GetPersonnelCapability(string id)
    {
        var entity = await _context.PersonnelCapabilities.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("personnel-capabilities")]
    public async Task<IActionResult> CreatePersonnelCapability([FromBody] PersonnelCapability entity)
    {
        var existing = await _context.PersonnelCapabilities.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.CapabilityName = entity.CapabilityName;
            existing.Description = entity.Description;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.PersonnelCapabilities.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("personnel-capabilities/{id}")]
    public async Task<IActionResult> UpdatePersonnelCapability(string id, [FromBody] PersonnelCapability entity)
    {
        var existing = await _context.PersonnelCapabilities.FindAsync(id);
        if (existing == null) return NotFound();

        existing.CapabilityName = entity.CapabilityName;
        existing.Description = entity.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;

        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("personnel-capabilities/{id}")]
    public async Task<IActionResult> DeletePersonnelCapability(string id)
    {
        var entity = await _context.PersonnelCapabilities.FindAsync(id);
        if (entity == null) return NotFound();
        _context.PersonnelCapabilities.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Employees

    [HttpGet("employees")]
    public async Task<IActionResult> GetEmployees()
    {
        var data = await _context.Employees.OrderBy(x => x.EmployeeName).ToListAsync();
        return Ok(data);
    }

    [HttpGet("employees/{id}")]
    public async Task<IActionResult> GetEmployee(string id)
    {
        var entity = await _context.Employees.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("employees")]
    public async Task<IActionResult> CreateEmployee([FromBody] Employee entity)
    {
        var existing = await _context.Employees.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.EmployeeName = entity.EmployeeName;
            existing.PersonClassId = entity.PersonClassId;
            existing.PersonnelCapabilityId = entity.PersonnelCapabilityId;
            existing.Email = entity.Email;
            existing.PhoneNumber = entity.PhoneNumber;
            existing.Description = entity.Description;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.Employees.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("employees/{id}")]
    public async Task<IActionResult> UpdateEmployee(string id, [FromBody] Employee entity)
    {
        var existing = await _context.Employees.FindAsync(id);
        if (existing == null) return NotFound();

        existing.EmployeeName = entity.EmployeeName;
        existing.PersonClassId = entity.PersonClassId;
        existing.PersonnelCapabilityId = entity.PersonnelCapabilityId;
        existing.Email = entity.Email;
        existing.PhoneNumber = entity.PhoneNumber;
        existing.Description = entity.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;

        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("employees/{id}")]
    public async Task<IActionResult> DeleteEmployee(string id)
    {
        var entity = await _context.Employees.FindAsync(id);
        if (entity == null) return NotFound();
        _context.Employees.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Operation Event Definitions

    [HttpGet("operation-event-definitions")]
    public async Task<IActionResult> GetOperationEventDefinitions()
    {
        var data = await _context.OperationEventDefinitions.OrderBy(x => x.EventCode).ToListAsync();
        return Ok(data);
    }

    [HttpGet("operation-event-definitions/{id}")]
    public async Task<IActionResult> GetOperationEventDefinition(string id)
    {
        var entity = await _context.OperationEventDefinitions.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("operation-event-definitions")]
    public async Task<IActionResult> CreateOperationEventDefinition([FromBody] OperationEventDefinition entity)
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
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.OperationEventDefinitions.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("operation-event-definitions/{id}")]
    public async Task<IActionResult> UpdateOperationEventDefinition(string id, [FromBody] OperationEventDefinition entity)
    {
        var existing = await _context.OperationEventDefinitions.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.EventCategory = entity.EventCategory;
        existing.EventCode = entity.EventCode;
        existing.Description = entity.Description;
        existing.CausesDowntime = entity.CausesDowntime;
        existing.CausesScrap = entity.CausesScrap;
        existing.RootCauseType = entity.RootCauseType;
        existing.EventType = entity.EventType;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("operation-event-definitions/{id}")]
    public async Task<IActionResult> DeleteOperationEventDefinition(string id)
    {
        var entity = await _context.OperationEventDefinitions.FindAsync(id);
        if (entity == null) return NotFound();
        _context.OperationEventDefinitions.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Hierarchy Scopes

    [HttpGet("hierarchy-scopes")]
    public async Task<IActionResult> GetHierarchyScopes()
    {
        var data = await _context.HierarchyScopes.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("hierarchy-scopes/{id}")]
    public async Task<IActionResult> GetHierarchyScope(string id)
    {
        var entity = await _context.HierarchyScopes.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("hierarchy-scopes")]
    public async Task<IActionResult> CreateHierarchyScope([FromBody] HierarchyScope entity)
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
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.HierarchyScopes.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("hierarchy-scopes/{id}")]
    public async Task<IActionResult> UpdateHierarchyScope(string id, [FromBody] HierarchyScope entity)
    {
        var existing = await _context.HierarchyScopes.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.EquipmentID = entity.EquipmentID;
        existing.EquipmentLevel = entity.EquipmentLevel;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("hierarchy-scopes/{id}")]
    public async Task<IActionResult> DeleteHierarchyScope(string id)
    {
        var entity = await _context.HierarchyScopes.FindAsync(id);
        if (entity == null) return NotFound();
        _context.HierarchyScopes.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Equipment Class Properties

    [HttpGet("equipment-class-properties")]
    public async Task<IActionResult> GetEquipmentClassProperties()
    {
        var data = await _context.EquipmentClassProperties.OrderBy(x => x.PropertyName).ToListAsync();
        return Ok(data);
    }

    [HttpGet("equipment-class-properties/{id}")]
    public async Task<IActionResult> GetEquipmentClassProperty(string id)
    {
        var entity = await _context.EquipmentClassProperties.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("equipment-class-properties")]
    public async Task<IActionResult> CreateEquipmentClassProperty([FromBody] EquipmentClassProperty entity)
    {
        var existing = await _context.EquipmentClassProperties.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.EquipmentClassId = entity.EquipmentClassId;
            existing.PropertyName = entity.PropertyName;
            existing.ValueDataType = entity.ValueDataType;
            existing.Unit = entity.Unit;
            existing.MinValue = entity.MinValue;
            existing.MaxValue = entity.MaxValue;
            existing.Description = entity.Description;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.EquipmentClassProperties.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("equipment-class-properties/{id}")]
    public async Task<IActionResult> UpdateEquipmentClassProperty(string id, [FromBody] EquipmentClassProperty entity)
    {
        var existing = await _context.EquipmentClassProperties.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.EquipmentClassId = entity.EquipmentClassId;
        existing.PropertyName = entity.PropertyName;
        existing.ValueDataType = entity.ValueDataType;
        existing.Unit = entity.Unit;
        existing.MinValue = entity.MinValue;
        existing.MaxValue = entity.MaxValue;
        existing.Description = entity.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("equipment-class-properties/{id}")]
    public async Task<IActionResult> DeleteEquipmentClassProperty(string id)
    {
        var entity = await _context.EquipmentClassProperties.FindAsync(id);
        if (entity == null) return NotFound();
        _context.EquipmentClassProperties.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Equipment Class Property Assignments

    [HttpGet("equipment-class-property-assignments")]
    public async Task<IActionResult> GetEquipmentClassPropertyAssignments()
    {
        var data = await _context.EquipmentClassPropertyAssignments.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("equipment-class-property-assignments/{id}")]
    public async Task<IActionResult> GetEquipmentClassPropertyAssignment(string id)
    {
        var entity = await _context.EquipmentClassPropertyAssignments.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("equipment-class-property-assignments")]
    public async Task<IActionResult> CreateEquipmentClassPropertyAssignment([FromBody] EquipmentClassPropertyAssignment entity)
    {
        var existing = await _context.EquipmentClassPropertyAssignments.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.EquipmentClassPropertyId = entity.EquipmentClassPropertyId;
            existing.EquipmentPropertyId = entity.EquipmentPropertyId;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.EquipmentClassPropertyAssignments.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("equipment-class-property-assignments/{id}")]
    public async Task<IActionResult> UpdateEquipmentClassPropertyAssignment(string id, [FromBody] EquipmentClassPropertyAssignment entity)
    {
        var existing = await _context.EquipmentClassPropertyAssignments.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.EquipmentClassPropertyId = entity.EquipmentClassPropertyId;
        existing.EquipmentPropertyId = entity.EquipmentPropertyId;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("equipment-class-property-assignments/{id}")]
    public async Task<IActionResult> DeleteEquipmentClassPropertyAssignment(string id)
    {
        var entity = await _context.EquipmentClassPropertyAssignments.FindAsync(id);
        if (entity == null) return NotFound();
        _context.EquipmentClassPropertyAssignments.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Equipment Properties

    [HttpGet("equipment-properties")]
    public async Task<IActionResult> GetEquipmentProperties()
    {
        var data = await _context.EquipmentProperties.OrderBy(x => x.Name).ToListAsync();
        return Ok(data);
    }

    [HttpGet("equipment-properties/{id}")]
    public async Task<IActionResult> GetEquipmentProperty(string id)
    {
        var entity = await _context.EquipmentProperties.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("equipment-properties")]
    public async Task<IActionResult> CreateEquipmentProperty([FromBody] EquipmentProperty entity)
    {
        var existing = await _context.EquipmentProperties.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.Name = entity.Name;
            existing.ValueDataType = entity.ValueDataType;
            existing.Unit = entity.Unit;
            existing.MinValue = entity.MinValue;
            existing.MaxValue = entity.MaxValue;
            existing.Description = entity.Description;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.EquipmentProperties.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("equipment-properties/{id}")]
    public async Task<IActionResult> UpdateEquipmentProperty(string id, [FromBody] EquipmentProperty entity)
    {
        var existing = await _context.EquipmentProperties.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.Name = entity.Name;
        existing.ValueDataType = entity.ValueDataType;
        existing.Unit = entity.Unit;
        existing.MinValue = entity.MinValue;
        existing.MaxValue = entity.MaxValue;
        existing.Description = entity.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("equipment-properties/{id}")]
    public async Task<IActionResult> DeleteEquipmentProperty(string id)
    {
        var entity = await _context.EquipmentProperties.FindAsync(id);
        if (entity == null) return NotFound();
        _context.EquipmentProperties.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Equipment Property Assignments

    [HttpGet("equipment-property-assignments")]
    public async Task<IActionResult> GetEquipmentPropertyAssignments()
    {
        var data = await _context.EquipmentPropertyAssignments.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("equipment-property-assignments/{id}")]
    public async Task<IActionResult> GetEquipmentPropertyAssignment(string id)
    {
        var entity = await _context.EquipmentPropertyAssignments.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("equipment-property-assignments")]
    public async Task<IActionResult> CreateEquipmentPropertyAssignment([FromBody] EquipmentPropertyAssignment entity)
    {
        var existing = await _context.EquipmentPropertyAssignments.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.EquipmentId = entity.EquipmentId;
            existing.ProcessSegmentId = entity.ProcessSegmentId;
            existing.EquipmentPropertyId = entity.EquipmentPropertyId;
            existing.SamplingMode = entity.SamplingMode;
            existing.SamplingIntervalSeconds = entity.SamplingIntervalSeconds;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.EquipmentPropertyAssignments.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("equipment-property-assignments/{id}")]
    public async Task<IActionResult> UpdateEquipmentPropertyAssignment(string id, [FromBody] EquipmentPropertyAssignment entity)
    {
        var existing = await _context.EquipmentPropertyAssignments.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.EquipmentId = entity.EquipmentId;
        existing.ProcessSegmentId = entity.ProcessSegmentId;
        existing.EquipmentPropertyId = entity.EquipmentPropertyId;
        existing.SamplingMode = entity.SamplingMode;
        existing.SamplingIntervalSeconds = entity.SamplingIntervalSeconds;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("equipment-property-assignments/{id}")]
    public async Task<IActionResult> DeleteEquipmentPropertyAssignment(string id)
    {
        var entity = await _context.EquipmentPropertyAssignments.FindAsync(id);
        if (entity == null) return NotFound();
        _context.EquipmentPropertyAssignments.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Equipment Usages

    [HttpGet("equipment-usages")]
    public async Task<IActionResult> GetEquipmentUsages()
    {
        var data = await _context.EquipmentUsages.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("equipment-usages/{id}")]
    public async Task<IActionResult> GetEquipmentUsage(string id)
    {
        var entity = await _context.EquipmentUsages.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("equipment-usages")]
    public async Task<IActionResult> CreateEquipmentUsage([FromBody] EquipmentUsage entity)
    {
        var existing = await _context.EquipmentUsages.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.ProcessSegmentId = entity.ProcessSegmentId;
            existing.EquipmentId = entity.EquipmentId;
            existing.Role = entity.Role;
            existing.CapacityPerRun = entity.CapacityPerRun;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.EquipmentUsages.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("equipment-usages/{id}")]
    public async Task<IActionResult> UpdateEquipmentUsage(string id, [FromBody] EquipmentUsage entity)
    {
        var existing = await _context.EquipmentUsages.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.ProcessSegmentId = entity.ProcessSegmentId;
        existing.EquipmentId = entity.EquipmentId;
        existing.Role = entity.Role;
        existing.CapacityPerRun = entity.CapacityPerRun;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("equipment-usages/{id}")]
    public async Task<IActionResult> DeleteEquipmentUsage(string id)
    {
        var entity = await _context.EquipmentUsages.FindAsync(id);
        if (entity == null) return NotFound();
        _context.EquipmentUsages.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Line Equipment

    [HttpGet("line-equipment")]
    public async Task<IActionResult> GetLineEquipments()
    {
        var data = await _context.LineEquipments.OrderBy(x => x.Sequence).ToListAsync();
        return Ok(data);
    }

    [HttpGet("line-equipment/{id}")]
    public async Task<IActionResult> GetLineEquipment(string id)
    {
        var entity = await _context.LineEquipments.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("line-equipment")]
    public async Task<IActionResult> CreateLineEquipment([FromBody] LineEquipment entity)
    {
        var existing = await _context.LineEquipments.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.ProductionLineId = entity.ProductionLineId;
            existing.EquipmentId = entity.EquipmentId;
            existing.Sequence = entity.Sequence;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.LineEquipments.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("line-equipment/{id}")]
    public async Task<IActionResult> UpdateLineEquipment(string id, [FromBody] LineEquipment entity)
    {
        var existing = await _context.LineEquipments.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.ProductionLineId = entity.ProductionLineId;
        existing.EquipmentId = entity.EquipmentId;
        existing.Sequence = entity.Sequence;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("line-equipment/{id}")]
    public async Task<IActionResult> DeleteLineEquipment(string id)
    {
        var entity = await _context.LineEquipments.FindAsync(id);
        if (entity == null) return NotFound();
        _context.LineEquipments.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Material Class Properties

    [HttpGet("material-class-properties")]
    public async Task<IActionResult> GetMaterialClassProperties()
    {
        var data = await _context.MaterialClassProperties.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("material-class-properties/{id}")]
    public async Task<IActionResult> GetMaterialClassProperty(string id)
    {
        var entity = await _context.MaterialClassProperties.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("material-class-properties")]
    public async Task<IActionResult> CreateMaterialClassProperty([FromBody] MaterialClassProperty entity)
    {
        var existing = await _context.MaterialClassProperties.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.PropertyName = entity.PropertyName;
            existing.Description = entity.Description;
            existing.ValueDataType = entity.ValueDataType;
            existing.Unit = entity.Unit;
            existing.MinValue = entity.MinValue;
            existing.MaxValue = entity.MaxValue;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.MaterialClassProperties.Add(entity);
        }

        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("material-class-properties/{id}")]
    public async Task<IActionResult> UpdateMaterialClassProperty(string id, [FromBody] MaterialClassProperty entity)
    {
        var existing = await _context.MaterialClassProperties.FindAsync(id);
        if (existing == null) return NotFound();

        existing.PropertyName = entity.PropertyName;
        existing.Description = entity.Description;
        existing.ValueDataType = entity.ValueDataType;
        existing.Unit = entity.Unit;
        existing.MinValue = entity.MinValue;
        existing.MaxValue = entity.MaxValue;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;

        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("material-class-properties/{id}")]
    public async Task<IActionResult> DeleteMaterialClassProperty(string id)
    {
        var entity = await _context.MaterialClassProperties.FindAsync(id);
        if (entity == null) return NotFound();
        _context.MaterialClassProperties.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Material Class Property Assignments

    [HttpGet("material-class-property-assignments")]
    public async Task<IActionResult> GetMaterialClassPropertyAssignments()
    {
        var data = await _context.MaterialClassPropertyAssignments.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("material-class-property-assignments/{id}")]
    public async Task<IActionResult> GetMaterialClassPropertyAssignment(string id)
    {
        var entity = await _context.MaterialClassPropertyAssignments.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("material-class-property-assignments")]
    public async Task<IActionResult> CreateMaterialClassPropertyAssignment([FromBody] MaterialClassPropertyAssignment entity)
    {
        var existing = await _context.MaterialClassPropertyAssignments.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.MaterialClassPropertyId = entity.MaterialClassPropertyId;
            existing.MaterialDefinitionPropertyId = entity.MaterialDefinitionPropertyId;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.MaterialClassPropertyAssignments.Add(entity);
        }

        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("material-class-property-assignments/{id}")]
    public async Task<IActionResult> UpdateMaterialClassPropertyAssignment(string id, [FromBody] MaterialClassPropertyAssignment entity)
    {
        var existing = await _context.MaterialClassPropertyAssignments.FindAsync(id);
        if (existing == null) return NotFound();

        existing.MaterialClassPropertyId = entity.MaterialClassPropertyId;
        existing.MaterialDefinitionPropertyId = entity.MaterialDefinitionPropertyId;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;

        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("material-class-property-assignments/{id}")]
    public async Task<IActionResult> DeleteMaterialClassPropertyAssignment(string id)
    {
        var entity = await _context.MaterialClassPropertyAssignments.FindAsync(id);
        if (entity == null) return NotFound();
        _context.MaterialClassPropertyAssignments.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Material Definition Properties

    [HttpGet("material-definition-properties")]
    public async Task<IActionResult> GetMaterialDefinitionProperties()
    {
        var data = await _context.MaterialDefinitionProperties.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("material-definition-properties/{id}")]
    public async Task<IActionResult> GetMaterialDefinitionProperty(string id)
    {
        var entity = await _context.MaterialDefinitionProperties.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("material-definition-properties")]
    public async Task<IActionResult> CreateMaterialDefinitionProperty([FromBody] MaterialDefinitionProperty entity)
    {
        var existing = await _context.MaterialDefinitionProperties.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.Value = entity.Value;
            existing.Description = entity.Description;
            existing.ValueUnitOfMeasure = entity.ValueUnitOfMeasure;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.MaterialDefinitionProperties.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("material-definition-properties/{id}")]
    public async Task<IActionResult> UpdateMaterialDefinitionProperty(string id, [FromBody] MaterialDefinitionProperty entity)
    {
        var existing = await _context.MaterialDefinitionProperties.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.Value = entity.Value;
        existing.Description = entity.Description;
        existing.ValueUnitOfMeasure = entity.ValueUnitOfMeasure;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("material-definition-properties/{id}")]
    public async Task<IActionResult> DeleteMaterialDefinitionProperty(string id)
    {
        var entity = await _context.MaterialDefinitionProperties.FindAsync(id);
        if (entity == null) return NotFound();
        _context.MaterialDefinitionProperties.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Material Definition Property Assignments

    [HttpGet("material-definition-property-assignments")]
    public async Task<IActionResult> GetMaterialDefinitionPropertyAssignments()
    {
        var data = await _context.MaterialDefinitionPropertyAssignments.OrderBy(x => x.Pk).ToListAsync();
        return Ok(data);
    }

    [HttpGet("material-definition-property-assignments/{pk}")]
    public async Task<IActionResult> GetMaterialDefinitionPropertyAssignment(string pk)
    {
        var entity = await _context.MaterialDefinitionPropertyAssignments.FindAsync(pk);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("material-definition-property-assignments")]
    public async Task<IActionResult> CreateMaterialDefinitionPropertyAssignment([FromBody] MaterialDefinitionPropertyAssignment entity)
    {
        var existing = await _context.MaterialDefinitionPropertyAssignments.FindAsync(entity.Pk);
        if (existing != null)
        {
            existing.Id = entity.Id;
            existing.MaterialDefinitionPropertyId = entity.MaterialDefinitionPropertyId;
            existing.MaterialDefinitionId = entity.MaterialDefinitionId;
            existing.Value = entity.Value;
            existing.Description = entity.Description;
            existing.ValueUnitOfMeasure = entity.ValueUnitOfMeasure;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.MaterialDefinitionPropertyAssignments.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("material-definition-property-assignments/{pk}")]
    public async Task<IActionResult> UpdateMaterialDefinitionPropertyAssignment(string pk, [FromBody] MaterialDefinitionPropertyAssignment entity)
    {
        var existing = await _context.MaterialDefinitionPropertyAssignments.FindAsync(pk);
        if (existing == null) return NotFound();
        
        existing.Id = entity.Id;
        existing.MaterialDefinitionPropertyId = entity.MaterialDefinitionPropertyId;
        existing.MaterialDefinitionId = entity.MaterialDefinitionId;
        existing.Value = entity.Value;
        existing.Description = entity.Description;
        existing.ValueUnitOfMeasure = entity.ValueUnitOfMeasure;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("material-definition-property-assignments/{pk}")]
    public async Task<IActionResult> DeleteMaterialDefinitionPropertyAssignment(string pk)
    {
        var entity = await _context.MaterialDefinitionPropertyAssignments.FindAsync(pk);
        if (entity == null) return NotFound();
        _context.MaterialDefinitionPropertyAssignments.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Shift Crew Assignments

    [HttpGet("shift-crew-assignments")]
    public async Task<IActionResult> GetShiftCrewAssignments()
    {
        var data = await _context.ShiftCrewAssignments.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("shift-crew-assignments/{id}")]
    public async Task<IActionResult> GetShiftCrewAssignment(string id)
    {
        var entity = await _context.ShiftCrewAssignments.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("shift-crew-assignments")]
    public async Task<IActionResult> CreateShiftCrewAssignment([FromBody] ShiftCrewAssignment entity)
    {
        var existing = await _context.ShiftCrewAssignments.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.ShiftId = entity.ShiftId;
            existing.CrewId = entity.CrewId;
            existing.EffectiveDate = entity.EffectiveDate;
            existing.ExpiryDate = entity.ExpiryDate;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.ShiftCrewAssignments.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("shift-crew-assignments/{id}")]
    public async Task<IActionResult> UpdateShiftCrewAssignment(string id, [FromBody] ShiftCrewAssignment entity)
    {
        var existing = await _context.ShiftCrewAssignments.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.ShiftId = entity.ShiftId;
        existing.CrewId = entity.CrewId;
        existing.EffectiveDate = entity.EffectiveDate;
        existing.ExpiryDate = entity.ExpiryDate;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("shift-crew-assignments/{id}")]
    public async Task<IActionResult> DeleteShiftCrewAssignment(string id)
    {
        var entity = await _context.ShiftCrewAssignments.FindAsync(id);
        if (entity == null) return NotFound();
        _context.ShiftCrewAssignments.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Operation Event Definition Properties

    [HttpGet("operation-event-definition-properties")]
    public async Task<IActionResult> GetOperationEventDefinitionProperties()
    {
        var data = await _context.OperationEventDefinitionProperties.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("operation-event-definition-properties/{id}")]
    public async Task<IActionResult> GetOperationEventDefinitionPropertyItem(string id)
    {
        var entity = await _context.OperationEventDefinitionProperties.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("operation-event-definition-properties")]
    public async Task<IActionResult> CreateOperationEventDefinitionProperty([FromBody] OperationEventDefinitionProperty entity)
    {
        var existing = await _context.OperationEventDefinitionProperties.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.PossibleValues = entity.PossibleValues;
            existing.ValueUnitOfMeasure = entity.ValueUnitOfMeasure;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.OperationEventDefinitionProperties.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("operation-event-definition-properties/{id}")]
    public async Task<IActionResult> UpdateOperationEventDefinitionProperty(string id, [FromBody] OperationEventDefinitionProperty entity)
    {
        var existing = await _context.OperationEventDefinitionProperties.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.PossibleValues = entity.PossibleValues;
        existing.ValueUnitOfMeasure = entity.ValueUnitOfMeasure;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("operation-event-definition-properties/{id}")]
    public async Task<IActionResult> DeleteOperationEventDefinitionProperty(string id)
    {
        var entity = await _context.OperationEventDefinitionProperties.FindAsync(id);
        if (entity == null) return NotFound();
        _context.OperationEventDefinitionProperties.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Operation Event Definition Property Assignments

    [HttpGet("operation-event-definition-property-assignments")]
    public async Task<IActionResult> GetOperationEventDefinitionPropertyAssignments()
    {
        var data = await _context.OperationEventDefinitionPropertyAssignments.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("operation-event-definition-property-assignments/{id}")]
    public async Task<IActionResult> GetOperationEventDefinitionPropertyAssignment(string id)
    {
        var entity = await _context.OperationEventDefinitionPropertyAssignments.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("operation-event-definition-property-assignments")]
    public async Task<IActionResult> CreateOperationEventDefinitionPropertyAssignment([FromBody] OperationEventDefinitionPropertyAssignment entity)
    {
        var existing = await _context.OperationEventDefinitionPropertyAssignments.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.OperationsEventDefinitionId = entity.OperationsEventDefinitionId;
            existing.OperationsEventDefinitionPropertyId = entity.OperationsEventDefinitionPropertyId;
            existing.Value = entity.Value;
            existing.ValueUnitOfMeasure = entity.ValueUnitOfMeasure;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.OperationEventDefinitionPropertyAssignments.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("operation-event-definition-property-assignments/{id}")]
    public async Task<IActionResult> UpdateOperationEventDefinitionPropertyAssignment(string id, [FromBody] OperationEventDefinitionPropertyAssignment entity)
    {
        var existing = await _context.OperationEventDefinitionPropertyAssignments.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.OperationsEventDefinitionId = entity.OperationsEventDefinitionId;
        existing.OperationsEventDefinitionPropertyId = entity.OperationsEventDefinitionPropertyId;
        existing.Value = entity.Value;
        existing.ValueUnitOfMeasure = entity.ValueUnitOfMeasure;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("operation-event-definition-property-assignments/{id}")]
    public async Task<IActionResult> DeleteOperationEventDefinitionPropertyAssignment(string id)
    {
        var entity = await _context.OperationEventDefinitionPropertyAssignments.FindAsync(id);
        if (entity == null) return NotFound();
        _context.OperationEventDefinitionPropertyAssignments.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Operation Event Def Segment Assignments

    [HttpGet("operation-event-def-segment-assignments")]
    public async Task<IActionResult> GetOperationEventDefSegmentAssignments()
    {
        var data = await _context.OperationEventDefSegmentAssignments.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("operation-event-def-segment-assignments/{id}")]
    public async Task<IActionResult> GetOperationEventDefSegmentAssignment(string id)
    {
        var entity = await _context.OperationEventDefSegmentAssignments.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("operation-event-def-segment-assignments")]
    public async Task<IActionResult> CreateOperationEventDefSegmentAssignment([FromBody] OperationEventDefSegmentAssignment entity)
    {
        var existing = await _context.OperationEventDefSegmentAssignments.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.OperationsEventDefinitionId = entity.OperationsEventDefinitionId;
            existing.ProcessSegmentId = entity.ProcessSegmentId;
            existing.StartOrEndEvent = entity.StartOrEndEvent;
            existing.IsMandatory = entity.IsMandatory;
            existing.IsPrimarySegment = entity.IsPrimarySegment;
            existing.Notes = entity.Notes;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.OperationEventDefSegmentAssignments.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("operation-event-def-segment-assignments/{id}")]
    public async Task<IActionResult> UpdateOperationEventDefSegmentAssignment(string id, [FromBody] OperationEventDefSegmentAssignment entity)
    {
        var existing = await _context.OperationEventDefSegmentAssignments.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.OperationsEventDefinitionId = entity.OperationsEventDefinitionId;
        existing.ProcessSegmentId = entity.ProcessSegmentId;
        existing.StartOrEndEvent = entity.StartOrEndEvent;
        existing.IsMandatory = entity.IsMandatory;
        existing.IsPrimarySegment = entity.IsPrimarySegment;
        existing.Notes = entity.Notes;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("operation-event-def-segment-assignments/{id}")]
    public async Task<IActionResult> DeleteOperationEventDefSegmentAssignment(string id)
    {
        var entity = await _context.OperationEventDefSegmentAssignments.FindAsync(id);
        if (entity == null) return NotFound();
        _context.OperationEventDefSegmentAssignments.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Operations Event Classes

    [HttpGet("operations-event-classes")]
    public async Task<IActionResult> GetOperationsEventClasses()
    {
        var data = await _context.OperationsEventClasses.OrderBy(x => x.ClassName).ToListAsync();
        return Ok(data);
    }

    [HttpGet("operations-event-classes/{id}")]
    public async Task<IActionResult> GetOperationsEventClass(string id)
    {
        var entity = await _context.OperationsEventClasses.FirstOrDefaultAsync(x => x.OperationsEventClassID == id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("operations-event-classes")]
    public async Task<IActionResult> CreateOperationsEventClass([FromBody] OperationsEventClass entity)
    {
        var existing = await _context.OperationsEventClasses.FirstOrDefaultAsync(x => x.OperationsEventClassID == entity.OperationsEventClassID);
        if (existing != null)
        {
            existing.ClassName = entity.ClassName;
            existing.Description = entity.Description;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.OperationsEventClasses.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("operations-event-classes/{id}")]
    public async Task<IActionResult> UpdateOperationsEventClass(string id, [FromBody] OperationsEventClass entity)
    {
        var existing = await _context.OperationsEventClasses.FirstOrDefaultAsync(x => x.OperationsEventClassID == id);
        if (existing == null) return NotFound();
        
        existing.ClassName = entity.ClassName;
        existing.Description = entity.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("operations-event-classes/{id}")]
    public async Task<IActionResult> DeleteOperationsEventClass(string id)
    {
        var entity = await _context.OperationsEventClasses.FirstOrDefaultAsync(x => x.OperationsEventClassID == id);
        if (entity == null) return NotFound();
        _context.OperationsEventClasses.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Operations Event Records

    [HttpGet("operations-event-records")]
    public async Task<IActionResult> GetOperationsEventRecords()
    {
        var data = await _context.OperationsEventRecords.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("operations-event-records/{id}")]
    public async Task<IActionResult> GetOperationsEventRecord(string id)
    {
        var entity = await _context.OperationsEventRecords.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("operations-event-records")]
    public async Task<IActionResult> CreateOperationsEventRecord([FromBody] OperationsEventRecord entity)
    {
        var existing = await _context.OperationsEventRecords.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.OperationsEventRecordID = entity.OperationsEventRecordID;
            existing.OperationsEventDefinitionID = entity.OperationsEventDefinitionID;
            existing.Severity = entity.Severity;
            existing.Status = entity.Status;
            existing.Comments = entity.Comments;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.OperationsEventRecords.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("operations-event-records/{id}")]
    public async Task<IActionResult> UpdateOperationsEventRecord(string id, [FromBody] OperationsEventRecord entity)
    {
        var existing = await _context.OperationsEventRecords.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.OperationsEventRecordID = entity.OperationsEventRecordID;
        existing.OperationsEventDefinitionID = entity.OperationsEventDefinitionID;
        existing.Severity = entity.Severity;
        existing.Status = entity.Status;
        existing.Comments = entity.Comments;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("operations-event-records/{id}")]
    public async Task<IActionResult> DeleteOperationsEventRecord(string id)
    {
        var entity = await _context.OperationsEventRecords.FindAsync(id);
        if (entity == null) return NotFound();
        _context.OperationsEventRecords.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Operations Event Entries

    [HttpGet("operations-event-entries")]
    public async Task<IActionResult> GetOperationsEventEntries()
    {
        var data = await _context.OperationsEventEntries.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("operations-event-entries/{id}")]
    public async Task<IActionResult> GetOperationsEventEntry(string id)
    {
        var entity = await _context.OperationsEventEntries.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("operations-event-entries")]
    public async Task<IActionResult> CreateOperationsEventEntry([FromBody] OperationsEventEntry entity)
    {
        var existing = await _context.OperationsEventEntries.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.OperationsEventEntryID = entity.OperationsEventEntryID;
            existing.OperationsEventRecordID = entity.OperationsEventRecordID;
            existing.EntryType = entity.EntryType;
            existing.Description = entity.Description;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.OperationsEventEntries.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("operations-event-entries/{id}")]
    public async Task<IActionResult> UpdateOperationsEventEntry(string id, [FromBody] OperationsEventEntry entity)
    {
        var existing = await _context.OperationsEventEntries.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.OperationsEventEntryID = entity.OperationsEventEntryID;
        existing.OperationsEventRecordID = entity.OperationsEventRecordID;
        existing.EntryType = entity.EntryType;
        existing.Description = entity.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("operations-event-entries/{id}")]
    public async Task<IActionResult> DeleteOperationsEventEntry(string id)
    {
        var entity = await _context.OperationsEventEntries.FindAsync(id);
        if (entity == null) return NotFound();
        _context.OperationsEventEntries.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Hierarchy Scopes Flat

    [HttpGet("hierarchy-scopes-flat")]
    public async Task<IActionResult> GetHierarchyScopesFlat()
    {
        var data = await _context.HierarchyScopesFlat.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("hierarchy-scopes-flat/{id}")]
    public async Task<IActionResult> GetHierarchyScopeFlat(string id)
    {
        var entity = await _context.HierarchyScopesFlat.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("hierarchy-scopes-flat")]
    public async Task<IActionResult> CreateHierarchyScopeFlat([FromBody] HierarchyScopeFlat entity)
    {
        var existing = await _context.HierarchyScopesFlat.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.Enterprise = entity.Enterprise;
            existing.Site = entity.Site;
            existing.Area = entity.Area;
            existing.WorkCenter = entity.WorkCenter;
            existing.WorkUnit = entity.WorkUnit;
            existing.ProcessCell = entity.ProcessCell;
            existing.Unit = entity.Unit;
            existing.ProductionLine = entity.ProductionLine;
            existing.ProductionUnit = entity.ProductionUnit;
            existing.WorkCell = entity.WorkCell;
            existing.StorageZone = entity.StorageZone;
            existing.StorageUnit = entity.StorageUnit;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.HierarchyScopesFlat.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("hierarchy-scopes-flat/{id}")]
    public async Task<IActionResult> UpdateHierarchyScopeFlat(string id, [FromBody] HierarchyScopeFlat entity)
    {
        var existing = await _context.HierarchyScopesFlat.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.Enterprise = entity.Enterprise;
        existing.Site = entity.Site;
        existing.Area = entity.Area;
        existing.WorkCenter = entity.WorkCenter;
        existing.WorkUnit = entity.WorkUnit;
        existing.ProcessCell = entity.ProcessCell;
        existing.Unit = entity.Unit;
        existing.ProductionLine = entity.ProductionLine;
        existing.ProductionUnit = entity.ProductionUnit;
        existing.WorkCell = entity.WorkCell;
        existing.StorageZone = entity.StorageZone;
        existing.StorageUnit = entity.StorageUnit;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("hierarchy-scopes-flat/{id}")]
    public async Task<IActionResult> DeleteHierarchyScopeFlat(string id)
    {
        var entity = await _context.HierarchyScopesFlat.FindAsync(id);
        if (entity == null) return NotFound();
        _context.HierarchyScopesFlat.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region HierarchyScopeParentChild

    [HttpGet("hierarchy-scope-parent-child")]
    public async Task<IActionResult> GetHierarchyScopeParentChilds()
    {
        var data = await _context.HierarchyScopeParentChilds.OrderBy(x => x.Id).ToListAsync();
        return Ok(data);
    }

    [HttpGet("hierarchy-scope-parent-child/{id}")]
    public async Task<IActionResult> GetHierarchyScopeParentChild(string id)
    {
        var entity = await _context.HierarchyScopeParentChilds.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("hierarchy-scope-parent-child")]
    public async Task<IActionResult> CreateHierarchyScopeParentChild([FromBody] HierarchyScopeParentChild entity)
    {
        var existing = await _context.HierarchyScopeParentChilds.FindAsync(entity.Id);
        if (existing != null)
        {
            existing.ParentEquipmentLevel = entity.ParentEquipmentLevel;
            existing.ParentEquipmentID = entity.ParentEquipmentID;
            existing.ChildEquipmentLevel = entity.ChildEquipmentLevel;
            existing.ChildEquipmentID = entity.ChildEquipmentID;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Version++;
        }
        else
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.Version = 1;
            _context.HierarchyScopeParentChilds.Add(entity);
        }
        await _context.SaveChangesAsync();
        return Ok(existing ?? entity);
    }

    [HttpPut("hierarchy-scope-parent-child/{id}")]
    public async Task<IActionResult> UpdateHierarchyScopeParentChild(string id, [FromBody] HierarchyScopeParentChild entity)
    {
        var existing = await _context.HierarchyScopeParentChilds.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.ParentEquipmentLevel = entity.ParentEquipmentLevel;
        existing.ParentEquipmentID = entity.ParentEquipmentID;
        existing.ChildEquipmentLevel = entity.ChildEquipmentLevel;
        existing.ChildEquipmentID = entity.ChildEquipmentID;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version++;
        
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("hierarchy-scope-parent-child/{id}")]
    public async Task<IActionResult> DeleteHierarchyScopeParentChild(string id)
    {
        var entity = await _context.HierarchyScopeParentChilds.FindAsync(id);
        if (entity == null) return NotFound();
        _context.HierarchyScopeParentChilds.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Summary

    /// <summary>
    /// Get record counts for master-data stores.
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] string? storeNames = null)
    {
        var requested = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (!string.IsNullOrWhiteSpace(storeNames))
        {
            foreach (var n in storeNames.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                requested.Add(n);
            }
        }

        bool includeAll = requested.Count == 0;
        bool Include(string key) => includeAll || requested.Contains(key);

        var result = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        if (Include("materialClasses")) result["materialClasses"] = await _context.MaterialClasses.CountAsync();
        if (Include("materials")) result["materials"] = await _context.Materials.CountAsync();
        if (Include("materialLots")) result["materialLots"] = await _context.MaterialLots.CountAsync();
        if (Include("materialSublots")) result["materialSublots"] = await _context.MaterialSublots.CountAsync();
        if (Include("materialClassProperties")) result["materialClassProperties"] = await _context.MaterialClassProperties.CountAsync();
        if (Include("materialClassPropertiesAssignments")) result["materialClassPropertiesAssignments"] = await _context.MaterialClassPropertyAssignments.CountAsync();
        if (Include("materialDefinitionProperties")) result["materialDefinitionProperties"] = await _context.MaterialDefinitionProperties.CountAsync();
        if (Include("materialDefinitionPropertyAssignments")) result["materialDefinitionPropertyAssignments"] = await _context.MaterialDefinitionPropertyAssignments.CountAsync();
        if (Include("equipmentClasses")) result["equipmentClasses"] = await _context.EquipmentClasses.CountAsync();
        if (Include("equipment")) result["equipment"] = await _context.Equipments.CountAsync();
        if (Include("equipmentProperties")) result["equipmentProperties"] = await _context.EquipmentProperties.CountAsync();
        if (Include("equipmentPropertyAssignments")) result["equipmentPropertyAssignments"] = await _context.EquipmentPropertyAssignments.CountAsync();
        if (Include("equipmentClassProperties")) result["equipmentClassProperties"] = await _context.EquipmentClassProperties.CountAsync();
        if (Include("equipmentClassPropertiesAssignments")) result["equipmentClassPropertiesAssignments"] = await _context.EquipmentClassPropertyAssignments.CountAsync();
        if (Include("plants")) result["plants"] = await _context.Plants.CountAsync();
        if (Include("productionLines")) result["productionLines"] = await _context.ProductionLines.CountAsync();
        if (Include("lineEquipment")) result["lineEquipment"] = await _context.LineEquipments.CountAsync();
        if (Include("processSegments")) result["processSegments"] = await _context.ProcessSegments.CountAsync();
        if (Include("segmentBOMs")) result["segmentBOMs"] = await _context.SegmentBOMs.CountAsync();
        if (Include("maintenanceBOMs")) result["maintenanceBOMs"] = await _context.MaintenanceBOMs.CountAsync();
        if (Include("equipmentUsages")) result["equipmentUsages"] = await _context.EquipmentUsages.CountAsync();
        if (Include("operationEventDefinitions")) result["operationEventDefinitions"] = await _context.OperationEventDefinitions.CountAsync();
        if (Include("operationEventDefSegmentAssignments")) result["operationEventDefSegmentAssignments"] = await _context.OperationEventDefSegmentAssignments.CountAsync();
        if (Include("operationEventDefinitionProperties")) result["operationEventDefinitionProperties"] = await _context.OperationEventDefinitionProperties.CountAsync();
        if (Include("operationEventDefinitionPropertyAssignments")) result["operationEventDefinitionPropertyAssignments"] = await _context.OperationEventDefinitionPropertyAssignments.CountAsync();
        if (Include("operationsEventClasses")) result["operationsEventClasses"] = await _context.OperationsEventClasses.CountAsync();
        if (Include("shifts")) result["shifts"] = await _context.Shifts.CountAsync();
        if (Include("crews")) result["crews"] = await _context.Crews.CountAsync();
        if (Include("shiftCrewAssignments")) result["shiftCrewAssignments"] = await _context.ShiftCrewAssignments.CountAsync();
        if (Include("personClasses")) result["personClasses"] = await _context.PersonClasses.CountAsync();
        if (Include("personnelCapabilities")) result["personnelCapabilities"] = await _context.PersonnelCapabilities.CountAsync();
        if (Include("employees")) result["employees"] = await _context.Employees.CountAsync();
        if (Include("hierarchyScopes")) result["hierarchyScopes"] = await _context.HierarchyScopes.CountAsync();
        if (Include("hierarchyScopeParentChild")) result["hierarchyScopeParentChild"] = await _context.HierarchyScopeParentChilds.CountAsync();

        return Ok(result);
    }

    #endregion

    #region Bulk Delete

    /// <summary>
    /// Clear all master data from the database
    /// </summary>
    [HttpDelete("clear-all")]
    public async Task<IActionResult> ClearAllMasterData()
    {
        try
        {
            // Delete in order to avoid FK constraints
            _context.OperationsEventEntries.RemoveRange(_context.OperationsEventEntries);
            _context.OperationsEventRecords.RemoveRange(_context.OperationsEventRecords);
            _context.OperationEventDefSegmentAssignments.RemoveRange(_context.OperationEventDefSegmentAssignments);
            _context.OperationEventDefinitionPropertyAssignments.RemoveRange(_context.OperationEventDefinitionPropertyAssignments);
            _context.OperationEventDefinitionProperties.RemoveRange(_context.OperationEventDefinitionProperties);
            _context.OperationEventDefinitions.RemoveRange(_context.OperationEventDefinitions);
            _context.OperationsEventClasses.RemoveRange(_context.OperationsEventClasses);
            
            _context.ShiftCrewAssignments.RemoveRange(_context.ShiftCrewAssignments);
            _context.Employees.RemoveRange(_context.Employees);
            _context.PersonnelCapabilities.RemoveRange(_context.PersonnelCapabilities);
            _context.PersonClasses.RemoveRange(_context.PersonClasses);
            _context.Crews.RemoveRange(_context.Crews);
            _context.Shifts.RemoveRange(_context.Shifts);
            
            _context.LineEquipments.RemoveRange(_context.LineEquipments);
            _context.MaintenanceBOMs.RemoveRange(_context.MaintenanceBOMs);
            _context.EquipmentUsages.RemoveRange(_context.EquipmentUsages);
            _context.SegmentBOMs.RemoveRange(_context.SegmentBOMs);
            _context.ProcessSegments.RemoveRange(_context.ProcessSegments);
            
            _context.EquipmentPropertyAssignments.RemoveRange(_context.EquipmentPropertyAssignments);
            _context.EquipmentProperties.RemoveRange(_context.EquipmentProperties);
            _context.Equipments.RemoveRange(_context.Equipments);
            
            _context.EquipmentClassPropertyAssignments.RemoveRange(_context.EquipmentClassPropertyAssignments);
            _context.EquipmentClassProperties.RemoveRange(_context.EquipmentClassProperties);
            _context.EquipmentClasses.RemoveRange(_context.EquipmentClasses);
            
            _context.MaterialClassPropertyAssignments.RemoveRange(_context.MaterialClassPropertyAssignments);
            _context.MaterialClassProperties.RemoveRange(_context.MaterialClassProperties);
            _context.MaterialDefinitionPropertyAssignments.RemoveRange(_context.MaterialDefinitionPropertyAssignments);
            _context.MaterialDefinitionProperties.RemoveRange(_context.MaterialDefinitionProperties);
            _context.MaterialSublots.RemoveRange(_context.MaterialSublots);
            _context.MaterialLots.RemoveRange(_context.MaterialLots);
            _context.Materials.RemoveRange(_context.Materials);
            _context.MaterialClasses.RemoveRange(_context.MaterialClasses);
            
            _context.ProductionLines.RemoveRange(_context.ProductionLines);
            _context.Plants.RemoveRange(_context.Plants);
            
            _context.HierarchyScopeParentChilds.RemoveRange(_context.HierarchyScopeParentChilds);
            _context.HierarchyScopesFlat.RemoveRange(_context.HierarchyScopesFlat);
            _context.HierarchyScopes.RemoveRange(_context.HierarchyScopes);

            await _context.SaveChangesAsync();
            _logger.LogInformation("Cleared all master data");
            
            return Ok(new { message = "All master data cleared successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing master data");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Clear one or more specific master data stores, respecting FK dependency order.
    /// Body: { "stores": ["processSegments", "segmentBOMs", ...] }
    /// </summary>
    [HttpPost("clear-stores")]
    public async Task<IActionResult> ClearStores([FromBody] ClearStoresRequest request)
    {
        if (request?.Stores == null || request.Stores.Count == 0)
            return BadRequest("No stores provided");

        var s = new HashSet<string>(request.Stores, StringComparer.OrdinalIgnoreCase);

        try
        {
            // Always respect FK child-before-parent ordering; skip sets not requested.
            if (s.Contains("operationsEventEntries"))   _context.OperationsEventEntries.RemoveRange(_context.OperationsEventEntries);
            if (s.Contains("operationsEventRecords"))   _context.OperationsEventRecords.RemoveRange(_context.OperationsEventRecords);
            if (s.Contains("operationEventDefSegmentAssignments")) _context.OperationEventDefSegmentAssignments.RemoveRange(_context.OperationEventDefSegmentAssignments);
            if (s.Contains("operationEventDefinitionPropertyAssignments")) _context.OperationEventDefinitionPropertyAssignments.RemoveRange(_context.OperationEventDefinitionPropertyAssignments);
            if (s.Contains("operationEventDefinitionProperties")) _context.OperationEventDefinitionProperties.RemoveRange(_context.OperationEventDefinitionProperties);
            if (s.Contains("operationEventDefinitions")) _context.OperationEventDefinitions.RemoveRange(_context.OperationEventDefinitions);
            if (s.Contains("operationsEventClasses"))   _context.OperationsEventClasses.RemoveRange(_context.OperationsEventClasses);

            if (s.Contains("shiftCrewAssignments"))     _context.ShiftCrewAssignments.RemoveRange(_context.ShiftCrewAssignments);
            if (s.Contains("employees"))                _context.Employees.RemoveRange(_context.Employees);
            if (s.Contains("personnelCapabilities"))    _context.PersonnelCapabilities.RemoveRange(_context.PersonnelCapabilities);
            if (s.Contains("personClasses"))            _context.PersonClasses.RemoveRange(_context.PersonClasses);
            if (s.Contains("crews"))                    _context.Crews.RemoveRange(_context.Crews);
            if (s.Contains("shifts"))                   _context.Shifts.RemoveRange(_context.Shifts);

            if (s.Contains("lineEquipment"))            _context.LineEquipments.RemoveRange(_context.LineEquipments);
            if (s.Contains("maintenanceBOMs"))          _context.MaintenanceBOMs.RemoveRange(_context.MaintenanceBOMs);
            if (s.Contains("equipmentUsages"))          _context.EquipmentUsages.RemoveRange(_context.EquipmentUsages);
            if (s.Contains("segmentBOMs"))              _context.SegmentBOMs.RemoveRange(_context.SegmentBOMs);
            if (s.Contains("processSegments"))          _context.ProcessSegments.RemoveRange(_context.ProcessSegments);

            if (s.Contains("equipmentPropertyAssignments")) _context.EquipmentPropertyAssignments.RemoveRange(_context.EquipmentPropertyAssignments);
            if (s.Contains("equipmentProperties"))      _context.EquipmentProperties.RemoveRange(_context.EquipmentProperties);
            if (s.Contains("equipment"))                _context.Equipments.RemoveRange(_context.Equipments);

            if (s.Contains("equipmentClassPropertiesAssignments")) _context.EquipmentClassPropertyAssignments.RemoveRange(_context.EquipmentClassPropertyAssignments);
            if (s.Contains("equipmentClassProperties")) _context.EquipmentClassProperties.RemoveRange(_context.EquipmentClassProperties);
            if (s.Contains("equipmentClasses"))         _context.EquipmentClasses.RemoveRange(_context.EquipmentClasses);

            if (s.Contains("materialClassPropertiesAssignments")) _context.MaterialClassPropertyAssignments.RemoveRange(_context.MaterialClassPropertyAssignments);
            if (s.Contains("materialClassProperties"))  _context.MaterialClassProperties.RemoveRange(_context.MaterialClassProperties);
            if (s.Contains("materialDefinitionPropertyAssignments")) _context.MaterialDefinitionPropertyAssignments.RemoveRange(_context.MaterialDefinitionPropertyAssignments);
            if (s.Contains("materialDefinitionProperties")) _context.MaterialDefinitionProperties.RemoveRange(_context.MaterialDefinitionProperties);
            if (s.Contains("materialSublots"))          _context.MaterialSublots.RemoveRange(_context.MaterialSublots);
            if (s.Contains("materialLots"))             _context.MaterialLots.RemoveRange(_context.MaterialLots);
            if (s.Contains("materials"))                _context.Materials.RemoveRange(_context.Materials);
            if (s.Contains("materialClasses"))          _context.MaterialClasses.RemoveRange(_context.MaterialClasses);

            if (s.Contains("productionLines"))          _context.ProductionLines.RemoveRange(_context.ProductionLines);
            if (s.Contains("plants"))                   _context.Plants.RemoveRange(_context.Plants);

            if (s.Contains("hierarchyScopeParentChild")) _context.HierarchyScopeParentChilds.RemoveRange(_context.HierarchyScopeParentChilds);
            if (s.Contains("hierarchyScopesFlat"))      _context.HierarchyScopesFlat.RemoveRange(_context.HierarchyScopesFlat);
            if (s.Contains("hierarchyScopes"))          _context.HierarchyScopes.RemoveRange(_context.HierarchyScopes);

            await _context.SaveChangesAsync();
            _logger.LogInformation("Cleared stores: {Stores}", string.Join(", ", request.Stores));
            return Ok(new { cleared = request.Stores });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing stores");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    #endregion
}

public class ClearStoresRequest
{
    public List<string> Stores { get; set; } = new();
}
