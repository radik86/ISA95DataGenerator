using ISA95DataGenerator.Domain.Models;

namespace ISA95DataGenerator.Application.Interfaces;

/// <summary>
/// Service for generating mapping files
/// </summary>
public interface IMappingFileService
{
    Task<MappingFile> GenerateMappingFileAsync(DataGenerationRequest request, DataGenerationResponse generatedData);
    Task<byte[]> ExportMappingFileAsJsonAsync(MappingFile mappingFile);
}
