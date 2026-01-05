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
  Chip,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Autocomplete,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  PlayArrow as GenerateIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  FolderOpen as LoadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  useEntities,
  useRelatedEntities,
  usePrimaryKeyRules,
  useFieldRules,
  useGenerateData,
  useDownloadData,
  useScenarios,
  useSaveScenario,
  useDeleteScenario,
  useDefineFieldRule,
  useDeleteFieldRule,
} from '../api/hooks';
import { DataGenerationRequest, DataGenerationResponse, DataGenerationScenario } from '../types';
import { JsonView, allExpanded, darkStyles, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import FieldRuleEditor from './FieldRuleEditor';
import EntityRelationshipDiagram from './EntityRelationshipDiagram';

const DataGeneration: React.FC = () => {
  const { data: entities } = useEntities();
  const { data: allPKRules } = usePrimaryKeyRules();
  const { data: allFieldRules } = useFieldRules();
  const { data: scenarios } = useScenarios();

  const [rootEntity, setRootEntity] = useState('');
  const [selectedRelatedEntities, setSelectedRelatedEntities] = useState<string[]>([]);
  const [instanceCount, setInstanceCount] = useState(10);
  const [seed, setSeed] = useState(42);
  const [maxDepth, setMaxDepth] = useState(2);
  const [tabValue, setTabValue] = useState(0);
  
  // Scenario management state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [fieldRuleDialogOpen, setFieldRuleDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<{ entityName: string; fieldName: string } | null>(null);
  const [showOnlyRelated, setShowOnlyRelated] = useState(false);

  const { data: relatedEntities } = useRelatedEntities(rootEntity);
  const generateData = useGenerateData();
  const downloadData = useDownloadData();
  const saveScenario = useSaveScenario();
  const deleteScenario = useDeleteScenario();
  const defineFieldRule = useDefineFieldRule();
  const deleteFieldRule = useDeleteFieldRule();

  const [generatedData, setGeneratedData] = useState<DataGenerationResponse | null>(null);

  // Get entity structures for selected entities
  const selectedEntityNames = useMemo(() => {
    const names = rootEntity ? [rootEntity, ...selectedRelatedEntities] : [];
    return names;
  }, [rootEntity, selectedRelatedEntities]);

  // State to hold full entity structures
  const [entityStructures, setEntityStructures] = useState<any[]>([]);
  // State to track which optional fields should be generated
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({});

  // Compute available entities for the dropdown based on showOnlyRelated
  const availableEntities = useMemo(() => {
    if (!showOnlyRelated || !relatedEntities) {
      return entities || [];
    }
    // Filter to show only related entities
    return (entities || []).filter(e => 
      relatedEntities.includes(e.name) || e.name === rootEntity
    );
  }, [showOnlyRelated, relatedEntities, entities, rootEntity]);

  // Fetch full entity structures when selected entities change
  React.useEffect(() => {
    const fetchStructures = async () => {
      if (selectedEntityNames.length === 0) {
        setEntityStructures([]);
        return;
      }

      try {
        const structures = await Promise.all(
          selectedEntityNames.map(async (name) => {
            const response = await fetch(`http://localhost:5237/api/entities/${name}/structure`);
            if (response.ok) {
              return await response.json();
            }
            return null;
          })
        );
        const filteredStructures = structures.filter(Boolean);
        setEntityStructures(filteredStructures);
        
        // Initialize enabled fields - all optional fields enabled by default
        const initialEnabled: Record<string, boolean> = {};
        filteredStructures.forEach((entity: any) => {
          entity.attributes?.forEach((attr: any) => {
            const key = `${entity.name}.${attr.name}`;
            if (!attr.isRequired) {
              initialEnabled[key] = true;
            }
          });
        });
        setEnabledFields(initialEnabled);
      } catch (error) {
        console.error('Failed to fetch entity structures:', error);
      }
    };

    fetchStructures();
  }, [selectedEntityNames]);

  const toggleFieldEnabled = (entityName: string, fieldName: string) => {
    const key = `${entityName}.${fieldName}`;
    setEnabledFields(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleGenerate = async () => {
    if (!rootEntity) return;

    // Build list of excluded fields (non-required fields where enabled=false)
    const excludedFields: string[] = [];
    entityStructures.forEach(entity => {
      entity.attributes?.forEach((attr: any) => {
        const fieldKey = `${entity.name}.${attr.name}`;
        if (!attr.isRequired && !enabledFields[fieldKey]) {
          excludedFields.push(fieldKey);
        }
      });
    });

    const request: DataGenerationRequest = {
      rootEntityName: rootEntity,
      includedRelatedEntities: selectedRelatedEntities,
      instanceCount,
      seed,
      maxDepth,
      primaryKeyRules: allPKRules || [],
      fieldRules: allFieldRules || [],
      excludedFields,
    };

    try {
      const result = await generateData.mutateAsync(request);
      setGeneratedData(result.data);
      setTabValue(0); // Switch to JSON tab
    } catch (error) {
      console.error('Failed to generate data:', error);
    }
  };

  const handleDownload = async () => {
    if (!rootEntity) return;

    const request: DataGenerationRequest = {
      rootEntityName: rootEntity,
      includedRelatedEntities: selectedRelatedEntities,
      instanceCount,
      seed,
      maxDepth,
      primaryKeyRules: allPKRules || [],
      fieldRules: allFieldRules || [],
    };

    try {
      await downloadData.mutateAsync(request);
    } catch (error) {
      console.error('Failed to download data:', error);
    }
  };

  const handleSaveScenario = async () => {
    if (!scenarioName || !rootEntity) return;

    const scenario: DataGenerationScenario = {
      name: scenarioName,
      description: scenarioDescription,
      rootEntityName: rootEntity,
      includedRelatedEntities: selectedRelatedEntities,
      instanceCount,
      seed,
      maxDepth,
      primaryKeyRules: (allPKRules || []).map(rule => ({
        entityName: rule.entityName,
        attributeName: rule.fieldNames.join(','), // Store field names as comma-separated
        ruleType: 'Composite', // PK rules don't have a ruleType enum
        parameters: JSON.stringify({
          formatTemplate: rule.formatTemplate,
          fieldNames: rule.fieldNames,
          prefix: rule.prefix,
          suffix: rule.suffix,
          separator: rule.separator,
          useSequence: rule.useSequence,
          startingSequence: rule.startingSequence,
          sequencePadding: rule.sequencePadding,
        }),
      })),
      fieldRules: (allFieldRules || []).map(rule => ({
        entityName: rule.entityName,
        fieldName: rule.fieldName,
        ruleType: rule.ruleType,
        parameters: JSON.stringify(rule.parameters),
      })),
    };

    try {
      await saveScenario.mutateAsync(scenario);
      setSaveDialogOpen(false);
      setScenarioName('');
      setScenarioDescription('');
    } catch (error) {
      console.error('Failed to save scenario:', error);
    }
  };

  const handleLoadScenario = (scenario: DataGenerationScenario) => {
    setRootEntity(scenario.rootEntityName);
    setSelectedRelatedEntities(scenario.includedRelatedEntities);
    setInstanceCount(scenario.instanceCount);
    setSeed(scenario.seed);
    setMaxDepth(scenario.maxDepth);
    setLoadDialogOpen(false);
  };

  const handleDeleteScenario = async (id: string) => {
    try {
      await deleteScenario.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete scenario:', error);
    }
  };

  const dataTableView = useMemo(() => {
    if (!generatedData) return null;

    const entityEntries = Object.entries(generatedData.generatedData);
    if (entityEntries.length === 0) return null;

    const [entityName, instances] = entityEntries[0];
    if (!Array.isArray(instances) || instances.length === 0) return null;

    const columns = Object.keys(instances[0]);

    return (
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col}>
                  <Typography variant="caption" fontWeight="bold">
                    {col}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {instances.slice(0, 100).map((instance: any, idx: number) => (
              <TableRow key={idx}>
                {columns.map((col) => (
                  <TableCell key={col}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {JSON.stringify(instance[col])}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }, [generatedData]);

  const [configExpanded, setConfigExpanded] = useState(true);

  // Calculate width for Root Entity based on longest entity name
  const longestEntityName = useMemo(() => {
    if (!entities || entities.length === 0) return 'Root Entity';
    return entities.reduce((longest, entity) => {
      const name = entity.displayName || entity.name;
      return name.length > longest.length ? name : longest;
    }, '');
  }, [entities]);

  // Estimate width: ~8px per character + padding
  const rootEntityWidth = Math.max(180, longestEntityName.length * 8 + 60);

  return (
    <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>
        Data Generation
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Generate test data for entities using defined rules.
      </Typography>

      {/* Top Configuration Panel - Expandable */}
      <Paper sx={{ mb: 1.5 }}>
        <Box 
          sx={{ 
            p: 1, 
            bgcolor: 'primary.main', 
            color: 'white', 
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
          onClick={() => setConfigExpanded(!configExpanded)}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Configuration
          </Typography>
          <Typography variant="body1">
            {configExpanded ? '▲' : '▼'}
          </Typography>
        </Box>
        
        {configExpanded && (
          <Box sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              {/* Root Entity Selection */}
            <FormControl size="small" sx={{ width: rootEntityWidth }}>
              <InputLabel shrink={!!rootEntity || undefined}>Root Entity</InputLabel>
              <Select
                value={rootEntity}
                onChange={(e) => {
                  setRootEntity(e.target.value);
                  setSelectedRelatedEntities([]);
                }}
                displayEmpty
              >
                {entities?.map((entity) => (
                  <MenuItem key={entity.name} value={entity.name}>
                    {entity.displayName || entity.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Related Entities with Autocomplete */}
            <Autocomplete
              multiple
              size="small"
              disabled={!rootEntity}
              sx={{ minWidth: 250, flex: 1 }}
              options={availableEntities.filter(e => e.name !== rootEntity).map(e => e.displayName || e.name)}
              value={selectedRelatedEntities}
              onChange={(_, newValue) => setSelectedRelatedEntities(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Related Entities"
                  placeholder="Search and select entities..."
                  InputLabelProps={{ shrink: true }}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} size="small" {...getTagProps({ index })} />
                ))
              }
            />

            {/* Show Only Related Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={showOnlyRelated}
                  onChange={(e) => setShowOnlyRelated(e.target.checked)}
                  disabled={!rootEntity}
                  size="small"
                />
              }
              label={
                <Typography variant="caption" sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  Show only related
                </Typography>
              }
              sx={{ ml: 0.5 }}
            />

            {/* Instance Count */}
            <TextField
              size="small"
              type="number"
              label="Instance Count"
              value={instanceCount}
              onChange={(e) => setInstanceCount(parseInt(e.target.value))}
              inputProps={{ min: 1, max: 1000 }}
              sx={{ width: 140 }}
              InputLabelProps={{ shrink: true }}
            />

            {/* Seed */}
            <TextField
              size="small"
              type="number"
              label="Random Seed"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value))}
              sx={{ width: 130 }}
              InputLabelProps={{ shrink: true }}
            />

            {/* Max Depth */}
            <TextField
              size="small"
              type="number"
              label="Max Depth"
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value))}
              inputProps={{ min: 1, max: 5 }}
              sx={{ width: 110 }}
              InputLabelProps={{ shrink: true }}
            />

            </Box>
            
            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<GenerateIcon />}
                onClick={handleGenerate}
                disabled={!rootEntity || generateData.isPending}
              >
                {generateData.isPending ? 'Generating...' : 'Generate Data'}
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={downloadData.isPending ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={handleDownload}
                disabled={!rootEntity || downloadData.isPending}
              >
                Download ZIP
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<SaveIcon />}
                onClick={() => setSaveDialogOpen(true)}
                disabled={!rootEntity}
              >
                Save Scenario
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<LoadIcon />}
                onClick={() => setLoadDialogOpen(true)}
              >
                Load Scenario
              </Button>
              
              <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  PK Rules: {allPKRules?.length || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Field Rules: {allFieldRules?.length || 0}
                </Typography>
              </Box>
            </Box>

            {generateData.isError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                Failed to generate data
              </Alert>
            )}
            {downloadData.isError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                Failed to download data
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* Main Content Area - Full Width */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Paper sx={{ p: 2, height: '100%' }}>
            {/* Show entity structures when entities selected */}
            {!generateData.isPending && entityStructures.length > 0 && (
              <Box>
                {/* Entity Relationship Diagram */}
                {entityStructures.length > 1 && (
                  <EntityRelationshipDiagram
                    rootEntity={rootEntity}
                    entityStructures={entityStructures}
                    enabledFields={enabledFields}
                    onToggleField={toggleFieldEnabled}
                    onFieldClick={(entityName, fieldName) => {
                      setSelectedField({ entityName, fieldName });
                      setFieldRuleDialogOpen(true);
                    }}
                    fieldRules={allFieldRules}
                    onDeleteFieldRule={(entityName, fieldName) => {
                      const fieldKey = `${entityName}.${fieldName}`;
                      deleteFieldRule.mutate(fieldKey);
                    }}
                    allEntities={entities}
                    selectedRelatedEntities={selectedRelatedEntities}
                    onAddRelatedEntity={(entityDisplayName) => {
                      if (!selectedRelatedEntities.includes(entityDisplayName)) {
                        setSelectedRelatedEntities([...selectedRelatedEntities, entityDisplayName]);
                      }
                    }}
                  />
                )}

                {/* Only show separate field configuration when there's only one entity */}
                {entityStructures.length === 1 && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Field Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Click on a field to configure its generation rule. Gray background = required field.
                    </Typography>
                  </>
                )}
                {entityStructures.length === 1 && entityStructures.map((entity) => (
                  <Box key={entity!.name} sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
                      {entity!.displayName || entity!.name}
                    </Typography>
                    <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {(entity!.attributes || []).map((attr) => {
                              const fieldRule = allFieldRules?.find(
                                r => r.entityName === entity!.name && r.fieldName === attr.name
                              );
                              const fieldKey = `${entity!.name}.${attr.name}`;
                              const isEnabled = attr.isRequired || enabledFields[fieldKey];
                              
                              return (
                                <TableCell 
                                  key={attr.name}
                                  sx={{ 
                                    bgcolor: attr.isRequired ? 'grey.200' : 'transparent',
                                    opacity: isEnabled ? 1 : 0.5,
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: attr.isRequired ? 'grey.300' : 'grey.100' },
                                    minWidth: 120,
                                    verticalAlign: 'top',
                                    p: 1
                                  }}
                                  onClick={() => {
                                    setSelectedField({ entityName: entity!.name, fieldName: attr.name });
                                    setFieldRuleDialogOpen(true);
                                  }}
                                >
                                  <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                      <Typography variant="body2" fontWeight="bold">
                                        {attr.name}
                                      </Typography>
                                      {attr.isPrimaryKey && (
                                        <Chip label="PK" size="small" color="primary" sx={{ height: 16, fontSize: '0.6rem' }} />
                                      )}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace', mb: 1 }}>
                                      {attr.schema}
                                    </Typography>
                                    {!attr.isRequired && (
                                      <Box 
                                        sx={{ mb: 1 }} 
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <FormControl size="small">
                                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <input
                                              type="checkbox"
                                              checked={isEnabled}
                                              onChange={() => toggleFieldEnabled(entity!.name, attr.name)}
                                              style={{ marginRight: 4 }}
                                            />
                                            <Typography variant="caption">
                                              Generate
                                            </Typography>
                                          </Box>
                                        </FormControl>
                                      </Box>
                                    )}
                                    {fieldRule ? (
                                      <Chip 
                                        label={fieldRule.ruleType} 
                                        size="small" 
                                        color="success"
                                        sx={{ fontSize: '0.65rem', height: 20 }}
                                        onDelete={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            await deleteFieldRule.mutateAsync({
                                              entityName: entity!.name,
                                              fieldName: attr.name
                                            });
                                          } catch (error) {
                                            console.error('Failed to delete field rule:', error);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <Chip 
                                        label="Auto" 
                                        size="small" 
                                        variant="outlined"
                                        sx={{ fontSize: '0.65rem', height: 20 }}
                                      />
                                    )}
                                  </Box>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        </TableHead>
                      </Table>
                    </TableContainer>
                  </Box>
                ))}
              </Box>
            )}

            {/* Show placeholder when no entities selected */}
            {!generateData.isPending && entityStructures.length === 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 500,
                }}
              >
                <Typography variant="h6" color="text.secondary">
                  Select root entity and related entities to configure fields
                </Typography>
              </Box>
            )}

            {/* Show loading spinner */}
            {generateData.isPending && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 200,
                  mt: 4,
                }}
              >
                <CircularProgress size={60} />
              </Box>
            )}

            {/* Show generated data below field configuration */}
            {generatedData && (
              <>
                <Box sx={{ mt: 4, pt: 4, borderTop: 2, borderColor: 'divider' }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6">
                      Generated Data ({generatedData.totalInstancesGenerated} instances)
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      {Object.entries(generatedData.generatedData).map(([name, instances]) => (
                        <Chip
                          key={name}
                          label={`${name}: ${instances.length}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Box>

                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                      <Tab label="JSON View" />
                      <Tab label="Table View" />
                      <Tab label="Mapping File" />
                    </Tabs>
                  </Box>
                </Box>

                {/* JSON View Tab */}
                {tabValue === 0 && (
                  <Box sx={{ mt: 2, maxHeight: 600, overflow: 'auto' }}>
                    <JsonView data={generatedData.generatedData} shouldExpandNode={allExpanded} style={defaultStyles} />
                  </Box>
                )}

                {/* Table View Tab */}
                {tabValue === 1 && (
                  <Box sx={{ mt: 2 }}>
                    {dataTableView}
                  </Box>
                )}

                {/* Mapping File Tab */}
                {tabValue === 2 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Mapping File ({generatedData.mappingFile.mappings.length} mappings)
                    </Typography>
                    <TableContainer sx={{ maxHeight: 500 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Source Type</TableCell>
                            <TableCell>Target Type</TableCell>
                            <TableCell>Relationship</TableCell>
                            <TableCell>Cardinality</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {generatedData.mappingFile.mappings.map((mapping, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Chip label={mapping.sourceType} size="small" />
                              </TableCell>
                              <TableCell>
                                <Chip label={mapping.targetType} size="small" />
                              </TableCell>
                              <TableCell>{mapping.relationshipName}</TableCell>
                              <TableCell>
                                <Chip
                                  label={mapping.cardinality}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </>
            )}
        </Paper>
      </Box>

      {/* Save Scenario Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Scenario</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Scenario Name"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={scenarioDescription}
            onChange={(e) => setScenarioDescription(e.target.value)}
            multiline
            rows={3}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              This will save the current configuration including:
            </Typography>
            <ul style={{ marginTop: 8, marginBottom: 0 }}>
              <li><Typography variant="caption">Root entity: {rootEntity}</Typography></li>
              <li><Typography variant="caption">Related entities: {selectedRelatedEntities.length}</Typography></li>
              <li><Typography variant="caption">PK rules: {allPKRules?.length || 0}</Typography></li>
              <li><Typography variant="caption">Field rules: {allFieldRules?.length || 0}</Typography></li>
            </ul>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveScenario} 
            variant="contained"
            disabled={!scenarioName}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Scenario Dialog */}
      <Dialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Load Scenario</DialogTitle>
        <DialogContent>
          {scenarios && scenarios.length > 0 ? (
            <List>
              {scenarios.map((scenario: DataGenerationScenario) => (
                <ListItem
                  key={scenario.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={scenario.name}
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {scenario.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Root: {scenario.rootEntityName} | 
                          Related: {scenario.includedRelatedEntities.length} | 
                          PK Rules: {scenario.primaryKeyRules.length} | 
                          Field Rules: {scenario.fieldRules.length}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          Updated: {new Date(scenario.updatedAt || '').toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteScenario(scenario.id!)}
                      sx={{ mr: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleLoadScenario(scenario)}
                    >
                      Load
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              No saved scenarios yet. Create one by saving your current configuration.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Field Rule Dialog */}
      {selectedField && (
        <Dialog 
          open={fieldRuleDialogOpen} 
          onClose={() => {
            setFieldRuleDialogOpen(false);
            setSelectedField(null);
          }} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            Configure Field Rule: {selectedField.entityName}.{selectedField.fieldName}
          </DialogTitle>
          <DialogContent>
            <FieldRuleEditor 
              entityName={selectedField.entityName}
              fieldName={selectedField.fieldName}
              onClose={() => {
                setFieldRuleDialogOpen(false);
                setSelectedField(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

export default DataGeneration;
