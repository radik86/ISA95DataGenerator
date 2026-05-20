using ISA95DataGenerator.Domain.Rules;

namespace ISA95DataGenerator.Application.Interfaces;

/// <summary>
/// Service for managing and applying primary key rules
/// </summary>
public interface IPrimaryKeyRuleService
{
    Task SaveRuleAsync(PrimaryKeyRule rule);
    Task SaveRulesBatchAsync(IEnumerable<PrimaryKeyRule> rules);
    Task<PrimaryKeyRule?> GetRuleAsync(string entityName);
    Task<List<PrimaryKeyRule>> GetAllRulesAsync();
    string GeneratePrimaryKey(PrimaryKeyRule rule, Dictionary<string, object> entityData, int sequenceNumber);
    Task DeleteRuleAsync(string entityName);
}
