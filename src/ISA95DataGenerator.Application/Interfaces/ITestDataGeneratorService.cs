using ISA95DataGenerator.Domain.Models;

namespace ISA95DataGenerator.Application.Interfaces;

/// <summary>
/// Service for generating test data for ISA-95 entities
/// </summary>
public interface ITestDataGeneratorService
{
    Task<DataGenerationResponse> GenerateDataAsync(DataGenerationRequest request);
}
