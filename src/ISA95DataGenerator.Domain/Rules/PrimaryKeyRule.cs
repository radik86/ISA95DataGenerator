namespace ISA95DataGenerator.Domain.Rules;

/// <summary>
/// Defines how primary keys are generated for an entity
/// </summary>
public class PrimaryKeyRule
{
    public string EntityName { get; set; } = string.Empty;
    public List<string> FieldNames { get; set; } = new(); // Fields that compose the PK
    public string? FormatTemplate { get; set; } // e.g., "{Field1}-{Field2}-{Seq:0000}"
    public string? Prefix { get; set; }
    public string? Suffix { get; set; }
    public string Separator { get; set; } = "-";
    public int StartingSequence { get; set; } = 1;
    public int SequencePadding { get; set; } = 0; // Zero-padding for sequence numbers
    public bool UseSequence { get; set; } = false;
}
