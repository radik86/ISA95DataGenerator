namespace ISA95DataGenerator.Domain.Scenarios;

public class DataGenerationScenario
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public string RootEntityName { get; set; } = string.Empty;
    public List<string> IncludedRelatedEntities { get; set; } = new();
    public int InstanceCount { get; set; } = 10;
    public int Seed { get; set; } = 42;
    public int MaxDepth { get; set; } = 2;
    
    public List<ScenarioPrimaryKeyRule> PrimaryKeyRules { get; set; } = new();
    public List<ScenarioFieldRule> FieldRules { get; set; } = new();
}

public class ScenarioPrimaryKeyRule
{
    public string EntityName { get; set; } = string.Empty;
    public string AttributeName { get; set; } = string.Empty;
    public string RuleType { get; set; } = string.Empty;
    public string Parameters { get; set; } = "{}";
}

public class ScenarioFieldRule
{
    public string EntityName { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string RuleType { get; set; } = string.Empty;
    public string Parameters { get; set; } = "{}";
}
