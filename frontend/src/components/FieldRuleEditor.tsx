import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Stack,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  useEntities,
  useEntityStructure,
  useDefineFieldRule,
  useFieldRules,
  useDeleteFieldRule,
} from '../api/hooks';
import { FieldRule, RuleType } from '../types';

interface FieldRuleEditorProps {
  entityName?: string;
  fieldName?: string;
  onClose?: () => void;
}

const FieldRuleEditor: React.FC<FieldRuleEditorProps> = ({ entityName, fieldName, onClose }) => {
  const { data: entities } = useEntities();
  const { data: allFieldRules } = useFieldRules();
  const defineFieldRule = useDefineFieldRule();
  const deleteFieldRule = useDeleteFieldRule();

  const [selectedEntity, setSelectedEntity] = useState(entityName || '');
  const [selectedField, setSelectedField] = useState(fieldName || '');
  const [ruleType, setRuleType] = useState<RuleType>(RuleType.Static);

  // Rule parameters
  const [rangeMin, setRangeMin] = useState(0);
  const [rangeMax, setRangeMax] = useState(100);
  const [exampleValues, setExampleValues] = useState<string[]>([]);
  const [newExampleValue, setNewExampleValue] = useState('');
  const [pattern, setPattern] = useState('');
  const [staticValue, setStaticValue] = useState('');
  const [sequenceStart, setSequenceStart] = useState(1);
  const [sequenceIncrement, setSequenceIncrement] = useState(1);
  const [prefixValue, setPrefixValue] = useState('');
  const [suffixValue, setSuffixValue] = useState('');
  const [seqStart, setSeqStart] = useState(1);
  const [seqEnd, setSeqEnd] = useState(100);
  const [seqPadding, setSeqPadding] = useState(0);
  const [selectedEnumValue, setSelectedEnumValue] = useState('');
  
  // IfThen rule parameters
  const [ifThenCondition, setIfThenCondition] = useState('');
  const [ifThenTrueValue, setIfThenTrueValue] = useState('');
  const [ifThenFalseValue, setIfThenFalseValue] = useState('');
  
  // Case rule parameters
  const [caseCases, setCaseCases] = useState<Array<{ case: string; value: string }>>([{ case: '', value: '' }]);
  const [caseDefaultValue, setCaseDefaultValue] = useState('');

  const { data: entityStructure } = useEntityStructure(selectedEntity);

  const availableFields = useMemo(() => {
    if (!entityStructure) return [];
    return entityStructure.attributes;
  }, [entityStructure]);

  const handleAddExampleValue = () => {
    if (newExampleValue.trim()) {
      setExampleValues([...exampleValues, newExampleValue.trim()]);
      setNewExampleValue('');
    }
  };

  const handleRemoveExampleValue = (index: number) => {
    setExampleValues(exampleValues.filter((_, i) => i !== index));
  };

  const handleApplyRule = async () => {
    if (!selectedEntity || !selectedField) return;

    let parameters: any;
    switch (ruleType) {
      case RuleType.Range:
        parameters = { min: rangeMin, max: rangeMax };
        break;
      case RuleType.Examples:
        parameters = { values: exampleValues };
        break;
      case RuleType.Pattern:
        parameters = { regex: pattern };
        break;
      case RuleType.Static:
        parameters = { value: staticValue };
        break;
      case RuleType.Sequence:
        parameters = { start: sequenceStart, increment: sequenceIncrement };
        break;
      case RuleType.PrefixSequence:
        parameters = { 
          prefix: prefixValue, 
          suffix: suffixValue, 
          start: seqStart, 
          end: seqEnd,
          padding: seqPadding > 0 ? seqPadding : undefined
        };
        break;
      case RuleType.Enumeration:
        parameters = { values: [selectedEnumValue] };
        break;
      case RuleType.IfThen:
        parameters = { 
          condition: ifThenCondition, 
          trueValue: ifThenTrueValue, 
          falseValue: ifThenFalseValue 
        };
        break;
      case RuleType.Case:
        parameters = { 
          cases: caseCases.filter(c => c.case.trim() && c.value.trim()),
          defaultValue: caseDefaultValue || undefined
        };
        break;
    }

    const rule: FieldRule = {
      entityName: selectedEntity,
      fieldName: selectedField,
      ruleType,
      parameters,
    };

    try {
      await defineFieldRule.mutateAsync(rule);
      // Reset form
      setSelectedField('');
      setRuleType(RuleType.Static);
      resetParameters();
    } catch (error) {
      console.error('Failed to apply field rule:', error);
    }
  };

  const handleDeleteRule = async (entityName: string, fieldName: string) => {
    try {
      await deleteFieldRule.mutateAsync({ entityName, fieldName });
    } catch (error) {
      console.error('Failed to delete field rule:', error);
    }
  };

  const handleLoadRule = (rule: FieldRule) => {
    // Set entity and field
    setSelectedEntity(rule.entityName);
    setSelectedField(rule.fieldName);
    
    // Set rule type
    setRuleType(rule.ruleType as RuleType);
    
    // Reset all parameters first
    resetParameters();
    
    // Load parameters based on rule type
    const params = rule.parameters as any;
    
    switch (rule.ruleType as RuleType) {
      case RuleType.Range:
        setRangeMin(params?.min || 0);
        setRangeMax(params?.max || 100);
        break;
      case RuleType.Examples:
        setExampleValues(params?.values || []);
        break;
      case RuleType.Pattern:
        setPattern(params?.regex || '');
        break;
      case RuleType.Static:
        setStaticValue(params?.value || '');
        break;
      case RuleType.Sequence:
        setSequenceStart(params?.start || 1);
        setSequenceIncrement(params?.increment || 1);
        break;
      case RuleType.PrefixSequence:
        setPrefixValue(params?.prefix || '');
        setSuffixValue(params?.suffix || '');
        setSeqStart(params?.start || 1);
        setSeqEnd(params?.end || 100);
        setSeqPadding(params?.padding || 0);
        break;
      case RuleType.Enumeration:
        setSelectedEnumValue(params?.values?.[0] || '');
        break;
      case RuleType.IfThen:
        setIfThenCondition(params?.condition || '');
        setIfThenTrueValue(params?.trueValue || '');
        setIfThenFalseValue(params?.falseValue || '');
        break;
      case RuleType.Case:
        setCaseCases(params?.cases || [{ case: '', value: '' }]);
        setCaseDefaultValue(params?.defaultValue || '');
        break;
    }
  };

  const resetParameters = () => {
    setRangeMin(0);
    setRangeMax(100);
    setExampleValues([]);
    setNewExampleValue('');
    setPattern('');
    setStaticValue('');
    setSequenceStart(1);
    setSequenceIncrement(1);
    setSelectedEnumValue('');
    setIfThenCondition('');
    setIfThenTrueValue('');
    setIfThenFalseValue('');
    setCaseCases([{ case: '', value: '' }]);
    setCaseDefaultValue('');
  };

  const renderRuleParameters = () => {
    switch (ruleType) {
      case RuleType.Range:
        return (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Value"
                value={rangeMin}
                onChange={(e) => setRangeMin(parseFloat(e.target.value))}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                type="number"
                label="Maximum Value"
                value={rangeMax}
                onChange={(e) => setRangeMax(parseFloat(e.target.value))}
              />
            </Box>
          </Box>
        );

      case RuleType.Examples:
        return (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="Add Example Value"
                value={newExampleValue}
                onChange={(e) => setNewExampleValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddExampleValue()}
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddExampleValue}
              >
                Add
              </Button>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {exampleValues.map((value, index) => (
                <Chip
                  key={index}
                  label={value}
                  onDelete={() => handleRemoveExampleValue(index)}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
            {exampleValues.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                Add at least one example value
              </Typography>
            )}
          </Box>
        );

      case RuleType.Pattern:
        return (
          <TextField
            fullWidth
            label="Regular Expression Pattern"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="^[A-Z]{3}-\d{4}$"
            helperText="Enter a valid regex pattern for value generation"
          />
        );

      case RuleType.Static:
        return (
          <TextField
            fullWidth
            label="Static Value"
            value={staticValue}
            onChange={(e) => setStaticValue(e.target.value)}
            helperText="This value will be used for all instances"
          />
        );

      case RuleType.Sequence:
        return (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                type="number"
                label="Start Value"
                value={sequenceStart}
                onChange={(e) => setSequenceStart(parseInt(e.target.value))}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                type="number"
                label="Increment"
                value={sequenceIncrement}
                onChange={(e) => setSequenceIncrement(parseInt(e.target.value))}
              />
            </Box>
          </Box>
        );

      case RuleType.PrefixSequence:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Prefix (Optional)"
                value={prefixValue}
                onChange={(e) => setPrefixValue(e.target.value)}
                placeholder="e.g., EQ-"
                helperText="Fixed text before the number"
              />
              <TextField
                fullWidth
                label="Suffix (Optional)"
                value={suffixValue}
                onChange={(e) => setSuffixValue(e.target.value)}
                placeholder="e.g., -2024"
                helperText="Fixed text after the number"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="Start Number"
                value={seqStart}
                onChange={(e) => setSeqStart(parseInt(e.target.value))}
                helperText="First number in sequence"
              />
              <TextField
                fullWidth
                type="number"
                label="End Number"
                value={seqEnd}
                onChange={(e) => setSeqEnd(parseInt(e.target.value))}
                helperText="Last number in sequence"
              />
            </Box>
            <TextField
              fullWidth
              type="number"
              label="Padding (Optional)"
              value={seqPadding}
              onChange={(e) => setSeqPadding(parseInt(e.target.value))}
              placeholder="0"
              helperText="Number of digits with leading zeros (e.g., 3 = 001, 002, 003)"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Example: Prefix="EQ-", Start=1, End=100, Padding=3, Suffix="-A" → EQ-001-A, EQ-002-A, ..., EQ-100-A
            </Typography>
          </Box>
        );

      case RuleType.Enumeration:
        const field = availableFields.find(f => f.name === selectedField);
        const enumValues = field?.enumValues || [];
        return (
          <Box>
            <FormControl fullWidth>
              <InputLabel>Select Enumeration Value</InputLabel>
              <Select
                value={selectedEnumValue}
                onChange={(e) => setSelectedEnumValue(e.target.value)}
                label="Select Enumeration Value"
              >
                {enumValues.map((value, index) => {
                  const displayValue = typeof value === 'object' ? (value.displayName || value.enumValue || value.name) : value;
                  const actualValue = typeof value === 'object' ? value.enumValue : value;
                  return (
                    <MenuItem key={index} value={actualValue}>
                      {displayValue}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            {enumValues.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                No enumeration values defined for this field
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              The selected value will be used for all instances of this field.
            </Typography>
          </Box>
        );

      case RuleType.IfThen:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Condition"
              value={ifThenCondition}
              onChange={(e) => setIfThenCondition(e.target.value)}
              placeholder="e.g., field name to check or condition"
              helperText="Condition to evaluate (e.g., source field name or expression)"
            />
            <TextField
              fullWidth
              label="Value if True"
              value={ifThenTrueValue}
              onChange={(e) => setIfThenTrueValue(e.target.value)}
              placeholder="Value when condition is true"
              helperText="Value to use when the condition evaluates to true"
            />
            <TextField
              fullWidth
              label="Value if False"
              value={ifThenFalseValue}
              onChange={(e) => setIfThenFalseValue(e.target.value)}
              placeholder="Value when condition is false"
              helperText="Value to use when the condition evaluates to false"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Checks the condition and returns the true value or false value accordingly.
            </Typography>
          </Box>
        );

      case RuleType.Case:
        const fieldForCase = availableFields.find(f => f.name === selectedField);
        const hasEnumValues = fieldForCase?.enumValues && fieldForCase.enumValues.length > 0;
        const enumValuesForCase = fieldForCase?.enumValues || [];

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Case Conditions
            </Typography>
            {caseCases.map((caseItem, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                {hasEnumValues ? (
                  <FormControl fullWidth>
                    <InputLabel>Case Value</InputLabel>
                    <Select
                      value={caseItem.case}
                      onChange={(e) => {
                        const newCases = [...caseCases];
                        newCases[index].case = e.target.value;
                        setCaseCases(newCases);
                      }}
                      label="Case Value"
                    >
                      {enumValuesForCase.map((value, idx) => {
                        const displayValue = typeof value === 'object' ? (value.displayName || value.enumValue || value.name) : value;
                        const actualValue = typeof value === 'object' ? value.enumValue : value;
                        return (
                          <MenuItem key={idx} value={actualValue}>
                            {displayValue}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    fullWidth
                    label="Case"
                    value={caseItem.case}
                    onChange={(e) => {
                      const newCases = [...caseCases];
                      newCases[index].case = e.target.value;
                      setCaseCases(newCases);
                    }}
                    placeholder="Case value to match"
                  />
                )}
                <TextField
                  fullWidth
                  label="Result Value"
                  value={caseItem.value}
                  onChange={(e) => {
                    const newCases = [...caseCases];
                    newCases[index].value = e.target.value;
                    setCaseCases(newCases);
                  }}
                  placeholder="Value to return"
                />
                <IconButton
                  color="error"
                  onClick={() => {
                    if (caseCases.length > 1) {
                      setCaseCases(caseCases.filter((_, i) => i !== index));
                    }
                  }}
                  disabled={caseCases.length === 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCaseCases([...caseCases, { case: '', value: '' }])}
              size="small"
            >
              Add Case
            </Button>
            <TextField
              fullWidth
              label="Default Value (Optional)"
              value={caseDefaultValue}
              onChange={(e) => setCaseDefaultValue(e.target.value)}
              placeholder="Value if no cases match"
              helperText="Optional: Value to use if none of the cases match"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {hasEnumValues 
                ? 'Select enumeration values for cases and specify result values.'
                : 'Define case conditions and their corresponding result values. Similar to a switch statement.'}
            </Typography>
          </Box>
        );

      default:
        return null;
    }
  };

  const isFormValid = () => {
    if (!selectedEntity || !selectedField) return false;

    switch (ruleType) {
      case RuleType.Range:
        return rangeMin < rangeMax;
      case RuleType.Examples:
        return exampleValues.length > 0;
      case RuleType.Pattern:
        return pattern.trim().length > 0;
      case RuleType.Static:
        return staticValue.trim().length > 0;
      case RuleType.Sequence:
        return sequenceIncrement !== 0;
      case RuleType.PrefixSequence:
        return seqStart <= seqEnd;
      case RuleType.Enumeration:
        return selectedEnumValue.trim().length > 0;
      case RuleType.IfThen:
        return ifThenCondition.trim().length > 0 && 
               ifThenTrueValue.trim().length > 0 && 
               ifThenFalseValue.trim().length > 0;
      case RuleType.Case:
        return caseCases.some(c => c.case.trim().length > 0 && c.value.trim().length > 0);
      default:
        return false;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Field Rule Editor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define value generation rules for entity fields.
          </Typography>
        </Box>
        {onClose && (
          <IconButton onClick={onClose} aria-label="close" sx={{ alignSelf: 'flex-start' }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Left Panel - Rule Configuration */}
        <Box sx={{ flex: 2 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Configure Field Rule
            </Typography>

            {/* Entity Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Entity</InputLabel>
              <Select
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                  setSelectedField('');
                }}
                disabled={!!entityName}
              >
                {entities?.map((entity) => (
                  <MenuItem key={entity.name} value={entity.name}>
                    {entity.displayName || entity.name}
                  </MenuItem>
                ))}
              </Select>
              {entityName && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Pre-selected from field configuration
                </Typography>
              )}
            </FormControl>

            {/* Field Selection */}
            <FormControl fullWidth sx={{ mb: 3 }} disabled={!selectedEntity || !!fieldName}>
              <InputLabel>Select Field</InputLabel>
              <Select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
              >
                {availableFields.map((field) => (
                  <MenuItem key={field.name} value={field.name}>
                    {field.displayName || field.name} ({field.schema})
                  </MenuItem>
                ))}
              </Select>
              {fieldName && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Pre-selected from field configuration
                </Typography>
              )}
            </FormControl>

            {/* Rule Type Selection */}
            <FormControl fullWidth sx={{ mb: 3 }} disabled={!selectedField}>
              <InputLabel>Rule Type</InputLabel>
              <Select
                value={ruleType}
                onChange={(e) => {
                  setRuleType(e.target.value as RuleType);
                  resetParameters();
                }}
              >
                {(() => {
                  const field = availableFields.find(f => f.name === selectedField);
                  const hasEnumValues = field?.enumValues && field.enumValues.length > 0;
                  
                  const menuItems = [];
                  
                  if (hasEnumValues) {
                    menuItems.push(
                      <MenuItem key="enumeration" value={RuleType.Enumeration}>
                        Enumeration - Pick from predefined values
                      </MenuItem>
                    );
                  }
                  
                  menuItems.push(
                    <MenuItem key="range" value={RuleType.Range}>
                      Range - Generate values within min/max range
                    </MenuItem>,
                    <MenuItem key="examples" value={RuleType.Examples}>
                      Examples - Pick random value from list
                    </MenuItem>,
                    <MenuItem key="pattern" value={RuleType.Pattern}>
                      Pattern - Generate from regex pattern
                    </MenuItem>,
                    <MenuItem key="static" value={RuleType.Static}>
                      Static - Use fixed value
                    </MenuItem>,
                    <MenuItem key="sequence" value={RuleType.Sequence}>
                      Sequence - Auto-incrementing numbers
                    </MenuItem>,
                    <MenuItem key="prefixsequence" value={RuleType.PrefixSequence}>
                      Prefix/Suffix + Sequential - Fixed text + number sequence
                    </MenuItem>,
                    <MenuItem key="ifthen" value={RuleType.IfThen}>
                      If-Then - Conditional value based on condition
                    </MenuItem>,
                    <MenuItem key="case" value={RuleType.Case}>
                      Case - Switch/case statement with multiple conditions
                    </MenuItem>
                  );
                  
                  return menuItems;
                })()}
              </Select>
            </FormControl>

            {/* Rule Parameters */}
            <Box sx={{ mb: 3 }}>{selectedField && renderRuleParameters()}</Box>

            {/* Apply Button */}
            <Button
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleApplyRule}
              disabled={!isFormValid() || defineFieldRule.isPending}
              fullWidth
            >
              Apply Field Rule
            </Button>

            {defineFieldRule.isSuccess && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Field rule applied successfully!
              </Alert>
            )}
            {defineFieldRule.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Failed to apply field rule
              </Alert>
            )}
          </Paper>
        </Box>

        {/* Right Panel - Existing Rules */}
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {selectedField 
                ? `Rules for ${selectedEntity}.${selectedField}`
                : `All Rules (${allFieldRules?.length || 0})`}
            </Typography>

            <List sx={{ maxHeight: 600, overflow: 'auto' }}>
              {allFieldRules
                ?.filter(rule => {
                  // If a field is selected, show only rules for that field
                  if (selectedEntity && selectedField) {
                    return rule.entityName === selectedEntity && rule.fieldName === selectedField;
                  }
                  return true;
                })
                .map((rule) => (
                <ListItem
                  key={`${rule.entityName}-${rule.fieldName}`}
                  divider
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    bgcolor: selectedEntity === rule.entityName && selectedField === rule.fieldName 
                      ? 'action.selected' 
                      : 'transparent'
                  }}
                  onClick={() => handleLoadRule(rule)}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="medium">
                        {rule.entityName}.{rule.fieldName}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Chip
                          label={rule.ruleType}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {JSON.stringify(rule.parameters)}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRule(rule.entityName, rule.fieldName);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {(!allFieldRules || allFieldRules.length === 0) && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No field rules defined yet
                </Typography>
              )}
              {allFieldRules && allFieldRules.length > 0 && selectedEntity && selectedField && 
                allFieldRules.filter(r => r.entityName === selectedEntity && r.fieldName === selectedField).length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No rules defined for this field yet
                </Typography>
              )}
            </List>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default FieldRuleEditor;
