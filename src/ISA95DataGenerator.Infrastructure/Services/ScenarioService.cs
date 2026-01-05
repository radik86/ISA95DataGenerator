using System.Text.Json;
using ISA95DataGenerator.Application.Interfaces;
using ISA95DataGenerator.Domain.Scenarios;

namespace ISA95DataGenerator.Infrastructure.Services;

public class ScenarioService : IScenarioService
{
    private readonly Dictionary<string, DataGenerationScenario> _scenarios = new();
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly string _scenariosFilePath;

    public ScenarioService()
    {
        var dataDir = Path.Combine(Directory.GetCurrentDirectory(), "Data");
        Directory.CreateDirectory(dataDir);
        _scenariosFilePath = Path.Combine(dataDir, "scenarios.json");
        LoadScenariosFromFile();
    }

    private void LoadScenariosFromFile()
    {
        if (!File.Exists(_scenariosFilePath))
            return;

        try
        {
            var json = File.ReadAllText(_scenariosFilePath);
            var scenariosList = JsonSerializer.Deserialize<List<DataGenerationScenario>>(json);
            if (scenariosList != null)
            {
                foreach (var scenario in scenariosList)
                {
                    _scenarios[scenario.Id] = scenario;
                }
            }
        }
        catch
        {
            // If file is corrupted, start with empty scenarios
        }
    }

    private async Task SaveScenariosToFileAsync()
    {
        var allScenarios = _scenarios.Values.ToList();
        var json = JsonSerializer.Serialize(allScenarios, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(_scenariosFilePath, json);
    }

    public async Task<DataGenerationScenario> SaveScenarioAsync(DataGenerationScenario scenario)
    {
        await _lock.WaitAsync();
        try
        {
            scenario.UpdatedAt = DateTime.UtcNow;
            if (string.IsNullOrEmpty(scenario.Id))
            {
                scenario.Id = Guid.NewGuid().ToString();
                scenario.CreatedAt = DateTime.UtcNow;
            }
            
            _scenarios[scenario.Id] = scenario;
            await SaveScenariosToFileAsync();
            return scenario;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<DataGenerationScenario?> GetScenarioAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            return _scenarios.TryGetValue(id, out var scenario) ? scenario : null;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<List<DataGenerationScenario>> GetAllScenariosAsync()
    {
        await _lock.WaitAsync();
        try
        {
            return _scenarios.Values.OrderByDescending(s => s.UpdatedAt).ToList();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task DeleteScenarioAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            _scenarios.Remove(id);
            await SaveScenariosToFileAsync();
        }
        finally
        {
            _lock.Release();
        }
    }
}
