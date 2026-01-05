import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Menu,
  MenuItem,
  IconButton,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface EntityStructure {
  id: string;
  name: string;
  displayName: string;
  attributes: Array<{
    name: string;
    displayName?: string;
    schema: string;
    description?: string;
    isPrimaryKey: boolean;
    isRequired: boolean;
    canBePrimaryKey: boolean;
    enumValues?: string[];
  }>;
  relationships: Array<{
    name: string;
    displayName?: string;
    targetEntityId?: string;
    targetEntityName?: string;
    TargetEntityName?: string;
    cardinality: string;
  }>;
}

interface EntityRelationshipDiagramProps {
  rootEntity: string;
  entityStructures: EntityStructure[];
  enabledFields: Record<string, boolean>;
  onToggleField: (entityName: string, fieldName: string) => void;
  onFieldClick: (entityName: string, fieldName: string) => void;
  fieldRules: Array<{
    entityName: string;
    fieldName: string;
    ruleType: string;
  }>;
  onDeleteFieldRule: (entityName: string, fieldName: string) => void;
  allEntities?: Array<{ name: string; displayName?: string; }>;
  selectedRelatedEntities: string[];
  onAddRelatedEntity: (entityName: string) => void;
}

interface MappingRow {
  sourceType: string;
  sourcePrimaryKey: string;
  targetType: string;
  targetPrimaryKey: string;
  relationshipType: string;
}

