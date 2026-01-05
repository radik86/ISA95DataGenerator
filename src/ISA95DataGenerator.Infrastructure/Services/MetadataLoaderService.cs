using System.Text.Json;
using ISA95DataGenerator.Application.Interfaces;
using ISA95DataGenerator.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace ISA95DataGenerator.Infrastructure.Services;

/// <summary>
/// Loads and caches ISA-95 entity metadata from JSON files
/// </summary>
public class MetadataLoaderService : IMetadataLoaderService
{
    private readonly ILogger<MetadataLoaderService> _logger;
    private readonly string _metadataPath;
    private List<EntityDefinition>? _cachedEntities;
    private readonly SemaphoreSlim _loadLock = new(1, 1);

    public MetadataLoaderService(ILogger<MetadataLoaderService> logger, string metadataPath)
    {
        _logger = logger;
        _metadataPath = metadataPath;
    }

    public async Task<List<EntityDefinition>> LoadAllEntitiesAsync()
    {
        if (_cachedEntities != null)
        {
            return _cachedEntities;
        }

        await _loadLock.WaitAsync();
        try
        {
            if (_cachedEntities != null)
            {
                return _cachedEntities;
            }

            _logger.LogInformation("Loading entity metadata from {MetadataPath}", _metadataPath);

            if (!Directory.Exists(_metadataPath))
            {
                _logger.LogWarning("Metadata path does not exist: {MetadataPath}", _metadataPath);
                _cachedEntities = new List<EntityDefinition>();
                return _cachedEntities;
            }

            var entities = new List<EntityDefinition>();
            var jsonFiles = Directory.GetFiles(_metadataPath, "*.json", SearchOption.AllDirectories);

            foreach (var file in jsonFiles)
            {
                try
                {
                    var json = await File.ReadAllTextAsync(file);
                    var entityDef = ParseEntityFromJson(json);
                    if (entityDef != null)
                    {
                        entities.Add(entityDef);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error loading entity from file {FilePath}", file);
                }
            }

            _cachedEntities = entities;
            _logger.LogInformation("Loaded {Count} entities from metadata", entities.Count);
            return _cachedEntities;
        }
        finally
        {
            _loadLock.Release();
        }
    }

    public async Task<EntityDefinition?> GetEntityByNameAsync(string entityName)
    {
        var entities = await LoadAllEntitiesAsync();
        return entities.FirstOrDefault(e => 
            e.Name.Equals(entityName, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<EntityDefinition?> GetEntityByIdAsync(string entityId)
    {
        var entities = await LoadAllEntitiesAsync();
        return entities.FirstOrDefault(e => 
            e.Id.Equals(entityId, StringComparison.OrdinalIgnoreCase));
    }

    public async Task ReloadMetadataAsync()
    {
        await _loadLock.WaitAsync();
        try
        {
            _cachedEntities = null;
            await LoadAllEntitiesAsync();
        }
        finally
        {
            _loadLock.Release();
        }
    }

    private EntityDefinition? ParseEntityFromJson(string json)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;

            // Check if dtdlSchema exists
            if (!root.TryGetProperty("dtdlSchema", out var dtdlSchema))
            {
                return null;
            }

            // Extract @id and @context from dtdlSchema
            if (!dtdlSchema.TryGetProperty("@id", out var idElement))
            {
                return null;
            }

            var id = idElement.GetString() ?? string.Empty;
            var context = dtdlSchema.TryGetProperty("@context", out var ctxElement) 
                ? ctxElement.GetString() ?? string.Empty 
                : string.Empty;

            // Get name from root or extract from @id
            var name = root.TryGetProperty("name", out var nameElement) 
                ? nameElement.GetString() ?? ExtractNameFromId(id)
                : ExtractNameFromId(id);

            var displayName = dtdlSchema.TryGetProperty("displayName", out var dnElement) 
                ? dnElement.GetString() ?? name 
                : name;

            var description = dtdlSchema.TryGetProperty("description", out var descElement) 
                ? descElement.GetString() 
                : null;

            var entity = new EntityDefinition
            {
                Id = id,
                Name = name,
                DisplayName = displayName,
                Description = description,
                Context = context
            };

            // Parse columns as attributes
            if (root.TryGetProperty("columns", out var columnsElement) && 
                columnsElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var column in columnsElement.EnumerateArray())
                {
                    var attribute = ParseAttributeFromColumn(column);
                    if (attribute != null)
                    {
                        // DIAGNOSTIC: Log enum values for operationsType when parsing Operations Request
                        if (attribute.Name == "operationsType" && name == "Operations Request")
                        {
                            _logger.LogInformation("DIAGNOSTIC ParseEntity: Found operationsType in Operations Request - EnumValues.Count = {Count}", 
                                attribute.EnumValues?.Count ?? 0);
                            if (attribute.EnumValues != null && attribute.EnumValues.Count > 0)
                            {
                                _logger.LogInformation("DIAGNOSTIC ParseEntity: EnumValues = [{Values}]", 
                                    string.Join(", ", attribute.EnumValues.Select(v => $"'{v}'")));
                            }
                        }
                        
                        entity.Attributes.Add(attribute);
                    }
                }
            }

            // Parse contents (only relationships from dtdlSchema, not properties to avoid duplicates)
            if (dtdlSchema.TryGetProperty("contents", out var contentsElement) && 
                contentsElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var content in contentsElement.EnumerateArray())
                {
                    var type = content.TryGetProperty("@type", out var typeElement) 
                        ? typeElement.GetString() 
                        : null;

                    // Only parse relationships, not properties (properties come from columns)
                    if (type == "Relationship")
                    {
                        var relationship = ParseRelationship(content);
                        if (relationship != null)
                        {
                            entity.Relationships.Add(relationship);
                        }
                    }
                }
            }

            return entity;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing entity JSON");
            return null;
        }
    }

