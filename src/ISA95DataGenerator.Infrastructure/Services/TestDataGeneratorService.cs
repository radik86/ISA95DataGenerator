using ISA95DataGenerator.Application.Interfaces;
using ISA95DataGenerator.Domain.Entities;
using ISA95DataGenerator.Domain.Models;
using ISA95DataGenerator.Domain.Rules;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ISA95DataGenerator.Infrastructure.Services;

public class TestDataGeneratorService : ITestDataGeneratorService
{
    private readonly IMetadataLoaderService _metadataLoader;
    private readonly IGraphTraversalService _graphTraversal;
    private readonly IPrimaryKeyRuleService _pkRuleService;
    private readonly IFieldRuleService _fieldRuleService;
    private readonly IMappingFileService _mappingFileService;
    private readonly ILogger<TestDataGeneratorService> _logger;
    private readonly IConfiguration _configuration;
    private bool VerboseLogging => _configuration.GetValue<bool>("VerboseLogging", false);

    public TestDataGeneratorService(
        IMetadataLoaderService metadataLoader,
        IGraphTraversalService graphTraversal,
        IPrimaryKeyRuleService pkRuleService,
        IFieldRuleService fieldRuleService,
        IMappingFileService mappingFileService,
        ILogger<TestDataGeneratorService> logger,
        IConfiguration configuration)
    {
        _metadataLoader = metadataLoader;
        _graphTraversal = graphTraversal;
        _pkRuleService = pkRuleService;
        _fieldRuleService = fieldRuleService;
        _mappingFileService = mappingFileService;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<DataGenerationResponse> GenerateDataAsync(DataGenerationRequest request)
    {
        _logger.LogInformation("\n========== DATA GENERATION START: {EntityName} ==========", request.RootEntityName);
        
        if (VerboseLogging)
        {
            _logger.LogInformation("Request Details: ExcludedFields=[{Fields}], FieldRules={RuleCount}", 
                string.Join(", ", request.ExcludedFields ?? new List<string>()), 
                request.FieldRules?.Count ?? 0);
        }

        var random = new Random(request.Seed ?? 42);

        if (request.PrimaryKeyRules.Count > 0)
            await _pkRuleService.SaveRulesBatchAsync(request.PrimaryKeyRules);

        if (request.FieldRules.Count > 0)
            await _fieldRuleService.SaveRulesBatchAsync(request.FieldRules);

        var generatedData = new Dictionary<string, List<Dictionary<string, object>>>();
        var instanceCache = new Dictionary<string, List<Dictionary<string, object>>>();
        var visited = new HashSet<string>();

        var rootEntity = await _metadataLoader.GetEntityByNameAsync(request.RootEntityName);
        if (rootEntity == null)
        {
            throw new InvalidOperationException($"Entity {request.RootEntityName} not found");
        }

        // Use entity-specific instance count if provided, otherwise use global count
        int rootInstanceCount = request.EntityInstanceCounts?.GetValueOrDefault(request.RootEntityName) 
                                ?? request.InstanceCount;

        _logger.LogInformation("\n--- Generating Root Entity: {EntityName} ({Count} instances) ---", 
            request.RootEntityName, rootInstanceCount);

        var rootInstances = await GenerateEntityInstancesAsync(
            rootEntity, 
            rootInstanceCount, 
            random, 
            instanceCache,
            request.ExcludedFields);

        generatedData[request.RootEntityName] = rootInstances;

        // First, generate all entities that are explicitly included in the graph
        // BUT skip entities that have cardinality rules (they'll be generated based on relationships)
        var entitiesWithCardinality = new HashSet<string>(
            request.RelationshipCardinalities?.Select(rc => rc.TargetEntity) ?? Enumerable.Empty<string>()
        );
        
        _logger.LogInformation("Pre-generating entities. Included: {Count}, With cardinality: {CardinalityCount}", 
            request.IncludedRelatedEntities.Count, entitiesWithCardinality.Count);
        
        foreach (var entityName in request.IncludedRelatedEntities)
        {
            // Skip if entity already exists or has cardinality rule
            if (!generatedData.ContainsKey(entityName) && !entitiesWithCardinality.Contains(entityName))
            {
                var entity = await _metadataLoader.GetEntityByNameAsync(entityName);
                if (entity != null)
                {
                    int entityInstanceCount = request.EntityInstanceCounts?.GetValueOrDefault(entityName) 
                                            ?? request.InstanceCount;
                    
                    _logger.LogInformation("\n--- Generating Related Entity: {EntityName} ({Count} instances) ---", 
                        entityName, entityInstanceCount);
                    
                    var instances = await GenerateEntityInstancesAsync(
                        entity,
                        entityInstanceCount,
                        random,
                        instanceCache,
                        request.ExcludedFields);
                    
                    generatedData[entityName] = instances;
                }
                else
                {
                    _logger.LogWarning("Entity {EntityName} not found in metadata", entityName);
                }
            }
        }

        // Then, process relationships between entities
        _logger.LogInformation("\n========== Processing Relationships ==========");
        await GenerateRelatedEntitiesAsync(
            request.RootEntityName,
            rootInstances,
            request.IncludedRelatedEntities,
            0,
            request.MaxDepth,
            random,
            generatedData,
            instanceCache,
            visited,
            request.ExcludedFields,
            request);

        var response = new DataGenerationResponse
        {
            GeneratedData = generatedData,
            TotalInstancesGenerated = generatedData.Values.Sum(v => v.Count),
            GeneratedAt = DateTime.UtcNow
        };

        if (!request.SkipMappingFile)
            response.MappingFile = await _mappingFileService.GenerateMappingFileAsync(request, response);

        _logger.LogInformation("\n========== DATA GENERATION COMPLETE: {Count} total instances ==========", response.TotalInstancesGenerated);
        
        // Verbose: Log sample data from first instance of each entity to verify data integrity
        if (VerboseLogging)
        {
            foreach (var entityData in generatedData.Take(3))
            {
                if (entityData.Value.Count > 0)
                {
                    var firstInstance = entityData.Value[0];
                    var enumFields = firstInstance.Where(kvp => !kvp.Key.StartsWith("_") && kvp.Value is string);
                    _logger.LogInformation("Sample {EntityName}[0]: {Fields}", 
                        entityData.Key, 
                        string.Join(", ", enumFields.Take(3).Select(f => $"{f.Key}='{f.Value}'"
                        )));
                }
            }
        }

        return response;
    }

    private async Task<List<Dictionary<string, object>>> GenerateEntityInstancesAsync(
        EntityDefinition entity,
        int count,
        Random random,
        Dictionary<string, List<Dictionary<string, object>>> instanceCache,
        List<string> excludedFields)
    {
        var instances = new List<Dictionary<string, object>>();

        _logger.LogInformation("{EntityName}: Processing {AttributeCount} attributes...", 
            entity.Name, entity.Attributes.Count);

        // Pre-fetch all rules once per entity (not once per instance × attribute)
        var excludedFieldKeys = new HashSet<string>(excludedFields);
        var fieldRuleCache = new Dictionary<string, ISA95DataGenerator.Domain.Rules.FieldRule?>();
        foreach (var attribute in entity.Attributes)
        {
            if (!excludedFieldKeys.Contains($"{entity.Name}.{attribute.Name}"))
                fieldRuleCache[attribute.Name] = await _fieldRuleService.GetRuleAsync(entity.Name, attribute.Name);
        }
        var pkRule = await _pkRuleService.GetRuleAsync(entity.Name);

        for (int i = 0; i < count; i++)
        {
            var instance = new Dictionary<string, object>();

            foreach (var attribute in entity.Attributes)
            {
                // Skip excluded fields based on checkbox selection
                if (excludedFieldKeys.Contains($"{entity.Name}.{attribute.Name}"))
                {
                    if (VerboseLogging)
                        _logger.LogInformation("{EntityName}: Skipping excluded field '{FieldName}'", entity.Name, attribute.Name);
                    continue;
                }

                var fieldRule = fieldRuleCache.GetValueOrDefault(attribute.Name);
                
                object value;
                if (fieldRule != null)
                {
                    value = _fieldRuleService.GenerateFieldValue(fieldRule, attribute, random);
                }
                else
                {
                    value = GenerateDefaultValue(attribute, random);
                }

                if (VerboseLogging && attribute.EnumValues != null && attribute.EnumValues.Count > 0)
                {
                    _logger.LogInformation("{EntityName}.{FieldName} = '{Value}' (Enum)", 
                        entity.Name, attribute.Name, value);
                }
                
                instance[attribute.Name] = value;
            }

            string primaryKey;
            
            if (pkRule != null)
            {
                primaryKey = _pkRuleService.GeneratePrimaryKey(pkRule, instance, i + 1);
            }
            else
            {
                primaryKey = $"{entity.Name}_{i + 1:D4}";
            }

            instance["id"] = primaryKey;
            instance["_EntityType"] = entity.Name;
            instances.Add(instance);
        }

        if (!instanceCache.ContainsKey(entity.Name))
        {
            instanceCache[entity.Name] = new List<Dictionary<string, object>>();
        }
        instanceCache[entity.Name].AddRange(instances);

        _logger.LogInformation("{EntityName}: ✓ Generated {Count} instances successfully", entity.Name, instances.Count);

        return instances;
    }

    private async Task GenerateRelatedEntitiesAsync(
        string entityName,
        List<Dictionary<string, object>> parentInstances,
        List<string> includedEntities,
        int currentDepth,
        int maxDepth,
        Random random,
        Dictionary<string, List<Dictionary<string, object>>> generatedData,
        Dictionary<string, List<Dictionary<string, object>>> instanceCache,
        HashSet<string> visited,
        List<string> excludedFields,
        DataGenerationRequest request)
    {
        if (currentDepth >= maxDepth || visited.Contains(entityName))
        {
            if (VerboseLogging)
                _logger.LogInformation("Skipping {EntityName} - Depth: {Depth}/{MaxDepth}, Visited: {Visited}", 
                    entityName, currentDepth, maxDepth, visited.Contains(entityName));
            return;
        }

        visited.Add(entityName);
        
        if (VerboseLogging)
        {
            _logger.LogInformation("Processing relationships for {EntityName} at depth {Depth}", entityName, currentDepth);
        }

        var relationships = await _graphTraversal.GetRelatedEntitiesAsync(entityName);
        
        if (VerboseLogging && relationships.Any())
        {
            _logger.LogInformation("Found {Count} relationships for {EntityName}", relationships.Count(), entityName);
        }

        foreach (var relationship in relationships)
        {
            if (VerboseLogging)
                _logger.LogInformation("Checking relationship {RelName}: {Source} -> {Target}", 
                    relationship.Name, entityName, relationship.TargetEntityName);
                
            if (includedEntities.Count > 0 && 
                !includedEntities.Contains(relationship.TargetEntityName))
            {
                if (VerboseLogging)
                    _logger.LogInformation("Skipping {Target} - not in included entities list", relationship.TargetEntityName);
                continue;
            }

            var targetEntity = await _metadataLoader.GetEntityByNameAsync(relationship.TargetEntityName);
            if (targetEntity == null)
            {
                continue;
            }

            // Check if there's a specific cardinality rule for this relationship
            var cardinalityRule = request.RelationshipCardinalities?.FirstOrDefault(rc =>
                rc.SourceEntity == entityName &&
                rc.TargetEntity == relationship.TargetEntityName &&
                rc.RelationshipName == relationship.Name);

            int instanceCount;
            if (cardinalityRule != null)
            {
                // Use the cardinality from the graph configuration
                instanceCount = cardinalityRule.Cardinality;
            }
            else
            {
                // Use the default cardinality based on relationship type
                instanceCount = relationship.Cardinality switch
                {
                    RelationshipCardinality.OneToOne => 1,
                    RelationshipCardinality.OneToMany => random.Next(1, 5),
                    RelationshipCardinality.ManyToOne => 1,
                    RelationshipCardinality.ManyToMany => random.Next(2, 6),
                    _ => 1
                };
            }

            List<Dictionary<string, object>> relatedInstances;

            // If cardinality rule exists, always generate based on cardinality (parent count × cardinality)
            if (cardinalityRule != null)
            {
                var totalToGenerate = parentInstances.Count * instanceCount;
                
                // Check if we already have enough instances for this entity
                if (generatedData.ContainsKey(targetEntity.Name) && 
                    generatedData[targetEntity.Name].Count >= totalToGenerate)
                {
                    // Use existing instances
                    relatedInstances = generatedData[targetEntity.Name].Take(totalToGenerate).ToList();
                }
                else
                {
                    // Generate new instances based on cardinality
                    relatedInstances = await GenerateEntityInstancesAsync(
                        targetEntity,
                        totalToGenerate,
                        random,
                        instanceCache,
                        excludedFields);
                    
                    // Clear any pre-generated instances since cardinality takes precedence
                    if (generatedData.ContainsKey(targetEntity.Name))
                    {
                        generatedData[targetEntity.Name].Clear();
                    }
                }
            }
            // If entity was already generated (from pre-generation) and no cardinality, use those instances
            else if (generatedData.ContainsKey(targetEntity.Name))
            {
                relatedInstances = generatedData[targetEntity.Name];
            }
            // Check if entity has specific instance count in request
            else if (request.EntityInstanceCounts?.ContainsKey(targetEntity.Name) == true)
            {
                // Generate specific number of instances for this entity
                var entityInstanceCount = request.EntityInstanceCounts[targetEntity.Name];
                relatedInstances = await GenerateEntityInstancesAsync(
                    targetEntity,
                    entityInstanceCount,
                    random,
                    instanceCache,
                    excludedFields);
            }
            else if (instanceCache.TryGetValue(targetEntity.Name, out var cachedInstances) && 
                cachedInstances.Count > 0)
            {
                relatedInstances = cachedInstances.Take(instanceCount * parentInstances.Count).ToList();
            }
            else
            {
                var totalToGenerate = parentInstances.Count * instanceCount;
                relatedInstances = await GenerateEntityInstancesAsync(
                    targetEntity,
                    totalToGenerate,
                    random,
                    instanceCache,
                    excludedFields);
            }

            if (!generatedData.ContainsKey(targetEntity.Name))
            {
                generatedData[targetEntity.Name] = new List<Dictionary<string, object>>();
            }

            var seenIds = new HashSet<string>(generatedData[targetEntity.Name].Select(x => x["id"].ToString()!));
            foreach (var instance in relatedInstances)
            {
                if (seenIds.Add(instance["id"].ToString()!))
                    generatedData[targetEntity.Name].Add(instance);
            }

            for (int i = 0; i < parentInstances.Count; i++)
            {
                var parent = parentInstances[i];
                var relatedForParent = relatedInstances.Skip(i * instanceCount).Take(instanceCount).ToList();
                
                if (relatedForParent.Count > 0)
                {
                    parent[$"_{relationship.Name}_References"] = relatedForParent
                        .Select(r => r["id"])
                        .ToList();
                }
            }

            await GenerateRelatedEntitiesAsync(
                relationship.TargetEntityName,
                relatedInstances,
                includedEntities,
                currentDepth + 1,
                maxDepth,
                random,
                generatedData,
                instanceCache,
                visited,
                excludedFields,
                request);
        }

        // Also process any cardinality rules from the request that weren't in metadata relationships
        if (request.RelationshipCardinalities != null)
        {
            var cardinalityRulesForThisEntity = request.RelationshipCardinalities
                .Where(rc => rc.SourceEntity == entityName)
                .ToList();

            if (VerboseLogging && cardinalityRulesForThisEntity.Any())
            {
                _logger.LogInformation("Found {Count} cardinality rules for {EntityName} in request", 
                    cardinalityRulesForThisEntity.Count, entityName);
            }

            foreach (var cardRule in cardinalityRulesForThisEntity)
            {
                // Check if this was already processed via metadata relationships
                bool alreadyProcessed = relationships.Any(r => 
                    r.TargetEntityName == cardRule.TargetEntity && 
                    r.Name == cardRule.RelationshipName);

                if (alreadyProcessed)
                {
                    if (VerboseLogging)
                        _logger.LogInformation("Cardinality rule {Source} -> {Target} already processed via metadata", 
                            cardRule.SourceEntity, cardRule.TargetEntity);
                    continue;
                }

                // This is a cardinality rule not in metadata - process it
                if (VerboseLogging)
                    _logger.LogInformation("Processing cardinality rule from request: {Source} -> {Target} ({RelName})", 
                        cardRule.SourceEntity, cardRule.TargetEntity, cardRule.RelationshipName);

                if (includedEntities.Count > 0 && !includedEntities.Contains(cardRule.TargetEntity))
                {
                    if (VerboseLogging)
                        _logger.LogInformation("Skipping {Target} - not in included entities list", cardRule.TargetEntity);
                    continue;
                }

                var targetEntity = await _metadataLoader.GetEntityByNameAsync(cardRule.TargetEntity);
                if (targetEntity == null)
                {
                    _logger.LogWarning("Target entity {Target} not found in metadata", cardRule.TargetEntity);
                    continue;
                }

                var totalToGenerate = parentInstances.Count * cardRule.Cardinality;
                
                _logger.LogInformation("\n--- Generating Related Entity: {Entity} ({Count} instances via cardinality) ---",
                    targetEntity.Name, totalToGenerate);

                var relatedInstances = await GenerateEntityInstancesAsync(
                    targetEntity,
                    totalToGenerate,
                    random,
                    instanceCache,
                    excludedFields);

                if (!generatedData.ContainsKey(targetEntity.Name))
                {
                    generatedData[targetEntity.Name] = new List<Dictionary<string, object>>();
                }

                var seenCardIds = new HashSet<string>(generatedData[targetEntity.Name].Select(x => x["id"].ToString()!));
                foreach (var instance in relatedInstances)
                {
                    if (seenCardIds.Add(instance["id"].ToString()!))
                        generatedData[targetEntity.Name].Add(instance);
                }

                // Create parent-child mappings
                for (int i = 0; i < parentInstances.Count; i++)
                {
                    var parent = parentInstances[i];
                    var relatedForParent = relatedInstances.Skip(i * cardRule.Cardinality).Take(cardRule.Cardinality).ToList();
                    
                    if (relatedForParent.Count > 0)
                    {
                        parent[$"_{cardRule.RelationshipName}_References"] = relatedForParent
                            .Select(r => r["id"])
                            .ToList();
                    }
                }

                // Recursively process children
                await GenerateRelatedEntitiesAsync(
                    cardRule.TargetEntity,
                    relatedInstances,
                    includedEntities,
                    currentDepth + 1,
                    maxDepth,
                    random,
                    generatedData,
                    instanceCache,
                    visited,
                    excludedFields,
                    request);
            }
        }
    }

    private object GenerateDefaultValue(AttributeDefinition attribute, Random random)
    {
        if (attribute.EnumValues != null && attribute.EnumValues.Count > 0)
        {
            // DIAGNOSTIC: Log what's actually in the enum values array
            if (attribute.Name == "operationsType")
            {
                _logger.LogInformation("DIAGNOSTIC GenerateDefaultValue: operationsType EnumValues.Count = {Count}", 
                    attribute.EnumValues.Count);
                _logger.LogInformation("DIAGNOSTIC GenerateDefaultValue: EnumValues = [{Values}]", 
                    string.Join(", ", attribute.EnumValues.Select((v, i) => $"[{i}]='{v.EnumValue}' (len:{v.EnumValue?.Length ?? 0})")));
            }
            
            var selectedIndex = random.Next(attribute.EnumValues.Count);
            var selectedValue = attribute.EnumValues[selectedIndex].EnumValue;
            
            if (attribute.Name == "operationsType")
            {
                _logger.LogInformation("DIAGNOSTIC GenerateDefaultValue: Selected index {Index}, value = '{Value}' (len:{Length})", 
                    selectedIndex, selectedValue, selectedValue?.Length ?? 0);
            }
            
            return selectedValue;
        }

        if (VerboseLogging)
        {
            _logger.LogInformation("Generating default value for {AttributeName} with schema {Schema}, no enum values available", 
                attribute.Name, attribute.Schema);
        }

        return attribute.Schema.ToLower() switch
        {
            "integer" or "int" => random.Next(1, 1000),
            "double" or "float" => random.NextDouble() * 1000,
            "boolean" or "bool" => random.Next(2) == 0,
            "datetime" => DateTime.Now.AddDays(random.Next(-365, 365)),
            "string" => $"{attribute.Name}_{Guid.NewGuid().ToString()[..8]}",
            _ => $"Value_{random.Next(1000)}"
        };
    }
}
