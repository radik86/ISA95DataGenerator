using System.Text.Json;
using System.Text.RegularExpressions;
using ISA95DataGenerator.Application.Interfaces;
using ISA95DataGenerator.Domain.Entities;
using ISA95DataGenerator.Domain.Rules;
using Microsoft.Extensions.Logging;

namespace ISA95DataGenerator.Infrastructure.Services;

public class FieldRuleService : IFieldRuleService
{
    private readonly Dictionary<string, Dictionary<string, FieldRule>> _rules = new();
    private readonly Dictionary<string, int> _sequenceCounters = new();
    private readonly Dictionary<string, List<Dictionary<string, object>>> _lookupData = new();
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly string _rulesFilePath;
    private readonly ILogger<FieldRuleService> _logger;

    public FieldRuleService(ILogger<FieldRuleService> logger)
    {
        _logger = logger;
        var dataDir = Path.Combine(Directory.GetCurrentDirectory(), "Data");
        Directory.CreateDirectory(dataDir);
        _rulesFilePath = Path.Combine(dataDir, "field-rules.json");
        LoadRulesFromFile();
    }

    private void LoadRulesFromFile()
    {
        if (!File.Exists(_rulesFilePath))
            return;

        try
        {
            var json = File.ReadAllText(_rulesFilePath);
            var rulesList = JsonSerializer.Deserialize<List<FieldRule>>(json);
            if (rulesList != null)
            {
                foreach (var rule in rulesList)
                {
                    if (!_rules.ContainsKey(rule.EntityName))
                    {
                        _rules[rule.EntityName] = new Dictionary<string, FieldRule>();
                    }
                    _rules[rule.EntityName][rule.FieldName] = rule;
                }
            }
        }
        catch
        {
            // If file is corrupted, start with empty rules
        }
    }

