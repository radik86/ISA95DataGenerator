using ISA95DataGenerator.Domain.Scenarios;

namespace ISA95DataGenerator.Application.Interfaces;

public interface IScenarioService
{
    Task<DataGenerationScenario> SaveScenarioAsync(DataGenerationScenario scenario);
    Task<DataGenerationScenario?> GetScenarioAsync(string id);
    Task<List<DataGenerationScenario>> GetAllScenariosAsync();
    Task DeleteScenarioAsync(string id);
}