const EntityRelationshipDiagram: React.FC<EntityRelationshipDiagramProps> = ({
  rootEntity,
  entityStructures,
  enabledFields,
  onToggleField,
  onFieldClick,
  fieldRules,
  onDeleteFieldRule,
  allEntities = [],
  selectedRelatedEntities,
  onAddRelatedEntity,
}) => {
  const [expandedEntity, setExpandedEntity] = React.useState<string | null>(null);
  const [expandedMapping, setExpandedMapping] = React.useState<string | null>(null);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [menuEntityName, setMenuEntityName] = React.useState<string>('');

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, entityName: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuEntityName(entityName);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuEntityName('');
  };

  const handleSelectRelatedEntity = (entityDisplayName: string) => {
    onAddRelatedEntity(entityDisplayName);
    handleCloseMenu();
  };

  // Get related entities for a specific entity
  const getRelatedEntitiesForEntity = (entityName: string): string[] => {
    // First try to find entity in already loaded structures
    let entity = entityStructures.find(e => e.name === entityName);
    
    // If not found in structures, it might be because we need to look at all entities
    // In this case, we'll need to fetch or find the entity definition elsewhere
    if (!entity) {
      // For now, return empty array if entity not in structures
      // The entity might not be loaded yet
      console.warn(`Entity ${entityName} not found in entityStructures`);
      console.log('Available entities in entityStructures:', entityStructures.map(e => e.name));
      return [];
    }
    
    if (!entity.relationships) {
      console.log(`Entity ${entityName} has no relationships`);
      return [];
    }
    
    console.log(`Entity ${entityName} relationships:`, entity.relationships);
    
    const relatedEntityNames = entity.relationships
      .map(rel => {
        // Get the target ID from the relationship (e.g., "dtmi:digitaltwins:isa95:OperationsDefinition;1")
        const targetId = rel.target || rel.targetEntityId || '';
        console.log(`Looking for target entity with ID: ${targetId}`);
        
        // Find entity by ID
        let targetEntity = allEntities.find(e => e.id === targetId);
        
        const result = targetEntity ? (targetEntity.displayName || targetEntity.name) : '';
        console.log(`Resolved ${targetId} to: ${result || '(not found)'}`);
        return result;
      })
      .filter(name => name !== '');
    
    console.log(`Final related entities for ${entityName}:`, relatedEntityNames);
    return relatedEntityNames;
  };

  // Build mapping structure - only from root entity to related entities
  const mappings: MappingRow[] = [];
  const rootEntityData = entityStructures.find((e) => e.name === rootEntity);

  if (rootEntityData) {
    // Get all primary key fields (can be multiple)
    const sourcePKFields = rootEntityData.attributes
      .filter((attr) => attr.isPrimaryKey)
      .map((attr) => attr.name);
    const sourcePK = sourcePKFields.length > 0 
      ? sourcePKFields.join(', ') 
      : 'No PK defined';

    rootEntityData.relationships?.forEach((rel) => {
      const targetName = rel.targetEntityName || rel.TargetEntityName || '';
      const targetEntity = entityStructures.find((e) => 
        e.name === targetName || e.id === rel.targetEntityId
      );

      if (targetEntity) {
        // Get all primary key fields from target entity
        const targetPKFields = targetEntity.attributes
          .filter((attr) => attr.isPrimaryKey)
          .map((attr) => attr.name);
        const targetPK = targetPKFields.length > 0 
          ? targetPKFields.join(', ') 
          : 'No PK defined';

        // Check if this mapping already exists (avoid duplicates)
        const exists = mappings.some(m => 
          m.sourceType === (rootEntityData.displayName || rootEntityData.name) &&
          m.targetType === (targetEntity.displayName || targetEntity.name) &&
          m.relationshipType === rel.name
        );

        if (!exists) {
          mappings.push({
            sourceType: rootEntityData.displayName || rootEntityData.name,
            sourcePrimaryKey: `${rootEntityData.name}.{${sourcePK}}`,
            targetType: targetEntity.displayName || targetEntity.name,
            targetPrimaryKey: `${targetEntity.name}.{${targetPK}}`,
            relationshipType: rel.name, // Use name instead of cardinality
          });
        }
      }
    });
  }

  // Create visual diagram with expandable field configuration
  const renderDiagram = () => {
    if (!rootEntityData) return null;

    // Separate self-referential relationships (same entity as root) from others
    const selfReferentialEntities = entityStructures
      .map((entity, idx) => ({ entity, idx }))
      .filter(({ entity, idx }) => idx > 0 && entity.name === rootEntity);
    
    const otherRelatedEntities = entityStructures
      .map((entity, idx) => ({ entity, idx }))
      .filter(({ entity, idx }) => idx > 0 && entity.name !== rootEntity);

    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 4, p: 2, flexWrap: 'wrap' }}>
        {/* Left section: Root Entity with Self-Referential below */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        {/* Root Entity */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Paper
            elevation={4}
            sx={{
              p: 2,
              minWidth: 150,
              border: 2,
              borderColor: 'primary.main',
              bgcolor: 'primary.50',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'primary.100' },
            }}
            onClick={() => setExpandedEntity(expandedEntity === rootEntity ? null : rootEntity)}
          >
            <Typography variant="subtitle2" fontWeight="bold" align="center">
              {rootEntityData.displayName || rootEntityData.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              (Root) {expandedEntity === rootEntity ? '▲' : '▼'}
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={(e) => handleOpenMenu(e, rootEntityData.name)}
                sx={{ fontSize: '0.7rem', py: 0.5 }}
              >
                Add Related
              </Button>
            </Box>
          </Paper>
          
          {/* Field Configuration for Root Entity */}
          {expandedEntity === rootEntity && (
            <TableContainer component={Paper} sx={{ mt: 2, maxWidth: '100%', overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    {rootEntityData.attributes.map((attr) => {
                      const fieldRule = fieldRules.find(
                        r => r.entityName === rootEntityData.name && r.fieldName === attr.name
                      );
                      const fieldKey = `${rootEntityData.name}.${attr.name}`;
                      const isEnabled = attr.isRequired || enabledFields[fieldKey];
                      
                      return (
                        <TableCell 
                          key={attr.name}
                          sx={{ 
                            bgcolor: attr.isRequired ? 'grey.200' : 'transparent',
                            opacity: isEnabled ? 1 : 0.5,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: attr.isRequired ? 'grey.300' : 'grey.100' },
                            minWidth: 140,
                            maxWidth: 200,
                            verticalAlign: 'top',
                            p: 1.5
                          }}
                          onClick={() => onFieldClick(rootEntityData.name, attr.name)}
                        >
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                              <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
                                {attr.name}
                              </Typography>
                              {attr.isPrimaryKey && (
                                <Typography variant="caption" sx={{ fontSize: '0.9rem' }}>🔑</Typography>
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace', mb: 1, fontSize: '0.7rem' }}>
                              {attr.schema}
                            </Typography>
                            {!attr.isRequired && (
                              <Box 
                                sx={{ mb: 1 }} 
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={() => onToggleField(rootEntityData.name, attr.name)}
                                    style={{ marginRight: 4, cursor: 'pointer' }}
                                  />
                                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                                    Generate
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                            {fieldRule ? (
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-block',
                                  px: 0.75,
                                  py: 0.35,
                                  bgcolor: 'success.main',
                                  color: 'white',
                                  borderRadius: 0.5,
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: 'success.dark' }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteFieldRule(rootEntityData.name, attr.name);
                                }}
                              >
                                {fieldRule.ruleType} ✕
                              </Box>
                            ) : (
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-block',
                                  px: 0.75,
                                  py: 0.35,
                                  border: 1,
                                  borderColor: 'divider',
                                  borderRadius: 0.5,
                                  fontSize: '0.7rem'
                                }}
                              >
                                Auto
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableHead>
              </Table>
            </TableContainer>
          )}
        </Box>

        {/* Self-Referential Entities (below root) */}
        {selfReferentialEntities.length > 0 && selfReferentialEntities.map(({ entity, idx }) => {
          // Find the mapping for this relationship
          const mapping = mappings.find(m => 
            m.targetType === (entity.displayName || entity.name)
          );

          return (
            <Box key={`${entity.name}-${idx}`} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Vertical Connection Line */}
              <Box
                sx={{
                  width: 2,
                  height: 40,
                  bgcolor: 'divider',
                }}
              />
              
              {/* Mapping Info Box */}
              {mapping && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
                  <Paper
                    sx={{
                      p: 1,
                      bgcolor: 'info.light',
                      border: 1,
                      borderColor: 'info.main',
                      minWidth: 200,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'info.main', '& *': { color: 'white' } },
                    }}
                    onClick={() => setExpandedMapping(expandedMapping === `${entity.name}-${idx}` ? null : `${entity.name}-${idx}`)}
                  >
                    <Typography variant="caption" fontWeight="bold" display="block" color="info.dark">
                      {mapping.relationshipType} {expandedMapping === `${entity.name}-${idx}` ? '▲' : '▼'}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem' }}>
                      {mapping.sourcePrimaryKey} → {mapping.targetPrimaryKey}
                    </Typography>
                  </Paper>
                  
                  {/* Expanded Mapping Details */}
                  {expandedMapping === `${entity.name}-${idx}` && (
                    <Paper sx={{ mt: 1, p: 1.5, minWidth: 350, border: 1, borderColor: 'info.main' }}>
                      <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
                        Mapping Details:
                      </Typography>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.7rem', p: 0.5 }}>Source Type:</TableCell>
                            <TableCell sx={{ fontSize: '0.7rem', p: 0.5 }}>{mapping.sourceType}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.7rem', p: 0.5 }}>Source PK:</TableCell>
                            <TableCell sx={{ fontSize: '0.7rem', p: 0.5, fontFamily: 'monospace' }}>{mapping.sourcePrimaryKey}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.7rem', p: 0.5 }}>Target Type:</TableCell>
                            <TableCell sx={{ fontSize: '0.7rem', p: 0.5 }}>{mapping.targetType}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.7rem', p: 0.5 }}>Target PK:</TableCell>
                            <TableCell sx={{ fontSize: '0.7rem', p: 0.5, fontFamily: 'monospace' }}>{mapping.targetPrimaryKey}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.7rem', p: 0.5 }}>Relationship:</TableCell>
                            <TableCell sx={{ fontSize: '0.7rem', p: 0.5 }}>{mapping.relationshipType}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Paper>
                  )}
                </Box>
              )}
              
              {/* Entity Box */}
              <Paper
                elevation={2}
                sx={{
                  p: 1.5,
                  minWidth: 140,
                  border: 1,
                  borderColor: 'warning.main',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'grey.100' },
                }}
                onClick={() => setExpandedEntity(expandedEntity === `${entity.name}-${idx}` ? null : `${entity.name}-${idx}`)}
              >
                <Typography variant="body2" fontWeight="medium">
                  {entity.displayName || entity.name} {expandedEntity === `${entity.name}-${idx}` ? '▲' : '▼'}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={(e) => handleOpenMenu(e, entity.name)}
                    sx={{ fontSize: '0.7rem', py: 0.5 }}
                  >
                    Add Related
                  </Button>
                </Box>
              </Paper>
              
              {/* Field Configuration for Self-Referential Entity */}
              {expandedEntity === `${entity.name}-${idx}` && (
                <TableContainer component={Paper} sx={{ mt: 2, maxWidth: '100%', overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow>
                        {entity.attributes.map((attr) => {
                          const fieldRule = fieldRules.find(
                            r => r.entityName === entity.name && r.fieldName === attr.name
                          );
                          const fieldKey = `${entity.name}.${attr.name}`;
                          const isEnabled = attr.isRequired || enabledFields[fieldKey];
                          
                          return (
                            <TableCell 
                              key={attr.name}
                              sx={{ 
                                bgcolor: attr.isRequired ? 'grey.200' : 'transparent',
                                opacity: isEnabled ? 1 : 0.5,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: attr.isRequired ? 'grey.300' : 'grey.100' },
                                minWidth: 140,
                                maxWidth: 200,
                                verticalAlign: 'top',
                                p: 1.5
                              }}
                              onClick={() => onFieldClick(entity.name, attr.name)}
                            >
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
                                    {attr.name}
                                  </Typography>
                                  {attr.isPrimaryKey && (
                                    <Typography variant="caption" sx={{ fontSize: '0.9rem' }}>🔑</Typography>
                                  )}
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace', mb: 1, fontSize: '0.7rem' }}>
                                  {attr.schema}
                                </Typography>
                                {!attr.isRequired && (
                                  <Box 
                                    sx={{ mb: 1 }} 
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <input
                                        type="checkbox"
                                        checked={isEnabled}
                                        onChange={() => onToggleField(entity.name, attr.name)}
                                        style={{ marginRight: 4, cursor: 'pointer' }}
                                      />
                                      <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                                        Generate
                                      </Typography>
                                    </Box>
                                  </Box>
                                )}
                                {fieldRule ? (
                                  <Box
                                    component="span"
                                    sx={{
                                      display: 'inline-block',
                                      px: 0.75,
                                      py: 0.35,
                                      bgcolor: 'success.main',
                                      color: 'white',
                                      borderRadius: 0.5,
                                      fontSize: '0.7rem',
                                      cursor: 'pointer',
                                      '&:hover': { bgcolor: 'success.dark' }
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteFieldRule(entity.name, attr.name);
                                    }}
                                  >
                                    {fieldRule.ruleType} ✕
                                  </Box>
                                ) : (
                                  <Box
                                    component="span"
                                    sx={{
                                      display: 'inline-block',
                                      px: 0.75,
                                      py: 0.35,
                                      border: 1,
                                      borderColor: 'divider',
                                      borderRadius: 0.5,
                                      fontSize: '0.7rem'
                                    }}
                                  >
                                    Auto
                                  </Box>
                                )}
                              </Box>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableHead>
                  </Table>
                </TableContainer>
              )}
            </Box>
          );
        })}
        </Box>

        {/* Other Related Entities (to the right) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {otherRelatedEntities
            .map(({ entity, idx }) => {
              // Find the mapping for this relationship
              const mapping = mappings.find(m => 
                m.targetType === (entity.displayName || entity.name)
              );

              return (
                <Box key={`${entity.name}-${idx}`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 60,
                        height: 2,
                        bgcolor: 'divider',
                      }}
                    />
                    
                    {/* Mapping Info Box */}
                    {mapping && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Paper
                          sx={{
                            p: 1,
                            bgcolor: 'info.light',
                            border: 1,
                            borderColor: 'info.main',
                            minWidth: 200,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'info.main', '& *': { color: 'white' } },
                          }}
                          onClick={() => setExpandedMapping(expandedMapping === entity.name ? null : entity.name)}
                        >
                          <Typography variant="caption" fontWeight="bold" display="block" color="info.dark">
                            {mapping.relationshipType} {expandedMapping === entity.name ? '▲' : '▼'}
                          </Typography>
                          <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem' }}>
                            {mapping.sourcePrimaryKey} → {mapping.targetPrimaryKey}
                          </Typography>
                        </Paper>
                        
                        {/* Expanded Mapping Details */}
                        {expandedMapping === entity.name && (
                          <Paper sx={{ mt: 1, p: 1.5, minWidth: 350, border: 1, borderColor: 'info.main' }}>
                            <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
                              Mapping Details:
                            </Typography>
                            <Table size="small">
                              <TableBody>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.7rem', p: 0.5 }}>Source Type:</TableCell>
                                  <TableCell sx={{ fontSize: '0.7rem', p: 0.5 }}>{mapping.sourceType}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.7rem', p: 0.5 }}>Source PK:</TableCell>
                                  <TableCell sx={{ fontSize: '0.7rem', p: 0.5, fontFamily: 'monospace' }}>{mapping.sourcePrimaryKey}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.7rem', p: 0.5 }}>Target Type:</TableCell>
                                  <TableCell sx={{ fontSize: '0.7rem', p: 0.5 }}>{mapping.targetType}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.7rem', p: 0.5 }}>Target PK:</TableCell>
                                  <TableCell sx={{ fontSize: '0.7rem', p: 0.5, fontFamily: 'monospace' }}>{mapping.targetPrimaryKey}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.7rem', p: 0.5 }}>Relationship:</TableCell>
                                  <TableCell sx={{ fontSize: '0.7rem', p: 0.5 }}>{mapping.relationshipType}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </Paper>
                        )}
                      </Box>
                    )}
                    
                    <Box
                      sx={{
                        width: 60,
                        height: 2,
                        bgcolor: 'divider',
                      }}
                    />
                    
                    <Paper
                      elevation={2}
                      sx={{
                        p: 1.5,
                        minWidth: 140,
                        border: 1,
                        borderColor: 'divider',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'grey.100' },
                      }}
                      onClick={() => setExpandedEntity(expandedEntity === entity.name ? null : entity.name)}
                    >
                      <Typography variant="body2" fontWeight="medium">
                        {entity.displayName || entity.name} {expandedEntity === entity.name ? '▲' : '▼'}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={(e) => handleOpenMenu(e, entity.name)}
                          sx={{ fontSize: '0.7rem', py: 0.5 }}
                        >
                          Add Related
                        </Button>
                      </Box>
                    </Paper>
                  </Box>
                
                {/* Field Configuration for Related Entity */}
                {expandedEntity === entity.name && (
                  <TableContainer component={Paper} sx={{ mt: 2, ml: 8, maxWidth: '100%', overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 650 }}>
                      <TableHead>
                        <TableRow>
                          {entity.attributes.map((attr) => {
                            const fieldRule = fieldRules.find(
                              r => r.entityName === entity.name && r.fieldName === attr.name
                            );
                            const fieldKey = `${entity.name}.${attr.name}`;
                            const isEnabled = attr.isRequired || enabledFields[fieldKey];
                            
                            return (
                              <TableCell 
                                key={attr.name}
                                sx={{ 
                                  bgcolor: attr.isRequired ? 'grey.200' : 'transparent',
                                  opacity: isEnabled ? 1 : 0.5,
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: attr.isRequired ? 'grey.300' : 'grey.100' },
                                  minWidth: 140,
                                  maxWidth: 200,
                                  verticalAlign: 'top',
                                  p: 1.5
                                }}
                                onClick={() => onFieldClick(entity.name, attr.name)}
                              >
                                <Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                    <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
                                      {attr.name}
                                    </Typography>
                                    {attr.isPrimaryKey && (
                                      <Typography variant="caption" sx={{ fontSize: '0.9rem' }}>🔑</Typography>
                                    )}
                                  </Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace', mb: 1, fontSize: '0.7rem' }}>
                                    {attr.schema}
                                  </Typography>
                                  {!attr.isRequired && (
                                    <Box 
                                      sx={{ mb: 1 }} 
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <input
                                          type="checkbox"
                                          checked={isEnabled}
                                          onChange={() => onToggleField(entity.name, attr.name)}
                                          style={{ marginRight: 4, cursor: 'pointer' }}
                                        />
                                        <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                                          Generate
                                        </Typography>
                                      </Box>
                                    </Box>
                                  )}
                                  {fieldRule ? (
                                    <Box
                                      component="span"
                                      sx={{
                                        display: 'inline-block',
                                        px: 0.75,
                                        py: 0.35,
                                        bgcolor: 'success.main',
                                        color: 'white',
                                        borderRadius: 0.5,
                                        fontSize: '0.7rem',
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'success.dark' }
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteFieldRule(entity.name, attr.name);
                                      }}
                                    >
                                      {fieldRule.ruleType} ✕
                                    </Box>
                                  ) : (
                                    <Box
                                      component="span"
                                      sx={{
                                        display: 'inline-block',
                                        px: 0.75,
                                        py: 0.35,
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 0.5,
                                        fontSize: '0.7rem'
                                      }}
                                    >
                                      Auto
                                    </Box>
                                  )}
                                </Box>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      </TableHead>
                    </Table>
                  </TableContainer>
                )}
                </Box>
              );
            })}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Entity Relationships
      </Typography>

      {/* Visual Diagram */}
      <Paper sx={{ mb: 2, p: 2, bgcolor: 'grey.50' }}>
        {renderDiagram()}
      </Paper>

      {/* Menu for selecting related entities */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          style: {
            maxHeight: 400,
            width: '300px',
          },
        }}
      >
        {(() => {
          const relatedEntities = getRelatedEntitiesForEntity(menuEntityName);
          console.log(`Menu opened for entity: ${menuEntityName}`);
          console.log('Related entities for this entity:', relatedEntities);
          
          const availableEntities = allEntities
            .filter(e => {
              const displayName = e.displayName || e.name;
              return relatedEntities.includes(displayName) && 
                     !selectedRelatedEntities.includes(displayName);
            });

          console.log('Available entities to add:', availableEntities.map(e => e.displayName || e.name));

          if (availableEntities.length === 0) {
            return (
              <MenuItem disabled>
                <Typography variant="caption" color="text.secondary">
                  No more related entities to add
                </Typography>
              </MenuItem>
            );
          }

          return availableEntities.map((entity) => (
            <MenuItem
              key={entity.name}
              onClick={() => handleSelectRelatedEntity(entity.displayName || entity.name)}
            >
              {entity.displayName || entity.name}
            </MenuItem>
          ));
        })()}
      </Menu>
    </Box>
  );
};

export default EntityRelationshipDiagram;
