using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using ISA95DataGenerator.Application.Interfaces;
using ISA95DataGenerator.Domain.Rules;

namespace ISA95DataGenerator.Infrastructure.Services;

public class PrimaryKeyRuleService : IPrimaryKeyRuleService
{
    private readonly Dictionary<string, PrimaryKeyRule> _rules = new();
    private readonly Dictionary<string, int> _sequenceCounters = new();
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly string _rulesFilePath;

    public PrimaryKeyRuleService()
    {
        var dataDir = Path.Combine(Directory.GetCurrentDirectory(), "Data");
        Directory.CreateDirectory(dataDir);
        _rulesFilePath = Path.Combine(dataDir, "pk-rules.json");
        LoadRulesFromFile();
    }

    private void LoadRulesFromFile()
    {
        if (File.Exists(_rulesFilePath))
        {
            try
            {
                var json = File.ReadAllText(_rulesFilePath);
                var rules = JsonSerializer.Deserialize<List<PrimaryKeyRule>>(json);
                if (rules != null)
                {
                    foreach (var rule in rules)
                    {
                        _rules[rule.EntityName] = rule;
                        if (rule.UseSequence)
                        {
                            _sequenceCounters[rule.EntityName] = rule.StartingSequence;
                        }
                    }
                }
            }
            catch
            {
                // If file is corrupted, start fresh
            }
        }
    }

    private async Task SaveRulesToFileAsync()
    {
        var json = JsonSerializer.Serialize(_rules.Values.ToList(), new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(_rulesFilePath, json);
    }

    public async Task SaveRuleAsync(PrimaryKeyRule rule)
    {
        await _lock.WaitAsync();
        try
        {
            _rules[rule.EntityName] = rule;
            if (rule.UseSequence)
            {
                _sequenceCounters[rule.EntityName] = rule.StartingSequence;
            }
            await SaveRulesToFileAsync();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<PrimaryKeyRule?> GetRuleAsync(string entityName)
    {
        await _lock.WaitAsync();
        try
        {
            return _rules.TryGetValue(entityName, out var rule) ? rule : null;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<List<PrimaryKeyRule>> GetAllRulesAsync()
    {
        await _lock.WaitAsync();
        try
        {
            return _rules.Values.ToList();
        }
        finally
        {
            _lock.Release();
        }
    }

    public string GeneratePrimaryKey(PrimaryKeyRule rule, Dictionary<string, object> entityData, int sequenceNumber)
    {
        if (!string.IsNullOrEmpty(rule.FormatTemplate))
        {
            return ApplyFormatTemplate(rule.FormatTemplate, rule, entityData, sequenceNumber);
        }

        var parts = new List<string>();

        if (!string.IsNullOrEmpty(rule.Prefix))
        {
            parts.Add(rule.Prefix);
        }

        foreach (var fieldName in rule.FieldNames)
        {
            if (entityData.TryGetValue(fieldName, out var value))
            {
                parts.Add(value?.ToString() ?? string.Empty);
            }
        }

        if (rule.UseSequence)
        {
            var seqValue = sequenceNumber.ToString();
            if (rule.SequencePadding > 0)
            {
                seqValue = seqValue.PadLeft(rule.SequencePadding, '0');
            }
            parts.Add(seqValue);
        }

        if (!string.IsNullOrEmpty(rule.Suffix))
        {
            parts.Add(rule.Suffix);
        }

        return string.Join(rule.Separator, parts);
    }

    public async Task DeleteRuleAsync(string entityName)
    {
        await _lock.WaitAsync();
        try
        {
            _rules.Remove(entityName);
            _sequenceCounters.Remove(entityName);
            await SaveRulesToFileAsync();
        }
        finally
        {
            _lock.Release();
        }
    }

    private string ApplyFormatTemplate(string template, PrimaryKeyRule rule, Dictionary<string, object> entityData, int sequenceNumber)
    {
        var result = template;

        foreach (var fieldName in rule.FieldNames)
        {
            if (entityData.TryGetValue(fieldName, out var value))
            {
                result = result.Replace($"{{{fieldName}}}", value?.ToString() ?? string.Empty);
            }
        }

        var seqPattern = @"\{Seq:([0-9]+)\}";
        result = Regex.Replace(result, seqPattern, match =>
        {
            var format = match.Groups[1].Value;
            return sequenceNumber.ToString().PadLeft(format.Length, '0');
        });

        result = result.Replace("{Seq}", sequenceNumber.ToString());

        return result;
    }
}
