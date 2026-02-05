namespace ISA95DataGenerator.Domain.Rules;

/// <summary>
/// Defines how field values are generated
/// </summary>
public class FieldRule
{
    public string EntityName { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public FieldRuleType RuleType { get; set; }
    public object? Parameters { get; set; } // Flexible parameters based on RuleType
}

public enum FieldRuleType
{
    Range,          // Parameters: { Min, Max }
    Examples,       // Parameters: { Values: string[] }
    Pattern,        // Parameters: { Regex: string }
    Static,         // Parameters: { Value: object }
    Sequence,       // Parameters: { Start: int, Increment: int }
    PrefixSequence, // Parameters: { Prefix, Suffix, Start, End, Padding }
    Enumeration,    // Parameters: { Values: string[] } - from field's enum values
    IfThen,         // Parameters: { Condition: string, TrueValue: object, FalseValue: object }
    Case,           // Parameters: { Cases: [{Case: string, Value: object}], DefaultValue: object }
    Lookup          // Parameters: { SourceTable, JoinConditions, ReturnField, DefaultValue }
}

// Specific parameter classes for type safety
public class RangeParameters
{
    public object? Min { get; set; }
    public object? Max { get; set; }
}

public class ExamplesParameters
{
    public List<string> Values { get; set; } = new();
}

public class PatternParameters
{
    public string Regex { get; set; } = string.Empty;
}

public class StaticParameters
{
    public object? Value { get; set; }
}

public class SequenceParameters
{
    public int Start { get; set; } = 1;
    public int Increment { get; set; } = 1;
    public int? Max { get; set; }
}

public class PrefixSequenceParameters
{
    public string? Prefix { get; set; }
    public string? Suffix { get; set; }
    public int Start { get; set; } = 1;
    public int End { get; set; } = 100;
    public int? Padding { get; set; }
}

public class EnumerationParameters
{
    public List<string> Values { get; set; } = new();
}

public class IfThenParameters
{
    public string? SourceField { get; set; }
    public string Condition { get; set; } = string.Empty;
    public object? TrueValue { get; set; }
    public object? FalseValue { get; set; }
}

public class CaseParameters
{
    public string? SourceField { get; set; }
    public List<CaseItem> Cases { get; set; } = new();
    public object? DefaultValue { get; set; }
}

public class CaseItem
{
    public string Case { get; set; } = string.Empty;
    public object? Value { get; set; }
}

/// <summary>
/// Parameters for Lookup field rule - retrieves values from other tables via join conditions
/// </summary>
public class LookupParameters
{
    /// <summary>
    /// Name of the source table to lookup from
    /// </summary>
    public string SourceTable { get; set; } = string.Empty;
    
    /// <summary>
    /// Join conditions to match records
    /// </summary>
    public List<JoinCondition> JoinConditions { get; set; } = new();
    
    /// <summary>
    /// Field name to return from the source table
    /// </summary>
    public string ReturnField { get; set; } = string.Empty;
    
    /// <summary>
    /// Default value if no match is found
    /// </summary>
    public object? DefaultValue { get; set; }
    
    /// <summary>
    /// Behavior when multiple matches are found: first, last, random, error
    /// </summary>
    public string MultipleMatchBehavior { get; set; } = "first";
}

/// <summary>
/// Defines how to join current record with source table
/// </summary>
public class JoinCondition
{
    /// <summary>
    /// Type of join: field (single), composite (multiple fields), concatenation (expression-based)
    /// </summary>
    public string Type { get; set; } = "field";
    
    /// <summary>
    /// For 'field' type: field in the current record
    /// </summary>
    public string? LocalField { get; set; }
    
    /// <summary>
    /// For 'field' type: field in the source table
    /// </summary>
    public string? SourceField { get; set; }
    
    /// <summary>
    /// For 'composite' type: multiple fields in current record
    /// </summary>
    public List<string>? LocalFields { get; set; }
    
    /// <summary>
    /// For 'composite' type: multiple fields in source table
    /// </summary>
    public List<string>? SourceFields { get; set; }
    
    /// <summary>
    /// For 'concatenation' type: expression like "{field1}-{field2}"
    /// </summary>
    public string? LocalExpression { get; set; }
    
    /// <summary>
    /// For 'concatenation' type: expression for source table
    /// </summary>
    public string? SourceExpression { get; set; }
}
