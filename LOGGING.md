# Logging Configuration

## Overview
The application provides structured, grouped logging for data generation processes with an option to enable/disable verbose logging.

## Configuration

### Enable/Disable Logging
Edit `src/ISA95DataGenerator.API/appsettings.json`:

```json
{
  "VerboseLogging": false  // Change to true for detailed logs
}
```

## Log Output Structure

### Default Logging (VerboseLogging: false)
Clean, organized output grouped by process step:

```
========== DATA GENERATION START: Operations Request ==========

--- Generating Entity: Operations Request ---
Operations Request: Creating 2 instances with 8 attributes

--- CSV Export: Creating 3 files ---
Exporting Operations Request.csv (2 rows)
Exporting Equipment.csv (5 rows)

========== DATA GENERATION COMPLETE: 7 total instances ==========
```

### Verbose Logging (VerboseLogging: true)
Additional details including:
- Request details (excluded fields, field rules)
- Enum field value assignments
- Field exclusions
- Sample data from generated instances

```
========== DATA GENERATION START: Operations Request ==========
Request Details: ExcludedFields=[], FieldRules=2

--- Generating Entity: Operations Request ---
Operations Request: Creating 2 instances with 8 attributes
Operations Request: Skipping excluded field 'notes'
Operations Request.operationsType = 'Production' (Enum)
Operations Request.status = 'Active' (Enum)

========== DATA GENERATION COMPLETE: 7 total instances ==========
Sample Operations Request[0]: operationsType='Production', status='Active', description='desc_12345'
```

## Benefits

### Grouped Logging
- **Entity Generation**: All logs for each entity are grouped together
- **Process Steps**: Clear separators between generation, relationships, and CSV export
- **Hierarchy**: Indentation and formatting show relationships between log entries

### Enum-Specific Logging
- Only logs enum field values when `VerboseLogging` is enabled
- Shows which enum value was selected for each field
- Helps debug enum-related issues without cluttering normal output

### Performance
- Reduced log volume with `VerboseLogging: false`
- No performance impact from logging checks (uses property accessor)
- Logs only relevant information for each entity being generated

## Use Cases

### Normal Operation (VerboseLogging: false)
- Production environments
- Quick data generation
- Clean terminal output
- Focus on completion status

### Debugging (VerboseLogging: true)
- Investigating data generation issues
- Verifying enum value selection
- Checking field rule application
- Understanding field exclusion behavior
- Validating generated data samples

## Implementation Details

The logging system uses:
- **Structured logging**: Uses Microsoft.Extensions.Logging with named parameters
- **Configuration-based**: Reads from appsettings.json at runtime
- **Minimal overhead**: Property accessor checks configuration once per request
- **Entity-aware**: Only logs enum details for entities being generated
