import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  Chip,
  Alert,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useEntities, useEntityStructure, useDefinePrimaryKeyRule, usePrimaryKeyRules, useDeletePrimaryKeyRule } from '../api/hooks';
import { PrimaryKeyRule } from '../types';
import { useStore } from '../store/useStore';

const PrimaryKeyRuleBuilder: React.FC = () => {
  const { data: entities } = useEntities();
  const { data: existingRules } = usePrimaryKeyRules();
  const definePKRule = useDefinePrimaryKeyRule();
  const deletePKRule = useDeletePrimaryKeyRule();
  
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [applyToAll, setApplyToAll] = useState(false);
  
  // Rule configuration
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [formatTemplate, setFormatTemplate] = useState('');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [separator, setSeparator] = useState('-');
  const [useSequence, setUseSequence] = useState(false);
  const [startingSequence, setStartingSequence] = useState(1);
  const [sequencePadding, setSequencePadding] = useState(4);

  // Get fields for selected entity
  const firstSelectedEntity = selectedEntities[0];
  const { data: entityStructure } = useEntityStructure(firstSelectedEntity);

  const availableFields = useMemo(() => {
    if (!entityStructure) return [];
    return entityStructure.attributes.filter(attr => attr.canBePrimaryKey);
  }, [entityStructure]);

  // Generate preview
  const preview = useMemo(() => {
    if (formatTemplate) {
      // Replace template variables
      let result = formatTemplate;
      selectedFields.forEach((field, idx) => {
        result = result.replace(`{${field}}`, `<${field}>`);
      });
      if (useSequence) {
        result = result.replace(/\{Seq:(\d+)\}/g, (_, padding) => {
          const num = startingSequence.toString().padStart(parseInt(padding), '0');
          return num;
        });
      }
      return result;
    } else {
      const parts: string[] = [];
      if (prefix) parts.push(prefix);
      parts.push(...selectedFields.map(f => `<${f}>`));
      if (useSequence) {
        parts.push(startingSequence.toString().padStart(sequencePadding, '0'));
      }
      if (suffix) parts.push(suffix);
      return parts.join(separator);
    }
  }, [formatTemplate, selectedFields, prefix, suffix, separator, useSequence, startingSequence, sequencePadding]);

  const handleApplyRule = async () => {
    const entitiesToApply = applyToAll && entities ? entities.map(e => e.name) : selectedEntities;

    const rule: PrimaryKeyRule = {
      entityName: '', // Will be set for each entity
      formatTemplate: formatTemplate || undefined,
      fieldNames: selectedFields,
      prefix: prefix || undefined,
      suffix: suffix || undefined,
      separator: separator || undefined,
      useSequence,
      startingSequence: useSequence ? startingSequence : undefined,
      sequencePadding: useSequence ? sequencePadding : undefined,
    };

    try {
      for (const entityName of entitiesToApply) {
        await definePKRule.mutateAsync({ ...rule, entityName });
      }
      
      // Reset form
      setSelectedEntities([]);
      setSelectedFields([]);
      setFormatTemplate('');
      setPrefix('');
      setSuffix('');
      setUseSequence(false);
    } catch (error) {
      console.error('Failed to apply PK rule:', error);
    }
  };

  const handleDeleteRule = async (entityName: string) => {
    try {
      await deletePKRule.mutateAsync(entityName);
    } catch (error) {
      console.error('Failed to delete PK rule:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Primary Key Rule Builder
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Define primary key generation rules for entities. You can select individual entities or apply rules to all entities.
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Left Panel - Rule Configuration */}
        <Box sx={{ flex: 2 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Configure Rule
            </Typography>

            {/* Entity Selection */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                />
              }
              label="Apply to all entities"
              sx={{ mb: 2 }}
            />

            {!applyToAll && (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Entities</InputLabel>
                <Select
                  multiple
                  value={selectedEntities}
                  onChange={(e) => setSelectedEntities(e.target.value as string[])}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {entities?.map((entity) => (
                    <MenuItem key={entity.name} value={entity.name}>
                      {entity.displayName || entity.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Field Selection */}
            <Typography variant="subtitle2" gutterBottom>
              Select Primary Key Fields
            </Typography>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <Select
                multiple
                value={selectedFields}
                onChange={(e) => setSelectedFields(e.target.value as string[])}
                disabled={!firstSelectedEntity || applyToAll}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availableFields.map((field) => (
                  <MenuItem key={field.name} value={field.name}>
                    {field.displayName || field.name} ({field.schema})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider sx={{ my: 3 }} />

            {/* Formatting Options */}
            <Typography variant="subtitle2" gutterBottom>
              Formatting Options
            </Typography>

            <TextField
              fullWidth
              label="Format Template (optional)"
              placeholder="{Field1}-{Seq:0000}"
              value={formatTemplate}
              onChange={(e) => setFormatTemplate(e.target.value)}
              helperText="Use {FieldName} for field values and {Seq:0000} for sequence"
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Separator"
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Suffix"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                />
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={useSequence}
                  onChange={(e) => setUseSequence(e.target.checked)}
                />
              }
              label="Use Sequence"
              sx={{ mb: 2 }}
            />

            {useSequence && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Starting Sequence"
                    value={startingSequence}
                    onChange={(e) => setStartingSequence(parseInt(e.target.value))}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Sequence Padding"
                    value={sequencePadding}
                    onChange={(e) => setSequencePadding(parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 10 }}
                  />
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Preview */}
            <Typography variant="subtitle2" gutterBottom>
              Preview
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                fontFamily: 'monospace',
                fontSize: '1.1rem',
                mb: 3,
              }}
            >
              {preview || '<no fields selected>'}
            </Paper>

            {/* Apply Button */}
            <Button
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleApplyRule}
              disabled={
                (!applyToAll && selectedEntities.length === 0) ||
                selectedFields.length === 0 ||
                definePKRule.isPending
              }
              fullWidth
            >
              {applyToAll ? 'Apply to All Entities' : 'Apply Rule'}
            </Button>

            {definePKRule.isSuccess && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Primary key rule applied successfully!
              </Alert>
            )}
            {definePKRule.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Failed to apply primary key rule
              </Alert>
            )}
          </Paper>
        </Box>

        {/* Right Panel - Existing Rules */}
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Existing Rules ({existingRules?.length || 0})
            </Typography>

            <List>
              {existingRules?.map((rule) => (
                <ListItem key={rule.entityName} divider>
                  <ListItemText
                    primary={rule.entityName}
                    secondary={
                      <>
                        <Typography variant="caption" display="block">
                          Fields: {rule.fieldNames.join(', ')}
                        </Typography>
                        {rule.formatTemplate && (
                          <Typography variant="caption" display="block">
                            Template: {rule.formatTemplate}
                          </Typography>
                        )}
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteRule(rule.entityName)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {(!existingRules || existingRules.length === 0) && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No primary key rules defined yet
                </Typography>
              )}
            </List>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default PrimaryKeyRuleBuilder;