    private async Task SaveRulesToFileAsync()
    {
        var allRules = _rules.Values.SelectMany(x => x.Values).ToList();
        var json = JsonSerializer.Serialize(allRules, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(_rulesFilePath, json);
    }

    public async Task SaveRuleAsync(FieldRule rule)
    {
        await _lock.WaitAsync();
        try
        {
            if (!_rules.ContainsKey(rule.EntityName))
            {
                _rules[rule.EntityName] = new Dictionary<string, FieldRule>();
            }
            _rules[rule.EntityName][rule.FieldName] = rule;

            if (rule.RuleType == FieldRuleType.Sequence)
            {
                var key = $"{rule.EntityName}_{rule.FieldName}";
                var seqParams = DeserializeParameters<SequenceParameters>(rule.Parameters);
                _sequenceCounters[key] = seqParams?.Start ?? 1;
            }

            await SaveRulesToFileAsync();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task SaveRulesBatchAsync(IEnumerable<FieldRule> rules)
    {
        await _lock.WaitAsync();
        try
        {
            foreach (var rule in rules)
            {
                if (!_rules.ContainsKey(rule.EntityName))
                    _rules[rule.EntityName] = new Dictionary<string, FieldRule>();
                _rules[rule.EntityName][rule.FieldName] = rule;

                if (rule.RuleType == FieldRuleType.Sequence)
                {
                    var key = $"{rule.EntityName}_{rule.FieldName}";
                    var seqParams = DeserializeParameters<SequenceParameters>(rule.Parameters);
                    _sequenceCounters[key] = seqParams?.Start ?? 1;
                }
            }
            await SaveRulesToFileAsync(); // single disk write
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<FieldRule?> GetRuleAsync(string entityName, string fieldName)
    {
        await _lock.WaitAsync();
        try
        {
            if (_rules.TryGetValue(entityName, out var entityRules) &&
                entityRules.TryGetValue(fieldName, out var rule))
            {
                return rule;
            }
            return null;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<List<FieldRule>> GetRulesForEntityAsync(string entityName)
    {
        await _lock.WaitAsync();
        try
        {
            if (_rules.TryGetValue(entityName, out var entityRules))
            {
                return entityRules.Values.ToList();
            }
            return new List<FieldRule>();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<List<FieldRule>> GetAllRulesAsync()
    {
        await _lock.WaitAsync();
        try
        {
            return _rules.Values.SelectMany(x => x.Values).ToList();
        }
        finally
        {
            _lock.Release();
        }
    }

    public object GenerateFieldValue(FieldRule rule, AttributeDefinition attribute, Random random)
    {
        switch (rule.RuleType)
        {
            case FieldRuleType.Static:
                var staticParams = DeserializeParameters<StaticParameters>(rule.Parameters);
                return staticParams?.Value ?? GetDefaultValue(attribute.Schema);

            case FieldRuleType.Range:
                return GenerateRangeValue(rule, attribute, random);

            case FieldRuleType.Examples:
                var exampleParams = DeserializeParameters<ExamplesParameters>(rule.Parameters);
                if (exampleParams?.Values != null && exampleParams.Values.Count > 0)
                {
                    return exampleParams.Values[random.Next(exampleParams.Values.Count)];
                }
                return GetDefaultValue(attribute.Schema);

            case FieldRuleType.Pattern:
                var patternParams = DeserializeParameters<PatternParameters>(rule.Parameters);
                return GenerateFromPattern(patternParams?.Regex ?? ".*", random);

            case FieldRuleType.Sequence:
                return GenerateSequenceValue(rule);

            case FieldRuleType.PrefixSequence:
                return GeneratePrefixSequenceValue(rule);

            case FieldRuleType.Enumeration:
                _logger.LogInformation("DIAGNOSTIC FieldRuleService: Enumeration case for {EntityName}.{FieldName}", 
                    rule.EntityName, rule.FieldName);
                _logger.LogInformation("DIAGNOSTIC FieldRuleService: Raw Parameters = {Params}", rule.Parameters);
                
                var enumParams = DeserializeParameters<EnumerationParameters>(rule.Parameters);
                
                _logger.LogInformation("DIAGNOSTIC FieldRuleService: Deserialized enumParams is null? {IsNull}", enumParams == null);
                if (enumParams != null)
                {
                    _logger.LogInformation("DIAGNOSTIC FieldRuleService: enumParams.Values is null? {IsNull}, Count = {Count}", 
                        enumParams.Values == null, enumParams.Values?.Count ?? 0);
                    if (enumParams.Values != null && enumParams.Values.Count > 0)
                    {
                        _logger.LogInformation("DIAGNOSTIC FieldRuleService: enumParams.Values[0] = '{Value}' (Length: {Length})",
                            enumParams.Values[0], enumParams.Values[0]?.Length ?? 0);
                    }
                }
                
                if (enumParams?.Values != null && enumParams.Values.Count > 0)
                {
                    // Use the first value (user-selected specific enum value)
                    var returnValue = enumParams.Values[0];
                    _logger.LogInformation("DIAGNOSTIC FieldRuleService: Returning '{Value}' (Length: {Length})", 
                        returnValue, returnValue?.Length ?? 0);
                    return returnValue;
                }
                
                var defaultValue = GetDefaultValue(attribute.Schema);
                _logger.LogInformation("DIAGNOSTIC FieldRuleService: Returning default value '{Value}'", defaultValue);
                return defaultValue;

            case FieldRuleType.IfThen:
            case FieldRuleType.Case:
            case FieldRuleType.Lookup:
                // These rules require source data - return default if called without source data
                _logger.LogWarning("IfThen/Case/Lookup rule called without source data for {EntityName}.{FieldName}", 
                    rule.EntityName, rule.FieldName);
                return GetDefaultValue(attribute.Schema);

            default:
                return GetDefaultValue(attribute.Schema);
        }
    }

    public async Task DeleteRuleAsync(string entityName, string fieldName)
    {
        await _lock.WaitAsync();
        try
        {
            if (_rules.TryGetValue(entityName, out var entityRules))
            {
                entityRules.Remove(fieldName);
                var key = $"{entityName}_{fieldName}";
                _sequenceCounters.Remove(key);
                await SaveRulesToFileAsync();
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    public void RegisterLookupData(string tableName, List<Dictionary<string, object>> data)
    {
        _lookupData[tableName] = data;
        _logger.LogInformation("Registered lookup data for table '{TableName}' with {Count} records", tableName, data.Count);
    }

    public void ClearLookupData()
    {
        _lookupData.Clear();
        _logger.LogInformation("Cleared all lookup data");
    }

    public IEnumerable<string> GetRegisteredLookupTables()
    {
        return _lookupData.Keys;
    }

    private object GenerateRangeValue(FieldRule rule, AttributeDefinition attribute, Random random)
    {
        var rangeParams = DeserializeParameters<RangeParameters>(rule.Parameters);
        
        switch (attribute.Schema.ToLower())
        {
            case "integer":
            case "int":
                var minInt = Convert.ToInt32(rangeParams?.Min ?? 0);
                var maxInt = Convert.ToInt32(rangeParams?.Max ?? 100);
                return random.Next(minInt, maxInt + 1);

            case "double":
            case "float":
                var minDouble = Convert.ToDouble(rangeParams?.Min ?? 0.0);
                var maxDouble = Convert.ToDouble(rangeParams?.Max ?? 100.0);
                return minDouble + (random.NextDouble() * (maxDouble - minDouble));

            case "datetime":
                var minDate = rangeParams?.Min != null ? Convert.ToDateTime(rangeParams.Min) : DateTime.Now.AddYears(-1);
                var maxDate = rangeParams?.Max != null ? Convert.ToDateTime(rangeParams.Max) : DateTime.Now;
                var range = (maxDate - minDate).TotalSeconds;
                return minDate.AddSeconds(random.NextDouble() * range);

            default:
                return GetDefaultValue(attribute.Schema);
        }
    }

    private object GenerateSequenceValue(FieldRule rule)
    {
        var key = $"{rule.EntityName}_{rule.FieldName}";
        var seqParams = DeserializeParameters<SequenceParameters>(rule.Parameters);
        
        if (!_sequenceCounters.ContainsKey(key))
        {
            _sequenceCounters[key] = seqParams?.Start ?? 1;
        }

        var value = _sequenceCounters[key];
        var increment = seqParams?.Increment ?? 1;
        var max = seqParams?.Max;

        _sequenceCounters[key] += increment;
        
        if (max.HasValue && _sequenceCounters[key] > max.Value)
        {
            _sequenceCounters[key] = seqParams?.Start ?? 1;
        }

        return value;
    }

    private object GeneratePrefixSequenceValue(FieldRule rule)
    {
        var key = $"{rule.EntityName}_{rule.FieldName}";
        var seqParams = DeserializeParameters<PrefixSequenceParameters>(rule.Parameters);
        
        if (!_sequenceCounters.ContainsKey(key))
        {
            _sequenceCounters[key] = seqParams?.Start ?? 1;
        }

        var value = _sequenceCounters[key];
        var start = seqParams?.Start ?? 1;
        var end = seqParams?.End ?? 100;
        var prefix = seqParams?.Prefix ?? "";
        var suffix = seqParams?.Suffix ?? "";
        var padding = seqParams?.Padding ?? 0;

        // Format the number with padding if specified
        var numberStr = padding > 0 ? value.ToString($"D{padding}") : value.ToString();
        
        // Construct the final value
        var result = $"{prefix}{numberStr}{suffix}";

        // Increment for next call
        _sequenceCounters[key]++;
        
        // Reset to start if we exceed the end
        if (_sequenceCounters[key] > end)
        {
            _sequenceCounters[key] = start;
        }

        return result;
    }

    private string GenerateFromPattern(string pattern, Random random)
    {
        if (pattern == ".*" || string.IsNullOrEmpty(pattern))
        {
            return GenerateRandomString(random, 10);
        }

        var result = pattern;
        result = Regex.Replace(result, @"\[A-Z\]\{(\d+)\}", m =>
        {
            var count = int.Parse(m.Groups[1].Value);
            return GenerateRandomString(random, count, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
        });
        result = Regex.Replace(result, @"\[0-9\]\{(\d+)\}", m =>
        {
            var count = int.Parse(m.Groups[1].Value);
            return GenerateRandomString(random, count, "0123456789");
        });

        return result;
    }

    private string GenerateRandomString(Random random, int length, string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
    {
        return new string(Enumerable.Range(0, length)
            .Select(_ => chars[random.Next(chars.Length)])
            .ToArray());
    }

    public object GenerateFieldValue(FieldRule rule, AttributeDefinition attribute, Random random, Dictionary<string, object>? sourceData)
    {
        // Handle conditional rules that require source data
        if (rule.RuleType == FieldRuleType.IfThen)
        {
            return GenerateIfThenValue(rule, attribute, sourceData);
        }
        
        if (rule.RuleType == FieldRuleType.Case)
        {
            return GenerateCaseValue(rule, attribute, sourceData);
        }
        
        if (rule.RuleType == FieldRuleType.Lookup)
        {
            return GenerateLookupValue(rule, attribute, sourceData, random);
        }
        
        // For non-conditional rules, use the standard method
        return GenerateFieldValue(rule, attribute, random);
    }

    private object GenerateIfThenValue(FieldRule rule, AttributeDefinition attribute, Dictionary<string, object>? sourceData)
    {
        var ifThenParams = DeserializeParameters<IfThenParameters>(rule.Parameters);
        
        if (ifThenParams == null)
        {
            _logger.LogWarning("IfThen parameters missing for {EntityName}.{FieldName}", rule.EntityName, rule.FieldName);
            return GetDefaultValue(attribute.Schema);
        }

        // Get source field value
        var sourceValue = GetSourceFieldValue(ifThenParams.SourceField, sourceData);
        if (sourceValue == null)
        {
            _logger.LogWarning("Source field {SourceField} not found in source data for {EntityName}.{FieldName}", 
                ifThenParams.SourceField, rule.EntityName, rule.FieldName);
            return ifThenParams.FalseValue ?? GetDefaultValue(attribute.Schema);
        }

        // Evaluate condition
        bool conditionMet = EvaluateCondition(sourceValue.ToString() ?? "", ifThenParams.Condition ?? "");
        
        _logger.LogDebug("IfThen rule for {EntityName}.{FieldName}: sourceValue={SourceValue}, condition={Condition}, met={Met}",
            rule.EntityName, rule.FieldName, sourceValue, ifThenParams.Condition, conditionMet);

        return conditionMet ? 
            (ifThenParams.TrueValue ?? GetDefaultValue(attribute.Schema)) : 
            (ifThenParams.FalseValue ?? GetDefaultValue(attribute.Schema));
    }

    private object GenerateCaseValue(FieldRule rule, AttributeDefinition attribute, Dictionary<string, object>? sourceData)
    {
        var caseParams = DeserializeParameters<CaseParameters>(rule.Parameters);
        
        if (caseParams == null)
        {
            _logger.LogWarning("Case parameters missing for {EntityName}.{FieldName}", rule.EntityName, rule.FieldName);
            return GetDefaultValue(attribute.Schema);
        }

        // Get source field value
        var sourceValue = GetSourceFieldValue(caseParams.SourceField, sourceData);
        if (sourceValue == null)
        {
            _logger.LogWarning("Source field {SourceField} not found in source data for {EntityName}.{FieldName}", 
                caseParams.SourceField, rule.EntityName, rule.FieldName);
            return caseParams.DefaultValue ?? GetDefaultValue(attribute.Schema);
        }

        var sourceValueStr = sourceValue.ToString() ?? "";
        
        // Try to match a case
        if (caseParams.Cases != null)
        {
            foreach (var caseItem in caseParams.Cases)
            {
                if (string.Equals(sourceValueStr, caseItem.Case, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogDebug("Case rule for {EntityName}.{FieldName}: matched '{Case}' -> '{Value}'",
                        rule.EntityName, rule.FieldName, caseItem.Case, caseItem.Value);
                    return caseItem.Value ?? GetDefaultValue(attribute.Schema);
                }
            }
        }
        
        // No match found, return default
        _logger.LogDebug("Case rule for {EntityName}.{FieldName}: no match for '{SourceValue}', using default",
            rule.EntityName, rule.FieldName, sourceValueStr);
        return caseParams.DefaultValue ?? GetDefaultValue(attribute.Schema);
    }

    private object GenerateLookupValue(FieldRule rule, AttributeDefinition attribute, Dictionary<string, object>? sourceData, Random random)
    {
        var lookupParams = DeserializeParameters<LookupParameters>(rule.Parameters);
        
        if (lookupParams == null)
        {
            _logger.LogWarning("Lookup parameters missing for {EntityName}.{FieldName}", rule.EntityName, rule.FieldName);
            return GetDefaultValue(attribute.Schema);
        }

        // Get lookup table data
        if (!_lookupData.TryGetValue(lookupParams.SourceTable, out var lookupTable))
        {
            _logger.LogWarning("Lookup table '{SourceTable}' not found for {EntityName}.{FieldName}", 
                lookupParams.SourceTable, rule.EntityName, rule.FieldName);
            return lookupParams.DefaultValue ?? GetDefaultValue(attribute.Schema);
        }

        // Find matching records
        var matches = new List<Dictionary<string, object>>();
        foreach (var record in lookupTable)
        {
            if (MatchesJoinConditions(record, sourceData, lookupParams.JoinConditions))
            {
                matches.Add(record);
            }
        }

        if (matches.Count == 0)
        {
            _logger.LogDebug("Lookup for {EntityName}.{FieldName}: no matches found in '{SourceTable}'",
                rule.EntityName, rule.FieldName, lookupParams.SourceTable);
            return lookupParams.DefaultValue ?? GetDefaultValue(attribute.Schema);
        }

        // Select record based on MultipleMatchBehavior
        Dictionary<string, object> selectedRecord;
        switch (lookupParams.MultipleMatchBehavior?.ToLower() ?? "first")
        {
            case "last":
                selectedRecord = matches[^1];
                break;
            case "random":
                selectedRecord = matches[random.Next(matches.Count)];
                break;
            case "error":
                if (matches.Count > 1)
                {
                    _logger.LogError("Lookup for {EntityName}.{FieldName}: multiple matches found ({Count}) but behavior is 'error'",
                        rule.EntityName, rule.FieldName, matches.Count);
                    return lookupParams.DefaultValue ?? GetDefaultValue(attribute.Schema);
                }
                selectedRecord = matches[0];
                break;
            default: // "first"
                selectedRecord = matches[0];
                break;
        }

        // Return the specified field from the matched record
        var returnValue = GetSourceFieldValue(lookupParams.ReturnField, selectedRecord);
        if (returnValue == null)
        {
            _logger.LogWarning("Lookup for {EntityName}.{FieldName}: return field '{ReturnField}' not found in matched record",
                rule.EntityName, rule.FieldName, lookupParams.ReturnField);
            return lookupParams.DefaultValue ?? GetDefaultValue(attribute.Schema);
        }

        _logger.LogDebug("Lookup for {EntityName}.{FieldName}: found '{Value}' from '{SourceTable}'",
            rule.EntityName, rule.FieldName, returnValue, lookupParams.SourceTable);
        return returnValue;
    }

    private bool MatchesJoinConditions(Dictionary<string, object> lookupRecord, Dictionary<string, object>? sourceData, List<JoinCondition> conditions)
    {
        if (sourceData == null || conditions == null || conditions.Count == 0)
            return false;

        foreach (var condition in conditions)
        {
            bool conditionMet = false;

            switch (condition.Type?.ToLower() ?? "field")
            {
                case "field":
                    // Simple single field match
                    var localValue = GetSourceFieldValue(condition.LocalField, sourceData);
                    var lookupValue = GetSourceFieldValue(condition.SourceField, lookupRecord);
                    conditionMet = localValue != null && lookupValue != null &&
                                   string.Equals(localValue.ToString(), lookupValue.ToString(), StringComparison.OrdinalIgnoreCase);
                    break;

                case "composite":
                    // Multiple fields must all match
                    if (condition.LocalFields != null && condition.SourceFields != null &&
                        condition.LocalFields.Count == condition.SourceFields.Count)
                    {
                        conditionMet = true;
                        for (int i = 0; i < condition.LocalFields.Count; i++)
                        {
                            var lv = GetSourceFieldValue(condition.LocalFields[i], sourceData);
                            var sv = GetSourceFieldValue(condition.SourceFields[i], lookupRecord);
                            if (lv == null || sv == null ||
                                !string.Equals(lv.ToString(), sv.ToString(), StringComparison.OrdinalIgnoreCase))
                            {
                                conditionMet = false;
                                break;
                            }
                        }
                    }
                    break;

                case "concatenation":
                    // Expression-based match
                    var localExprResult = EvaluateExpression(condition.LocalExpression, sourceData);
                    var sourceExprResult = condition.SourceExpression != null 
                        ? EvaluateExpression(condition.SourceExpression, lookupRecord)
                        : GetSourceFieldValue(condition.SourceField, lookupRecord)?.ToString();
                    conditionMet = !string.IsNullOrEmpty(localExprResult) && 
                                   !string.IsNullOrEmpty(sourceExprResult) &&
                                   string.Equals(localExprResult, sourceExprResult, StringComparison.OrdinalIgnoreCase);
                    break;
            }

            // All conditions must be met (AND logic)
            if (!conditionMet)
                return false;
        }

        return true;
    }

    private string? EvaluateExpression(string? expression, Dictionary<string, object>? data)
    {
        if (string.IsNullOrEmpty(expression) || data == null)
            return null;

        var result = expression;
        
        // Replace {fieldName} placeholders with actual values
        var regex = new Regex(@"\{([^}]+)\}");
        result = regex.Replace(result, match =>
        {
            var fieldName = match.Groups[1].Value;
            var value = GetSourceFieldValue(fieldName, data);
            return value?.ToString() ?? "";
        });

        return result;
    }

    private object? GetSourceFieldValue(string? fieldName, Dictionary<string, object>? sourceData)
    {
        if (string.IsNullOrEmpty(fieldName) || sourceData == null)
            return null;
            
        // Try exact match first
        if (sourceData.TryGetValue(fieldName, out var value))
            return value;
            
        // Try case-insensitive match
        var key = sourceData.Keys.FirstOrDefault(k => 
            string.Equals(k, fieldName, StringComparison.OrdinalIgnoreCase));
            
        return key != null ? sourceData[key] : null;
    }

    private bool EvaluateCondition(string sourceValue, string condition)
    {
        if (string.IsNullOrEmpty(condition))
            return false;

        // Parse condition format: "operator value" (e.g., "== Active", "> 100", "contains test")
        condition = condition.Trim();
        
        // Check for comparison operators
        if (condition.StartsWith("=="))
        {
            var compareValue = condition.Substring(2).Trim();
            return string.Equals(sourceValue, compareValue, StringComparison.OrdinalIgnoreCase);
        }
        
        if (condition.StartsWith("!="))
        {
            var compareValue = condition.Substring(2).Trim();
            return !string.Equals(sourceValue, compareValue, StringComparison.OrdinalIgnoreCase);
        }
        
        if (condition.StartsWith("contains", StringComparison.OrdinalIgnoreCase))
        {
            var searchValue = condition.Substring(8).Trim();
            return sourceValue.Contains(searchValue, StringComparison.OrdinalIgnoreCase);
        }
        
        // Try numeric comparisons
        if (double.TryParse(sourceValue, out var numericValue))
        {
            if (condition.StartsWith(">="))
            {
                var compareValue = double.Parse(condition.Substring(2).Trim());
                return numericValue >= compareValue;
            }
            
            if (condition.StartsWith("<="))
            {
                var compareValue = double.Parse(condition.Substring(2).Trim());
                return numericValue <= compareValue;
            }
            
            if (condition.StartsWith(">"))
            {
                var compareValue = double.Parse(condition.Substring(1).Trim());
                return numericValue > compareValue;
            }
            
            if (condition.StartsWith("<"))
            {
                var compareValue = double.Parse(condition.Substring(1).Trim());
                return numericValue < compareValue;
            }
        }
        
        // Default: exact match
        return string.Equals(sourceValue, condition, StringComparison.OrdinalIgnoreCase);
    }

    private object GetDefaultValue(string schema)
    {
        return schema.ToLower() switch
        {
            "integer" or "int" => 0,
            "double" or "float" => 0.0,
            "boolean" or "bool" => false,
            "datetime" => DateTime.Now,
            _ => string.Empty
        };
    }

    private T? DeserializeParameters<T>(object? parameters) where T : class
    {
        if (parameters == null) return null;

        try
        {
            var options = new JsonSerializerOptions 
            { 
                PropertyNameCaseInsensitive = true 
            };
            
            if (parameters is JsonElement jsonElement)
            {
                return JsonSerializer.Deserialize<T>(jsonElement.GetRawText(), options);
            }

            var json = JsonSerializer.Serialize(parameters);
            return JsonSerializer.Deserialize<T>(json, options);
        }
        catch
        {
            return null;
        }
    }
}
