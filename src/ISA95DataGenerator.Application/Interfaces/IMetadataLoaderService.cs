using ISA95DataGenerator.Domain.Entities;

namespace ISA95DataGenerator.Application.Interfaces;

/// <summary>
/// Service for loading and caching ISA-95 entity metadata from JSON files
/// </summary>
public interface IMetadataLoaderService
{
    Task<List<EntityDefinition>> LoadAllEntitiesAsync();
    Task<EntityDefinition?> GetEntityByNameAsync(string entityName);
    Task<EntityDefinition?> GetEntityByIdAsync(string entityId);
    Task ReloadMetadataAsync();
}
