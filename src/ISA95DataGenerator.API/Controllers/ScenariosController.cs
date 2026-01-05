using Microsoft.AspNetCore.Mvc;
using ISA95DataGenerator.Application.Interfaces;
using ISA95DataGenerator.Domain.Scenarios;

namespace ISA95DataGenerator.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScenariosController : ControllerBase
{
    private readonly IScenarioService _scenarioService;
    private readonly ILogger<ScenariosController> _logger;

    public ScenariosController(IScenarioService scenarioService, ILogger<ScenariosController> logger)
    {
        _scenarioService = scenarioService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<DataGenerationScenario>>> GetAllScenarios()
    {
        try
        {
            var scenarios = await _scenarioService.GetAllScenariosAsync();
            return Ok(scenarios);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving scenarios");
            return StatusCode(500, "Error retrieving scenarios");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DataGenerationScenario>> GetScenario(string id)
    {
        try
        {
            var scenario = await _scenarioService.GetScenarioAsync(id);
            if (scenario == null)
            {
                return NotFound($"Scenario with ID {id} not found");
            }
            return Ok(scenario);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving scenario {Id}", id);
            return StatusCode(500, "Error retrieving scenario");
        }
    }

    [HttpPost]
    public async Task<ActionResult<DataGenerationScenario>> CreateScenario([FromBody] DataGenerationScenario scenario)
    {
        try
        {
            var savedScenario = await _scenarioService.SaveScenarioAsync(scenario);
            return CreatedAtAction(nameof(GetScenario), new { id = savedScenario.Id }, savedScenario);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating scenario");
            return StatusCode(500, "Error creating scenario");
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<DataGenerationScenario>> UpdateScenario(string id, [FromBody] DataGenerationScenario scenario)
    {
        try
        {
            scenario.Id = id;
            var updatedScenario = await _scenarioService.SaveScenarioAsync(scenario);
            return Ok(updatedScenario);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating scenario {Id}", id);
            return StatusCode(500, "Error updating scenario");
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteScenario(string id)
    {
        try
        {
            await _scenarioService.DeleteScenarioAsync(id);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting scenario {Id}", id);
            return StatusCode(500, "Error deleting scenario");
        }
    }
}
