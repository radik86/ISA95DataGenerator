using ISA95DataGenerator.Domain.Rules;
using ISA95DataGenerator.Domain.Entities;

namespace ISA95DataGenerator.Application.Interfaces;

/// <summary>
/// Service for managing and applying field generation rules
/// </summary>
public interface IFieldRuleService
{
    Task SaveRuleAsync(FieldRule rule);
    Task<FieldRule?> GetRuleAsync(string entityName, string fieldName);
    Task<List<FieldRule>> GetRulesForEntityAsync(string entityName);
    Task<List<FieldRule>> GetAllRulesAsync();
    object GenerateFieldValue(FieldRule rule, AttributeDefinition attribute, Random random);
    object GenerateFieldValue(FieldRule rule, AttributeDefinition attribute, Random random, Dictionary<string, object>? sourceData);
    Task DeleteRuleAsync(string entityName, string fieldName);
    
    /// <summary>
    /// Register lookup data from a source table for use in Lookup rules
    /// </summary>
    void RegisterLookupData(string tableName, List<Dictionary<string, object>> data);
    
    /// <summary>
    /// Clear all registered lookup data
    /// </summary>
    void ClearLookupData();
    
    /// <summary>
    /// Get registered lookup table names
    /// </summary>
    IEnumerable<string> GetRegisteredLookupTables();
}
