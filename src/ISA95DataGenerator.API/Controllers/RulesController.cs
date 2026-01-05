using ISA95DataGenerator.Application.Interfaces;
using ISA95DataGenerator.Domain.Rules;
using Microsoft.AspNetCore.Mvc;

namespace ISA95DataGenerator.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RulesController : ControllerBase
{
    private readonly IPrimaryKeyRuleService _pkRuleService;
    private readonly IFieldRuleService _fieldRuleService;
    private readonly ILogger<RulesController> _logger;

    public RulesController(
        IPrimaryKeyRuleService pkRuleService,
        IFieldRuleService fieldRuleService,
        ILogger<RulesController> logger)
    {
        _pkRuleService = pkRuleService;
        _fieldRuleService = fieldRuleService;
        _logger = logger;
    }

    [HttpPost("primary-key")]
    public async Task<IActionResult> DefinePrimaryKeyRule([FromBody] PrimaryKeyRule rule)
    {
        try
        {
            await _pkRuleService.SaveRuleAsync(rule);
            return Ok(new { message = "Primary key rule saved successfully", rule });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving primary key rule for {EntityName}", rule.EntityName);
            return StatusCode(500, new { error = "Failed to save primary key rule", message = ex.Message });
        }
    }

    [HttpGet("primary-key/{entityName}")]
    public async Task<IActionResult> GetPrimaryKeyRule(string entityName)
    {
        try
        {
            var rule = await _pkRuleService.GetRuleAsync(entityName);
            if (rule == null)
            {
                return NotFound(new { error = $"No primary key rule found for entity '{entityName}'" });
            }
            return Ok(rule);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting primary key rule for {EntityName}", entityName);
            return StatusCode(500, new { error = "Failed to get primary key rule", message = ex.Message });
        }
    }

    [HttpGet("primary-key")]
    public async Task<IActionResult> GetAllPrimaryKeyRules()
    {
        try
        {
            var rules = await _pkRuleService.GetAllRulesAsync();
            return Ok(rules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all primary key rules");
            return StatusCode(500, new { error = "Failed to get primary key rules", message = ex.Message });
        }
    }

    [HttpDelete("primary-key/{entityName}")]
    public async Task<IActionResult> DeletePrimaryKeyRule(string entityName)
    {
        try
        {
            await _pkRuleService.DeleteRuleAsync(entityName);
            return Ok(new { message = "Primary key rule deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting primary key rule for {EntityName}", entityName);
            return StatusCode(500, new { error = "Failed to delete primary key rule", message = ex.Message });
        }
    }

    [HttpPost("field")]
    public async Task<IActionResult> DefineFieldRule([FromBody] FieldRule rule)
    {
        try
        {
            await _fieldRuleService.SaveRuleAsync(rule);
            return Ok(new { message = "Field rule saved successfully", rule });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving field rule for {EntityName}.{FieldName}", rule.EntityName, rule.FieldName);
            return StatusCode(500, new { error = "Failed to save field rule", message = ex.Message });
        }
    }

    [HttpGet("field/{entityName}/{fieldName}")]
    public async Task<IActionResult> GetFieldRule(string entityName, string fieldName)
    {
        try
        {
            var rule = await _fieldRuleService.GetRuleAsync(entityName, fieldName);
            if (rule == null)
            {
                return NotFound(new { error = $"No field rule found for {entityName}.{fieldName}" });
            }
            return Ok(rule);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting field rule for {EntityName}.{FieldName}", entityName, fieldName);
            return StatusCode(500, new { error = "Failed to get field rule", message = ex.Message });
        }
    }

    [HttpGet("field/{entityName}")]
    public async Task<IActionResult> GetFieldRulesForEntity(string entityName)
    {
        try
        {
            var rules = await _fieldRuleService.GetRulesForEntityAsync(entityName);
            return Ok(rules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting field rules for {EntityName}", entityName);
            return StatusCode(500, new { error = "Failed to get field rules", message = ex.Message });
        }
    }

    [HttpGet("field")]
    public async Task<IActionResult> GetAllFieldRules()
    {
        try
        {
            var rules = await _fieldRuleService.GetAllRulesAsync();
            return Ok(rules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all field rules");
            return StatusCode(500, new { error = "Failed to get field rules", message = ex.Message });
        }
    }

    [HttpDelete("field/{entityName}/{fieldName}")]
    public async Task<IActionResult> DeleteFieldRule(string entityName, string fieldName)
    {
        try
        {
            await _fieldRuleService.DeleteRuleAsync(entityName, fieldName);
            return Ok(new { message = "Field rule deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting field rule for {EntityName}.{FieldName}", entityName, fieldName);
            return StatusCode(500, new { error = "Failed to delete field rule", message = ex.Message });
        }
    }
}
