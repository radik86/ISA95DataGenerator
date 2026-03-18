using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using ISA95DataGenerator.Application.Interfaces;
using ISA95DataGenerator.Domain.Models;

namespace ISA95DataGenerator.Infrastructure.Services;

public class MappingFileService : IMappingFileService
{
    private readonly IMetadataLoaderService _metadataLoader;
    private static readonly string[] Isa95Terms =
    {
        "operations", "operation", "segment", "material", "equipment", "personnel", "person",
        "requirement", "requirements", "response", "responses", "actual", "actuals",
        "definition", "definitions", "property", "properties", "class", "classes",
        "capability", "capabilities", "specification", "specifications", "hierarchy", "scope",
        "line", "plant", "production", "test"
    };

    public MappingFileService(IMetadataLoaderService metadataLoader)
    {
        _metadataLoader = metadataLoader;
    }

    private string CapitalizeEntityName(string entityName)
    {
        if (string.IsNullOrEmpty(entityName))
            return entityName;

        var normalized = entityName.Trim().Replace("_", " ").Replace("-", " ");
        normalized = Regex.Replace(normalized, "([a-z])([A-Z])", "$1 $2");

        // Split collapsed ISA-95 names like 'Personnelrequirement'.
        if (!normalized.Contains(' '))
        {
            var lower = normalized.ToLowerInvariant();
            foreach (var term in Isa95Terms.OrderByDescending(t => t.Length))
            {
                lower = Regex.Replace(lower, term, $" {term} ");
            }
            normalized = Regex.Replace(lower, "\\s+", " ").Trim();
        }

        var words = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        for (int i = 0; i < words.Length; i++)
        {
            if (!string.IsNullOrEmpty(words[i]))
            {
                words[i] = char.ToUpper(words[i][0]) + words[i][1..];
            }
        }
        return string.Join(" ", words);
    }

    public async Task<MappingFile> GenerateMappingFileAsync(DataGenerationRequest request, DataGenerationResponse generatedData)
    {
        var mappingFile = new MappingFile
        {
            GeneratedAt = DateTime.UtcNow,
            GeneratorVersion = "1.0.0"
        };

        var rootEntityData = generatedData.GeneratedData.GetValueOrDefault(request.RootEntityName);
        if (rootEntityData == null || rootEntityData.Count == 0)
        {
            return mappingFile;
        }

        var rootEntity = await _metadataLoader.GetEntityByNameAsync(request.RootEntityName);
        if (rootEntity == null)
        {
            return mappingFile;
        }

        foreach (var relationship in rootEntity.Relationships)
        {
            var targetEntityName = relationship.TargetEntityName;
            
            if (!generatedData.GeneratedData.ContainsKey(targetEntityName))
            {
                continue;
            }

            foreach (var rootInstance in rootEntityData)
            {
                var sourcePK = rootInstance["id"].ToString() ?? string.Empty;
                var refKey = $"_{relationship.Name}_References";

                if (rootInstance.TryGetValue(refKey, out var references) && references is List<object> refList)
                {
                    foreach (var targetPK in refList)
                    {
                        mappingFile.Mappings.Add(new MappingEntry
                        {
                            SourceType = CapitalizeEntityName(request.RootEntityName),
                            SourcePrimaryKey = sourcePK,
                            TargetType = CapitalizeEntityName(targetEntityName),
                            TargetPrimaryKey = targetPK?.ToString() ?? string.Empty,
                            RelationshipType = relationship.Name
                        });
                    }
                }
            }
        }

        foreach (var kvp in generatedData.GeneratedData)
        {
            if (kvp.Key == request.RootEntityName)
            {
                continue;
            }

            var entity = await _metadataLoader.GetEntityByNameAsync(kvp.Key);
            if (entity == null)
            {
                continue;
            }

            foreach (var relationship in entity.Relationships)
            {
                var targetEntityName = relationship.TargetEntityName;
                
                if (!generatedData.GeneratedData.ContainsKey(targetEntityName))
                {
                    continue;
                }

                foreach (var instance in kvp.Value)
                {
                    var sourcePK = instance["id"].ToString() ?? string.Empty;
                    var refKey = $"_{relationship.Name}_References";

                    if (instance.TryGetValue(refKey, out var references) && references is List<object> refList)
                    {
                        foreach (var targetPK in refList)
                        {
                            var exists = mappingFile.Mappings.Any(m =>
                                m.SourceType == kvp.Key &&
                                m.SourcePrimaryKey == sourcePK &&
                                m.TargetType == targetEntityName &&
                                m.TargetPrimaryKey == targetPK?.ToString() &&
                                m.RelationshipType == relationship.Name);

                            if (!exists)
                            {
                                mappingFile.Mappings.Add(new MappingEntry
                                {
                                    SourceType = CapitalizeEntityName(kvp.Key),
                                    SourcePrimaryKey = sourcePK,
                                    TargetType = CapitalizeEntityName(targetEntityName),
                                    TargetPrimaryKey = targetPK?.ToString() ?? string.Empty,
                                    RelationshipType = relationship.Name
                                });
                            }
                        }
                    }
                }
            }
        }

        // Also process any references from cardinality rules that weren't in metadata
        // Check all entities for any _*_References fields that weren't already processed
        foreach (var kvp in generatedData.GeneratedData)
        {
            foreach (var instance in kvp.Value)
            {
                var sourcePK = instance["id"].ToString() ?? string.Empty;
                
                // Find all reference keys in this instance
                var referenceKeys = instance.Keys
                    .Where(k => k.StartsWith("_") && k.EndsWith("_References"))
                    .ToList();

                foreach (var refKey in referenceKeys)
                {
                    // Extract relationship name from key (e.g., "_Is made up of_References" -> "Is made up of")
                    var relationshipName = refKey.Substring(1, refKey.Length - "_References".Length - 1);
                    
                    if (instance.TryGetValue(refKey, out var references) && references is List<object> refList)
                    {
                        foreach (var targetPK in refList)
                        {
                            // Find which entity this PK belongs to
                            string? targetEntityName = null;
                            foreach (var targetEntityKvp in generatedData.GeneratedData)
                            {
                                if (targetEntityKvp.Value.Any(inst => 
                                    inst["id"].ToString() == targetPK?.ToString()))
                                {
                                    targetEntityName = targetEntityKvp.Key;
                                    break;
                                }
                            }

                            if (targetEntityName != null)
                            {
                                // Check if this mapping already exists
                                var exists = mappingFile.Mappings.Any(m =>
                                    m.SourceType == kvp.Key &&
                                    m.SourcePrimaryKey == sourcePK &&
                                    m.TargetType == targetEntityName &&
                                    m.TargetPrimaryKey == targetPK?.ToString() &&
                                    m.RelationshipType == relationshipName);

                                if (!exists)
                                {
                                    mappingFile.Mappings.Add(new MappingEntry
                                    {
                                        SourceType = CapitalizeEntityName(kvp.Key),
                                        SourcePrimaryKey = sourcePK,
                                        TargetType = CapitalizeEntityName(targetEntityName),
                                        TargetPrimaryKey = targetPK?.ToString() ?? string.Empty,
                                        RelationshipType = relationshipName
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        return mappingFile;
    }

    public async Task<byte[]> ExportMappingFileAsJsonAsync(MappingFile mappingFile)
    {
        var json = JsonSerializer.Serialize(mappingFile, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        return Encoding.UTF8.GetBytes(json);
    }
}
