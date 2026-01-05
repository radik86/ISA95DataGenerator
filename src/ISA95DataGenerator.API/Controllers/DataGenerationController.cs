using System.IO.Compression;
using ISA95DataGenerator.Application.Interfaces;
using ISA95DataGenerator.Domain.Models;
using Microsoft.AspNetCore.Mvc;

namespace ISA95DataGenerator.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DataGenerationController : ControllerBase
{
    private readonly ITestDataGeneratorService _generatorService;
    private readonly IMappingFileService _mappingFileService;
    private readonly ILogger<DataGenerationController> _logger;

    public DataGenerationController(
        ITestDataGeneratorService generatorService,
        IMappingFileService mappingFileService,
        ILogger<DataGenerationController> logger)
    {
        _generatorService = generatorService;
        _mappingFileService = mappingFileService;
        _logger = logger;
    }

    [HttpPost("generate-data")]
    public async Task<IActionResult> GenerateData([FromBody] DataGenerationRequest request)
    {
        try
        {
            _logger.LogInformation("Generating data for entity {EntityName}", request.RootEntityName);
            
            var response = await _generatorService.GenerateDataAsync(request);
            
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating data");
            return StatusCode(500, new { error = "Failed to generate data", message = ex.Message });
        }
    }

    [HttpPost("generate-mapping")]
    public async Task<IActionResult> GenerateMappingFile([FromBody] DataGenerationRequest request)
    {
        try
        {
            _logger.LogInformation("Generating mapping file for entity {EntityName}", request.RootEntityName);
            
            var response = await _generatorService.GenerateDataAsync(request);
            
            return Ok(response.MappingFile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating mapping file");
            return StatusCode(500, new { error = "Failed to generate mapping file", message = ex.Message });
        }
    }

    [HttpPost("download")]
    public async Task<IActionResult> DownloadGeneratedData([FromBody] DataGenerationRequest request)
    {
        try
        {
            _logger.LogInformation("Preparing download for entity {EntityName}", request.RootEntityName);
            
            var response = await _generatorService.GenerateDataAsync(request);
            
            using var memoryStream = new MemoryStream();
            using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
            {
                // Generate CSV file for each entity
                _logger.LogInformation("\n--- CSV Export: Creating {Count} files ---", response.GeneratedData.Count);
                foreach (var kvp in response.GeneratedData)
                {
                    _logger.LogInformation("Exporting {EntityName}.csv ({InstanceCount} rows)", kvp.Key, kvp.Value.Count);
                    
                    var entry = archive.CreateEntry($"{kvp.Key}.csv");
                    using var entryStream = entry.Open();
                    using var writer = new StreamWriter(entryStream);
                    
                    if (kvp.Value.Count > 0)
                    {
                        // Write CSV header - include id and other fields, exclude internal fields starting with _
                        var firstRow = kvp.Value[0];
                        var dataHeaders = firstRow.Keys
                            .Where(k => k == "id" || !k.StartsWith("_"))
                            .OrderBy(k => k == "id" ? 0 : 1) // Put id first
                            .ToList();
                        
                        // Add PrimaryKey as first column, then id, then rest
                        var allHeaders = new List<string> { "PrimaryKey", "id" };
                        allHeaders.AddRange(dataHeaders.Where(h => h != "id"));
                        
                        await writer.WriteLineAsync(string.Join(",", allHeaders.Select(h => $"\"{h}\"")));
                        
                        // Write CSV rows
                        foreach (var row in kvp.Value)
                        {
                            var values = allHeaders.Select(h =>
                            {
                                // PrimaryKey and id have the same value
                                var value = h == "PrimaryKey" ? (row.ContainsKey("id") ? row["id"] : "") : (row.ContainsKey(h) ? row[h] : "");
                                if (value is System.Collections.IEnumerable enumerable && value is not string)
                                {
                                    var items = enumerable.Cast<object>().Select(i => i?.ToString() ?? "");
                                    return $"\"{string.Join(";", items)}\"";
                                }
                                return $"\"{value?.ToString()?.Replace("\"", "\"\"") ?? ""}\"";
                            });
                            await writer.WriteLineAsync(string.Join(",", values));
                        }
                    }
                }

                // Generate separate mapping CSV file for each relationship
                _logger.LogInformation("Generating mapping files. Total mappings: {Count}", response.MappingFile.Mappings.Count);
                
                var mappingsByRelationship = response.MappingFile.Mappings
                    .GroupBy(m => new { m.SourceType, m.TargetType, m.RelationshipType })
                    .ToList();
                
                _logger.LogInformation("Grouped into {Count} relationship files", mappingsByRelationship.Count);
                
                foreach (var group in mappingsByRelationship)
                {
                    // Format: ParentEntity_to_ChildEntity_mapping.csv
                    var mappingFileName = $"{group.Key.SourceType}_to_{group.Key.TargetType}_mapping.csv";
                    _logger.LogInformation("Creating mapping file: {FileName} with {Count} mappings", mappingFileName, group.Count());
                    
                    var mappingEntry = archive.CreateEntry(mappingFileName);
                    using var mappingStream = mappingEntry.Open();
                    using var mappingWriter = new StreamWriter(mappingStream);
                    
                    // Write mapping CSV header
                    await mappingWriter.WriteLineAsync("\"Source type\",\"Source PrimaryKey\",\"Target type\",\"Target PrimaryKey\",\"Relationship Type\"");
                    
                    // Write mapping rows for this relationship
                    foreach (var mapping in group)
                    {
                        await mappingWriter.WriteLineAsync($"\"{mapping.SourceType}\",\"{mapping.SourcePrimaryKey}\",\"{mapping.TargetType}\",\"{mapping.TargetPrimaryKey}\",\"{mapping.RelationshipType}\"");
                    }
                }
            }

            memoryStream.Position = 0;
            var fileName = $"ISA95_TestData_{request.RootEntityName}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.zip";
            
            return File(memoryStream.ToArray(), "application/zip", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error preparing download");
            return StatusCode(500, new { error = "Failed to prepare download", message = ex.Message });
        }
    }
}
