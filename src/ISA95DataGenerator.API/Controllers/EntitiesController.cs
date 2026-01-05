using ISA95DataGenerator.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ISA95DataGenerator.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EntitiesController : ControllerBase
{
    private readonly IMetadataLoaderService _metadataLoader;
    private readonly IGraphTraversalService _graphTraversal;
    private readonly ILogger<EntitiesController> _logger;

    public EntitiesController(
        IMetadataLoaderService metadataLoader,
        IGraphTraversalService graphTraversal,
        ILogger<EntitiesController> logger)
    {
        _metadataLoader = metadataLoader;
        _graphTraversal = graphTraversal;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllEntities()
    {
        try
        {
            var entities = await _metadataLoader.LoadAllEntitiesAsync();
            var entitySummaries = entities.Select(e => new
            {
                e.Id,
                e.Name,
                e.DisplayName,
                e.Description,
                AttributeCount = e.Attributes.Count,
                RelationshipCount = e.Relationships.Count
            });

            return Ok(entitySummaries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting entities");
            return StatusCode(500, new { error = "Failed to load entities", message = ex.Message });
        }
    }

    [HttpGet("{entityName}/structure")]
    public async Task<IActionResult> GetEntityStructure(string entityName)
    {
        try
        {
            var entity = await _metadataLoader.GetEntityByNameAsync(entityName);
            if (entity == null)
            {
                return NotFound(new { error = $"Entity '{entityName}' not found" });
            }

            return Ok(new
            {
                entity.Id,
                entity.Name,
                entity.DisplayName,
                entity.Description,
                entity.Context,
                Attributes = entity.Attributes.Select(a => new
                {
                    a.Name,
                    a.DisplayName,
                    a.Description,
                    a.Schema,
                    a.IsRequired,
                    a.IsPrimaryKey,
                    a.MinValue,
                    a.MaxValue,
                    a.MinLength,
                    a.MaxLength,
                    a.Pattern,
                    a.EnumValues,
                    a.CanBePrimaryKey
                }),
                Relationships = entity.Relationships.Select(r => new
                {
                    r.Name,
                    r.DisplayName,
                    r.Description,
                    r.TargetEntityId,
                    r.TargetEntityName,
                    Cardinality = r.Cardinality.ToString(),
                    Direction = r.Direction.ToString()
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting entity structure for {EntityName}", entityName);
            return StatusCode(500, new { error = "Failed to load entity structure", message = ex.Message });
        }
    }

    [HttpGet("{entityName}/related")]
    public async Task<IActionResult> GetRelatedEntities(string entityName)
    {
        try
        {
            var relationships = await _graphTraversal.GetRelatedEntitiesAsync(entityName);
            
            // Resolve target entity names from IDs and return unique names
            var relatedEntityNames = new List<string>();
            foreach (var rel in relationships)
            {
                var targetEntity = await _metadataLoader.GetEntityByIdAsync(rel.TargetEntityId);
                if (targetEntity != null && !relatedEntityNames.Contains(targetEntity.Name))
                {
                    relatedEntityNames.Add(targetEntity.Name);
                }
            }
            
            return Ok(relatedEntityNames);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting related entities for {EntityName}", entityName);
            return StatusCode(500, new { error = "Failed to load related entities", message = ex.Message });
        }
    }

    [HttpGet("{entityName}/graph")]
    public async Task<IActionResult> GetEntityGraph(string entityName, [FromQuery] int maxDepth = 3)
    {
        try
        {
            var relationshipGraph = await _graphTraversal.GetEntityGraphAsync(entityName, maxDepth);
            
            // Build a dictionary of full entity definitions
            var entityGraph = new Dictionary<string, object>();
            
            foreach (var entityKey in relationshipGraph.Keys)
            {
                var entity = await _metadataLoader.GetEntityByNameAsync(entityKey);
                if (entity != null)
                {
                    // Resolve target entity names from IDs to get actual entity names (with proper spacing)
                    var resolvedRelationships = new List<object>();
                    foreach (var r in entity.Relationships)
                    {
                        var targetEntity = await _metadataLoader.GetEntityByIdAsync(r.TargetEntityId);
                        resolvedRelationships.Add(new
                        {
                            r.Name,
                            r.DisplayName,
                            r.Description,
                            r.TargetEntityId,
                            TargetEntityName = targetEntity?.Name ?? r.TargetEntityName,  // Use actual entity name
                            Cardinality = r.Cardinality.ToString(),
                            Direction = r.Direction.ToString()
                        });
                    }
                    
                    entityGraph[entityKey] = new
                    {
                        entity.Id,
                        entity.Name,
                        entity.DisplayName,
                        entity.Description,
                        Attributes = entity.Attributes.Select(a => new
                        {
                            a.Name,
                            a.DisplayName,
                            a.Description,
                            a.Schema,
                            a.IsRequired,
                            a.IsPrimaryKey,
                            a.CanBePrimaryKey,
                            a.MinValue,
                            a.MaxValue,
                            a.MinLength,
                            a.MaxLength,
                            a.Pattern,
                            a.EnumValues
                        }).ToList(),
                        Relationships = resolvedRelationships
                    };
                }
            }
            
            return Ok(entityGraph);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting entity graph for {EntityName}", entityName);
            return StatusCode(500, new { error = "Failed to load entity graph", message = ex.Message });
        }
    }

    [HttpPost("reload")]
    public async Task<IActionResult> ReloadMetadata()
    {
        try
        {
            await _metadataLoader.ReloadMetadataAsync();
            return Ok(new { message = "Metadata reloaded successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reloading metadata");
            return StatusCode(500, new { error = "Failed to reload metadata", message = ex.Message });
        }
    }
}
