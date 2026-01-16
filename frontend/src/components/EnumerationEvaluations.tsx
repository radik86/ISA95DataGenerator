import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Collapse,
  Alert,
  CircularProgress,
  TableSortLabel,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

interface EnumValue {
  name: string;
  enumValue: number | string;
  displayName?: string;
  description?: string;
}

interface FieldEnumeration {
  entityName: string;
  fieldName: string;
  fieldDisplayName?: string;
  fieldDescription?: string;
  enumValues: EnumValue[];
  schemaId: string;
}

interface GroupedEnumeration {
  fieldName: string;
  occurrences: FieldEnumeration[];
  uniqueEnumValues: Set<string>;
  totalEntities: number;
}

type SortField = 'fieldName' | 'occurrences' | 'uniqueValues';
type SortOrder = 'asc' | 'desc';

const EnumerationEvaluations: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [enumerations, setEnumerations] = useState<FieldEnumeration[]>([]);
  const [groupedEnumerations, setGroupedEnumerations] = useState<GroupedEnumeration[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [sortField, setSortField] = useState<SortField>('occurrences');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [availableEntities, setAvailableEntities] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grouped' | 'comparison' | 'values'>('grouped');

  useEffect(() => {
    loadDTDLEnumerations();
  }, []);

  useEffect(() => {
    groupEnumerations();
  }, [enumerations, filterText, sortField, sortOrder, entityFilter]);

  const loadDTDLEnumerations = async () => {
    try {
      setLoading(true);
      const enums: FieldEnumeration[] = [];
      const entities = new Set<string>();

      // Load all entities from the API
      const entitiesResponse = await fetch('http://localhost:5237/api/entities');
      if (!entitiesResponse.ok) {
        throw new Error('Failed to load entities from API');
      }

      const entitiesList = await entitiesResponse.json();
      
      // For each entity, get its structure which includes enum values
      for (const entity of entitiesList) {
        try {
          const structureResponse = await fetch(`http://localhost:5237/api/entities/${entity.name}/structure`);
          if (!structureResponse.ok) continue;

          const structure = await structureResponse.json();
          entities.add(structure.name);

          // Extract enumerations from attributes
          if (Array.isArray(structure.attributes)) {
            for (const attr of structure.attributes) {
              // Handle both PascalCase (EnumValues) from backend and camelCase (enumValues)
              const rawEnumValues = attr.enumValues || attr.EnumValues;
              if (rawEnumValues && Array.isArray(rawEnumValues) && rawEnumValues.length > 0) {
                const enumValues: EnumValue[] = rawEnumValues.map((ev: any) => ({
                  name: ev.name || ev.Name,
                  enumValue: ev.enumValue || ev.EnumValue,
                  displayName: ev.displayName || ev.DisplayName,
                  description: ev.description || ev.Description,
                }));

                enums.push({
                  entityName: structure.name,
                  fieldName: attr.name,
                  fieldDisplayName: attr.displayName,
                  fieldDescription: attr.description,
                  enumValues,
                  schemaId: attr.schema || '',
                });
              }
            }
          }
        } catch (error) {
          console.error(`Failed to load structure for ${entity.name}:`, error);
        }
      }

      setEnumerations(enums);
      setAvailableEntities(['all', ...Array.from(entities).sort()]);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load DTDL enumerations:', error);
      setLoading(false);
    }
  };

  const groupEnumerations = () => {
    let filtered = enumerations;

    // Filter by entity
    if (entityFilter !== 'all') {
      filtered = filtered.filter(e => e.entityName === entityFilter);
    }

    // Filter by text
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filtered = filtered.filter(e =>
        e.fieldName.toLowerCase().includes(lowerFilter) ||
        e.entityName.toLowerCase().includes(lowerFilter) ||
        e.fieldDisplayName?.toLowerCase().includes(lowerFilter) ||
        e.enumValues.some(ev => ev.name.toLowerCase().includes(lowerFilter))
      );
    }

    // Group by field name
    const groups = new Map<string, FieldEnumeration[]>();
    for (const enumeration of filtered) {
      const key = enumeration.fieldName;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(enumeration);
    }

    // Convert to array and calculate stats
    const grouped: GroupedEnumeration[] = Array.from(groups.entries()).map(([fieldName, occurrences]) => {
      const uniqueValues = new Set<string>();
      occurrences.forEach(occ => {
        occ.enumValues.forEach(ev => uniqueValues.add(ev.name));
      });

      return {
        fieldName,
        occurrences,
        uniqueEnumValues: uniqueValues,
        totalEntities: occurrences.length,
      };
    });

    // Sort
    grouped.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'fieldName':
          comparison = a.fieldName.localeCompare(b.fieldName);
          break;
        case 'occurrences':
          comparison = a.totalEntities - b.totalEntities;
          break;
        case 'uniqueValues':
          comparison = a.uniqueEnumValues.size - b.uniqueEnumValues.size;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setGroupedEnumerations(grouped);
  };

  const toggleGroup = (fieldName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(fieldName)) {
      newExpanded.delete(fieldName);
    } else {
      newExpanded.add(fieldName);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAll = () => {
    setExpandedGroups(new Set(groupedEnumerations.map(g => g.fieldName)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    if (viewMode === 'grouped') {
      // Grouped View - Single sheet with all data
      const data: any[] = [];
      data.push(['Field Name', 'Entity Name', 'Field Display Name', 'Enum Value Name', 'Enum Value', 'Display Name', 'Description']);

      for (const group of groupedEnumerations) {
        for (const occurrence of group.occurrences) {
          for (const enumValue of occurrence.enumValues) {
            data.push([
              occurrence.fieldName,
              occurrence.entityName,
              occurrence.fieldDisplayName || '',
              enumValue.name,
              String(enumValue.enumValue),
              enumValue.displayName || '',
              enumValue.description || '',
            ]);
          }
        }
      }

      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Grouped Enumerations');
    } else if (viewMode === 'values') {
      // Value Matrix - Each enumeration field gets its own sheet
      for (const group of groupedEnumerations) {
        const allEnumValuesMap = new Map<string, EnumValue>();
        group.occurrences.forEach(occ => {
          occ.enumValues.forEach(ev => {
            if (!allEnumValuesMap.has(ev.enumValue.toString())) {
              allEnumValuesMap.set(ev.enumValue.toString(), ev);
            }
          });
        });
        const sortedEnumValues = Array.from(allEnumValuesMap.entries()).sort((a, b) => 
          a[0].localeCompare(b[0])
        );

        const data: any[] = [];
        // Header row
        const header = ['Enum Value', 'Display Name', ...group.occurrences.map(occ => occ.entityName)];
        data.push(header);

        // Data rows - one per enum value
        for (const [enumValue, enumObj] of sortedEnumValues) {
          const row = [enumValue, enumObj.displayName || ''];
          for (const occurrence of group.occurrences) {
            const entityEnumValue = occurrence.enumValues.find(ev => ev.enumValue.toString() === enumValue);
            row.push(entityEnumValue ? entityEnumValue.enumValue.toString() : '');
          }
          data.push(row);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        // Sanitize sheet name (max 31 chars, no special chars)
        const sheetName = group.fieldName.substring(0, 31).replace(/[\\\/?\*\[\]]/g, '_');
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    } else {
      // Comparison/Entity Matrix - One sheet per field
      for (const group of groupedEnumerations) {
        const allEnumValues = new Set<string>();
        group.occurrences.forEach(occ => {
          occ.enumValues.forEach(ev => allEnumValues.add(ev.enumValue.toString()));
        });
        const sortedEnumValues = Array.from(allEnumValues).sort();

        const data: any[] = [];
        // Header row
        const header = ['Entity', ...sortedEnumValues];
        data.push(header);

        // Data rows - one per entity
        for (const occurrence of group.occurrences) {
          const row = [occurrence.entityName];
          const entityEnumValues = new Set(occurrence.enumValues.map(ev => ev.enumValue.toString()));
          for (const enumValue of sortedEnumValues) {
            row.push(entityEnumValues.has(enumValue) ? '✓' : '');
          }
          data.push(row);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        // Sanitize sheet name (max 31 chars, no special chars)
        const sheetName = group.fieldName.substring(0, 31).replace(/[\\\/?\*\[\]]/g, '_');
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    }

    // Write file
    XLSX.writeFile(workbook, `enumeration_evaluations_${viewMode}.xlsx`);
  };

  // Build comparison matrix
  const buildComparisonMatrix = () => {
    const matrix = new Map<string, Map<string, EnumValue[]>>();
    
    for (const enumeration of enumerations) {
      if (!matrix.has(enumeration.fieldName)) {
        matrix.set(enumeration.fieldName, new Map());
      }
      matrix.get(enumeration.fieldName)!.set(enumeration.entityName, enumeration.enumValues);
    }
    
    return matrix;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            Enumeration Evaluations
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadDTDLEnumerations}
              disabled={loading}
              sx={{ mr: 1 }}
            >
              Reload
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={exportToExcel}
              disabled={groupedEnumerations.length === 0}
            >
              Export Excel
            </Button>
          </Box>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && enumerations.length === 0 && (
          <Alert severity="info">
            No enumerations found in DTDL files. Make sure the InbuiltEntitiesDTDL folder contains valid DTDL JSON files.
          </Alert>
        )}

        {!loading && enumerations.length > 0 && (
          <>
            {/* Summary Stats */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
              <Chip label={`${enumerations.length} Total Enumerations`} color="primary" />
              <Chip label={`${groupedEnumerations.length} Unique Field Names`} color="secondary" />
              <Chip label={`${availableEntities.length - 1} Entities`} color="info" />
            </Box>

            {/* View Tabs */}
            <Tabs value={viewMode} onChange={(_, newValue) => setViewMode(newValue)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Grouped View" value="grouped" />
              <Tab label="Entity Matrix" value="comparison" />
              <Tab label="Value Matrix" value="values" />
            </Tabs>

            {/* Filters */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="Filter by Field Name or Value"
                variant="outlined"
                size="small"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                sx={{ flexGrow: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Entity</InputLabel>
                <Select
                  value={entityFilter}
                  label="Entity"
                  onChange={(e) => setEntityFilter(e.target.value)}
                >
                  {availableEntities.map(entity => (
                    <MenuItem key={entity} value={entity}>
                      {entity === 'all' ? 'All Entities' : entity}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {viewMode === 'grouped' && (
                <>
                  <Button size="small" onClick={expandAll}>Expand All</Button>
                  <Button size="small" onClick={collapseAll}>Collapse All</Button>
                </>
              )}
            </Box>

            {/* Grouped View */}
            {viewMode === 'grouped' && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width="50px"></TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortField === 'fieldName'}
                          direction={sortField === 'fieldName' ? sortOrder : 'asc'}
                          onClick={() => handleSort('fieldName')}
                        >
                          Field Name
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={sortField === 'occurrences'}
                          direction={sortField === 'occurrences' ? sortOrder : 'asc'}
                          onClick={() => handleSort('occurrences')}
                        >
                          Entities
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={sortField === 'uniqueValues'}
                          direction={sortField === 'uniqueValues' ? sortOrder : 'asc'}
                          onClick={() => handleSort('uniqueValues')}
                        >
                          Unique Values
                        </TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groupedEnumerations.map((group) => (
                      <React.Fragment key={group.fieldName}>
                        <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => toggleGroup(group.fieldName)}>
                          <TableCell>
                            <IconButton size="small">
                              {expandedGroups.has(group.fieldName) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {group.fieldName}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={group.totalEntities} size="small" color="primary" />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={group.uniqueEnumValues.size} size="small" color="secondary" />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={4} sx={{ p: 0, border: 0 }}>
                            <Collapse in={expandedGroups.has(group.fieldName)} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                                {group.occurrences.map((occurrence, idx) => (
                                  <Box key={idx} sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" color="primary">
                                      {occurrence.entityName}
                                      {occurrence.fieldDisplayName && ` - ${occurrence.fieldDisplayName}`}
                                    </Typography>
                                    {occurrence.fieldDescription && (
                                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                        {occurrence.fieldDescription}
                                      </Typography>
                                    )}
                                    <Table size="small" sx={{ mt: 1 }}>
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>Enum Name</TableCell>
                                          <TableCell>Value</TableCell>
                                          <TableCell>Display Name</TableCell>
                                          <TableCell>Description</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {occurrence.enumValues.map((ev, evIdx) => (
                                          <TableRow key={evIdx}>
                                            <TableCell>{ev.name}</TableCell>
                                            <TableCell>{ev.enumValue}</TableCell>
                                            <TableCell>{ev.displayName || '-'}</TableCell>
                                            <TableCell>{ev.description || '-'}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </Box>
                                ))}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Comparison Matrix View */}
            {viewMode === 'comparison' && (
              <Box>
                {groupedEnumerations.map((group) => {
                  // Get all unique enum values across all entities for this field
                  const allEnumValues = new Set<string>();
                  group.occurrences.forEach(occ => {
                    occ.enumValues.forEach(ev => allEnumValues.add(ev.enumValue));
                  });
                  const sortedEnumValues = Array.from(allEnumValues).sort();

                  return (
                    <Paper key={group.fieldName} sx={{ mb: 3, p: 2 }}>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {group.fieldName}
                        <Chip label={`${group.totalEntities} entities`} size="small" color="primary" />
                        <Chip label={`${sortedEnumValues.length} values`} size="small" color="secondary" />
                      </Typography>
                      
                      <TableContainer sx={{ maxHeight: 600 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.light', color: 'white', minWidth: 200 }}>
                                Entity
                              </TableCell>
                              {sortedEnumValues.map((enumValue) => (
                                <TableCell 
                                  key={enumValue} 
                                  align="center" 
                                  sx={{ 
                                    fontWeight: 'bold', 
                                    bgcolor: 'primary.light', 
                                    color: 'white',
                                    minWidth: 120,
                                    writingMode: 'vertical-rl',
                                    transform: 'rotate(180deg)',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <Tooltip title={enumValue}>
                                    <span>{enumValue}</span>
                                  </Tooltip>
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.occurrences.map((occurrence) => {
                              const entityEnumValues = new Set(occurrence.enumValues.map(ev => ev.enumValue));
                              return (
                                <TableRow key={occurrence.entityName} hover>
                                  <TableCell sx={{ fontWeight: 'medium', bgcolor: 'grey.50' }}>
                                    {occurrence.entityName}
                                  </TableCell>
                                  {sortedEnumValues.map((enumValue) => {
                                    const hasValue = entityEnumValues.has(enumValue);
                                    return (
                                      <TableCell 
                                        key={enumValue} 
                                        align="center"
                                        sx={{ 
                                          bgcolor: hasValue ? 'success.light' : 'grey.100',
                                          borderLeft: 1,
                                          borderColor: 'divider'
                                        }}
                                      >
                                        {hasValue ? (
                                          <CheckCircleIcon color="success" fontSize="small" />
                                        ) : (
                                          <CancelIcon sx={{ color: 'grey.400' }} fontSize="small" />
                                        )}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  );
                })}
              </Box>
            )}

            {/* Value Matrix View - Transposed */}
            {viewMode === 'values' && (
              <Box>
                {groupedEnumerations.map((group) => {
                  // Collect all unique enum values (case-insensitive grouping) across all entities
                  const valueMap = new Map<string, Set<string>>();
                  group.occurrences.forEach(occ => {
                    occ.enumValues.forEach(ev => {
                      const valueStr = ev.enumValue.toString();
                      const lowerValue = valueStr.toLowerCase();
                      if (!valueMap.has(lowerValue)) {
                        valueMap.set(lowerValue, new Set());
                      }
                      valueMap.get(lowerValue)!.add(valueStr);
                    });
                  });
                  
                  // Sort by lowercase value for alphanumeric ordering
                  const sortedKeys = Array.from(valueMap.keys()).sort();
                  
                  return (
                    <Paper key={group.fieldName} sx={{ mb: 3, p: 2 }}>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {group.fieldName}
                        <Chip label={`${group.totalEntities} entities`} size="small" color="primary" />
                        <Chip label={`${sortedKeys.length} unique values`} size="small" color="secondary" />
                      </Typography>
                      
                      <TableContainer sx={{ maxHeight: 600 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'secondary.light', color: 'white', minWidth: 150 }}>
                                Value
                              </TableCell>
                              {group.occurrences.map((occurrence) => (
                                <TableCell 
                                  key={occurrence.entityName} 
                                  align="center"
                                  sx={{ 
                                    fontWeight: 'bold', 
                                    bgcolor: 'secondary.light', 
                                    color: 'white',
                                    minWidth: 100,
                                    writingMode: 'vertical-rl',
                                    transform: 'rotate(180deg)',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <Tooltip title={occurrence.entityName}>
                                    <span>{occurrence.entityName}</span>
                                  </Tooltip>
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {sortedKeys.map((lowerValue) => {
                              const variants = valueMap.get(lowerValue)!;
                              
                              // Collect actual values for each entity for this enum value (case-insensitive match)
                              const rowValues = group.occurrences.map((occurrence) => {
                                const entityEnumValue = occurrence.enumValues.find(ev => 
                                  ev.enumValue.toString().toLowerCase() === lowerValue
                                );
                                return entityEnumValue ? entityEnumValue.enumValue.toString() : '';
                              });
                              
                              // Find unique values in this row (excluding empty strings)
                              const nonEmptyValues = rowValues.filter(v => v !== '');
                              const uniqueValues = new Set(nonEmptyValues);
                              const hasInconsistency = uniqueValues.size > 1;
                              
                              // Use the most common variant or first one as the row label
                              const rowLabel = Array.from(variants)[0];
                              
                              return (
                                <TableRow key={lowerValue} hover>
                                  <TableCell sx={{ fontWeight: 'medium', bgcolor: 'grey.50' }}>
                                    {rowLabel}
                                    {hasInconsistency && (
                                      <Chip 
                                        label="inconsistent" 
                                        size="small" 
                                        color="warning" 
                                        sx={{ ml: 1, fontSize: '0.7rem' }}
                                      />
                                    )}
                                  </TableCell>
                                  {group.occurrences.map((occurrence) => {
                                    const entityEnumValue = occurrence.enumValues.find(ev => 
                                      ev.enumValue.toString().toLowerCase() === lowerValue
                                    );
                                    const displayValue = entityEnumValue ? entityEnumValue.enumValue.toString() : '';
                                    const hasValue = displayValue !== '';
                                    
                                    // Check if this cell's value differs from others in the row
                                    const isDifferent = hasValue && hasInconsistency;
                                    
                                    return (
                                      <TableCell 
                                        key={occurrence.entityName} 
                                        align="center"
                                        sx={{ 
                                          bgcolor: !hasValue ? 'grey.100' : isDifferent ? 'warning.light' : 'success.light',
                                          borderLeft: 1,
                                          borderColor: 'divider',
                                          fontSize: '0.85rem',
                                          fontWeight: hasValue ? 'medium' : 'normal',
                                          color: !hasValue ? 'grey.600' : isDifferent ? 'warning.dark' : 'success.dark'
                                        }}
                                      >
                                        <Tooltip title={
                                          isDifferent 
                                            ? `Inconsistent! Other values: ${Array.from(uniqueValues).filter(v => v !== displayValue).join(', ')}`
                                            : entityEnumValue?.displayName || displayValue || 'No value'
                                        }>
                                          <span>{displayValue}</span>
                                        </Tooltip>
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      
                      {/* Show inconsistencies summary */}
                      {Array.from(valueMap.entries()).some(([_, variants]) => variants.size > 1) && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="warning.dark">
                            ⚠️ Inconsistencies Detected:
                          </Typography>
                          {Array.from(valueMap.entries())
                            .filter(([_, variants]) => variants.size > 1)
                            .map(([lowerValue, variants]) => (
                              <Box key={lowerValue} sx={{ mb: 1 }}>
                                <Typography variant="body2" color="warning.dark">
                                  <strong>{lowerValue}:</strong> {Array.from(variants).join(', ')}
                                </Typography>
                              </Box>
                            ))}
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            )}

            {groupedEnumerations.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No enumerations match your filter criteria.
              </Alert>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default EnumerationEvaluations;
