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
    Case            // Parameters: { Cases: [{Case: string, Value: object}], DefaultValue: object }
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
