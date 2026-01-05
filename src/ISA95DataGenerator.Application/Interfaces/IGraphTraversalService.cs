using ISA95DataGenerator.Domain.Entities;

namespace ISA95DataGenerator.Application.Interfaces;

/// <summary>
/// Service for traversing entity relationship graphs
/// </summary>
public interface IGraphTraversalService
{
    Task<List<RelationshipDefinition>> GetRelatedEntitiesAsync(string entityName);
    Task<Dictionary<string, List<RelationshipDefinition>>> GetEntityGraphAsync(string rootEntityName, int maxDepth = 3);
    Task<List<string>> GetRelationshipPathAsync(string sourceEntity, string targetEntity);
}
