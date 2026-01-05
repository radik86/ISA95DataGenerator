using ISA95DataGenerator.Application.Interfaces;
using ISA95DataGenerator.Domain.Entities;

namespace ISA95DataGenerator.Infrastructure.Services;

public class GraphTraversalService : IGraphTraversalService
{
    private readonly IMetadataLoaderService _metadataLoader;

    public GraphTraversalService(IMetadataLoaderService metadataLoader)
    {
        _metadataLoader = metadataLoader;
    }

    public async Task<List<RelationshipDefinition>> GetRelatedEntitiesAsync(string entityName)
    {
        var entity = await _metadataLoader.GetEntityByNameAsync(entityName);
        return entity?.Relationships ?? new List<RelationshipDefinition>();
    }

    public async Task<Dictionary<string, List<RelationshipDefinition>>> GetEntityGraphAsync(string rootEntityName, int maxDepth = 3)
    {
        var graph = new Dictionary<string, List<RelationshipDefinition>>();
        var visited = new HashSet<string>();
        
        await BuildGraphRecursiveAsync(rootEntityName, 0, maxDepth, graph, visited);
        
        return graph;
    }

    public async Task<List<string>> GetRelationshipPathAsync(string sourceEntity, string targetEntity)
    {
        var visited = new HashSet<string>();
        var path = new List<string>();
        
        if (await FindPathAsync(sourceEntity, targetEntity, visited, path))
        {
            return path;
        }
        
        return new List<string>();
    }

    private async Task BuildGraphRecursiveAsync(
        string entityName, 
        int currentDepth, 
        int maxDepth, 
        Dictionary<string, List<RelationshipDefinition>> graph, 
        HashSet<string> visited)
    {
        if (currentDepth >= maxDepth || visited.Contains(entityName))
        {
            return;
        }

        visited.Add(entityName);
        var relationships = await GetRelatedEntitiesAsync(entityName);
        
        graph[entityName] = relationships;

        foreach (var rel in relationships)
        {
            // Look up target entity by ID to get the correct name
            var targetEntity = await _metadataLoader.GetEntityByIdAsync(rel.TargetEntityId);
            if (targetEntity != null && !visited.Contains(targetEntity.Name))
            {
                await BuildGraphRecursiveAsync(targetEntity.Name, currentDepth + 1, maxDepth, graph, visited);
            }
        }
    }

    private async Task<bool> FindPathAsync(
        string current, 
        string target, 
        HashSet<string> visited, 
        List<string> path)
    {
        if (current.Equals(target, StringComparison.OrdinalIgnoreCase))
        {
            path.Add(current);
            return true;
        }

        if (visited.Contains(current))
        {
            return false;
        }

        visited.Add(current);
        path.Add(current);

        var relationships = await GetRelatedEntitiesAsync(current);
        
        foreach (var rel in relationships)
        {
            if (await FindPathAsync(rel.TargetEntityName, target, visited, path))
            {
                return true;
            }
        }

        path.RemoveAt(path.Count - 1);
        return false;
    }
}