    private AttributeDefinition? ParseAttributeFromColumn(JsonElement column)
    {
        if (!column.TryGetProperty("name", out var nameElement))
        {
            return null;
        }

        var name = nameElement.GetString() ?? string.Empty;
        var description = column.TryGetProperty("description", out var descElement) 
            ? descElement.GetString() 
            : null;

        var type = column.TryGetProperty("type", out var typeElement)
            ? typeElement.GetString() ?? "String"
            : "String";

        var mandatory = column.TryGetProperty("mandatory", out var mandElement) &&
                       mandElement.GetString() == "true";

        var primaryKey = column.TryGetProperty("primaryKey", out var pkElement) &&
                        pkElement.GetString() == "true";

        var enumValues = new List<string>();
        if (column.TryGetProperty("enumValues", out var enumElement) &&
            enumElement.ValueKind == JsonValueKind.Array)
        {
            enumValues = enumElement.EnumerateArray()
                .Select(e => e.ValueKind == JsonValueKind.Number 
                    ? e.GetInt32().ToString() 
                    : e.GetString() ?? string.Empty)
                .Where(s => !string.IsNullOrEmpty(s))
                .ToList();
            
            _logger.LogInformation("Parsed enum values for attribute {Name}: [{Values}]", 
                name, 
                string.Join(", ", enumValues.Select(v => $"'{v}'")));
        }

        return new AttributeDefinition
        {
            Name = name,
            DisplayName = name,
            Description = description,
            Schema = type,
            IsRequired = mandatory,
            IsPrimaryKey = primaryKey,
            CanBePrimaryKey = true,
            EnumValues = enumValues.Count > 0 ? enumValues : null
        };
    }

    private AttributeDefinition? ParseAttribute(JsonElement content)
    {
        if (!content.TryGetProperty("name", out var nameElement))
        {
            return null;
        }

        var name = nameElement.GetString() ?? string.Empty;
        var displayName = content.TryGetProperty("displayName", out var dnElement) 
            ? dnElement.GetString() ?? name 
            : name;
        var description = content.TryGetProperty("description", out var descElement) 
            ? descElement.GetString() 
            : null;

        var schema = "string";
        if (content.TryGetProperty("schema", out var schemaElement))
        {
            if (schemaElement.ValueKind == JsonValueKind.String)
            {
                schema = schemaElement.GetString() ?? "string";
            }
            else if (schemaElement.ValueKind == JsonValueKind.Object)
            {
                schema = schemaElement.TryGetProperty("@type", out var typeElement) 
                    ? typeElement.GetString() ?? "string" 
                    : "string";
            }
        }

        return new AttributeDefinition
        {
            Name = name,
            DisplayName = displayName,
            Description = description,
            Schema = schema,
            IsRequired = false,
            CanBePrimaryKey = true
        };
    }

    private RelationshipDefinition? ParseRelationship(JsonElement content)
    {
        if (!content.TryGetProperty("name", out var nameElement) || 
            !content.TryGetProperty("target", out var targetElement))
        {
            return null;
        }

        var name = nameElement.GetString() ?? string.Empty;
        var displayName = content.TryGetProperty("displayName", out var dnElement) 
            ? dnElement.GetString() ?? name 
            : name;
        var description = content.TryGetProperty("description", out var descElement) 
            ? descElement.GetString() 
            : null;
        var targetId = targetElement.GetString() ?? string.Empty;
        var targetName = ExtractNameFromId(targetId);

        return new RelationshipDefinition
        {
            Name = name,
            DisplayName = displayName,
            Description = description,
            TargetEntityId = targetId,
            TargetEntityName = targetName,
            Cardinality = RelationshipCardinality.OneToMany,
            Direction = RelationshipDirection.Outgoing
        };
    }

    private string ExtractNameFromId(string id)
    {
        // Extract entity name from ID like "dtmi:digitaltwins:isa95:Equipment;1"
        var parts = id.Split(':');
        if (parts.Length > 0)
        {
            var lastPart = parts[^1];
            var nameWithVersion = lastPart.Split(';');
            return nameWithVersion[0];
        }
        return id;
    }
}
