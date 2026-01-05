import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  PlayArrow as GenerateIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  FolderOpen as LoadIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  useEntities,
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
import { DataGenerationRequest, DataGenerationResponse, DataGenerationScenario, RuleType } from '../types';
import FieldRuleEditor from './FieldRuleEditor';

interface GraphNode {
  id: string;
  entityName: string;
  displayName: string;
  position: { x: number; y: number };
  structure?: any;
  instanceCount?: number; // Number of records to generate for this entity
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipName: string;
  relationshipType: string;
  sourceToTarget: boolean; // true for outbound, false for inbound
  cardinality?: number; // Number of target records per source record
  composeId?: boolean; // Whether to include source ID in target ID
}

const GraphDataGeneration: React.FC = () => {
  const { data: entities } = useEntities();
  const { data: allPKRules } = usePrimaryKeyRules();
  const { data: allFieldRules } = useFieldRules();
  const { data: scenarios } = useScenarios();

  const [rootEntity, setRootEntity] = useState('');
  const [instanceCount, setInstanceCount] = useState(10);
  const [seed, setSeed] = useState(42);
  const [maxDepth, setMaxDepth] = useState(2);
  
  // Graph state
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // UI state
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [addEntityMenuAnchor, setAddEntityMenuAnchor] = useState<null | HTMLElement>(null);
  const [addRelationshipMenuAnchor, setAddRelationshipMenuAnchor] = useState<null | HTMLElement>(null);
  const [relationshipDirection, setRelationshipDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [configExpanded, setConfigExpanded] = useState(true);
  const [fieldRuleDialogOpen, setFieldRuleDialogOpen] = useState(false);
  const [expandedMappings, setExpandedMappings] = useState<Set<string>>(new Set());
  const [selectedField, setSelectedField] = useState<{ entityName: string; fieldName: string } | null>(null);
  const [editingEntityRule, setEditingEntityRule] = useState<string | null>(null);
  const [editingRelationshipRule, setEditingRelationshipRule] = useState<string | null>(null);
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({});
  const [entityStructureCache, setEntityStructureCache] = useState<Record<string, any>>({});
  const [loadingInboundRels, setLoadingInboundRels] = useState(false);
  const [inboundRelationships, setInboundRelationships] = useState<any[]>([]);
  
  // Scenario management
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const generateData = useGenerateData();
  const downloadData = useDownloadData();
  const saveScenario = useSaveScenario();
  const deleteScenario = useDeleteScenario();
  const defineFieldRule = useDefineFieldRule();
  const deleteFieldRule = useDeleteFieldRule();

  const [generatedData, setGeneratedData] = useState<DataGenerationResponse | null>(null);

  // Fetch entity structure
  const fetchEntityStructure = async (entityName: string) => {
    try {
      const response = await fetch(`http://localhost:5237/api/entities/${entityName}/structure`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch entity structure:', error);
    }
    return null;
  };

  // Add entity to graph
  const addEntityToGraph = async (entityName: string) => {
    const entity = entities?.find(e => e.name === entityName);
    if (!entity) return;

    // Check if entity already exists in graph
    if (graphNodes.some(n => n.entityName === entityName)) {
      console.log(`Entity ${entityName} already exists in graph, skipping duplicate`);
      return;
    }

    const structure = await fetchEntityStructure(entityName);
    
    const newNode: GraphNode = {
      id: `node-${Date.now()}`,
      entityName: entity.name,
      displayName: entity.displayName || entity.name,
      position: { x: Math.random() * 500, y: Math.random() * 300 },
      structure,
    };

    setGraphNodes(prev => [...prev, newNode]);
    
    // Initialize enabled fields for this entity
    if (structure?.attributes) {
      const newEnabledFields: Record<string, boolean> = {};
      structure.attributes.forEach((attr: any) => {
        const key = `${entity.name}.${attr.name}`;
        if (!attr.isRequired) {
          newEnabledFields[key] = true;
        }
      });
      setEnabledFields(prev => ({ ...prev, ...newEnabledFields }));
    }

    // Set as root entity if first entity added
    if (graphNodes.length === 0 && !rootEntity) {
      setRootEntity(entity.name);
    }
  };

  // Remove entity from graph
  const removeEntityFromGraph = (nodeId: string) => {
    setGraphNodes(prev => prev.filter(n => n.id !== nodeId));
    setGraphEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
  };

  // Add relationship between entities
  const addRelationship = async (
    sourceNodeId: string,
    targetEntityName: string,
    relationshipName: string,
    relationshipType: string,
    isOutbound: boolean
  ) => {
    const targetEntity = entities?.find(e => e.name === targetEntityName);
    if (!targetEntity) return;

    // Check if target entity already exists in graph
    let targetNode = graphNodes.find(n => n.entityName === targetEntityName);
    
    if (!targetNode) {
      // Add target entity to graph
      const structure = await fetchEntityStructure(targetEntityName);
      targetNode = {
        id: `node-${Date.now()}`,
        entityName: targetEntity.name,
        displayName: targetEntity.displayName || targetEntity.name,
        position: { x: Math.random() * 500 + 200, y: Math.random() * 300 + 100 },
        structure,
      };
      setGraphNodes(prev => [...prev, targetNode!]);
      
      // Initialize enabled fields
      if (structure?.attributes) {
        const newEnabledFields: Record<string, boolean> = {};
        structure.attributes.forEach((attr: any) => {
          const key = `${targetEntity.name}.${attr.name}`;
          if (!attr.isRequired) {
            newEnabledFields[key] = true;
          }
        });
        setEnabledFields(prev => ({ ...prev, ...newEnabledFields }));
      }
    }

    // Add edge
    const newEdge: GraphEdge = {
      id: `edge-${Date.now()}`,
      source: isOutbound ? sourceNodeId : targetNode.id,
      target: isOutbound ? targetNode.id : sourceNodeId,
      relationshipName,
      relationshipType,
      sourceToTarget: isOutbound,
    };

    setGraphEdges(prev => [...prev, newEdge]);
  };

  // Update React Flow nodes and edges when graph changes
  React.useEffect(() => {
    // Preserve existing entity node positions from current nodes state
    const flowNodes: Node[] = graphNodes.map((gNode, index) => {
      const existingNode = nodes.find(n => n.id === gNode.id);
      const isSelected = selectedNode?.id === gNode.id;
      
      // Get enabled fields for this entity
      const entityFields = gNode.structure?.attributes?.filter((attr: any) => {
        const fieldKey = `${gNode.entityName}.${attr.name}`;
        return enabledFields[fieldKey] !== false;
      }) || [];
      
      return {
        id: gNode.id,
        type: 'default',
        position: existingNode?.position || gNode.position,
        data: {
          label: (
            <Box sx={{ minWidth: 180 }}>
              {/* Header */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: '1px solid #ddd',
                pb: 1,
                mb: 1
              }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {gNode.displayName}
                  </Typography>
                  {gNode.entityName === rootEntity && (
                    <Chip label="Root" size="small" color="primary" sx={{ height: 16, fontSize: '0.65rem', mt: 0.5 }} />
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEntityFromGraph(gNode.id);
                  }}
                  sx={{ p: 0.5 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
              
              {/* Add Relationship Button */}
              <Button
                fullWidth
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode(gNode);
                  loadInboundRelationships(gNode);
                  setAddRelationshipMenuAnchor(e.currentTarget);
                }}
                sx={{ fontSize: '0.7rem', mb: 1 }}
              >
                Add Relationship
              </Button>
              
              {/* Instance Count */}
              {(() => {
                // Check if this entity is a target of any relationship with cardinality set
                const inboundEdgeWithCardinality = graphEdges.find(e => 
                  e.target === gNode.id && e.cardinality !== undefined
                );
                
                const isCardinalityControlled = !!inboundEdgeWithCardinality;
                const sourceNode = inboundEdgeWithCardinality 
                  ? graphNodes.find(n => n.id === inboundEdgeWithCardinality.source)
                  : null;
                
                return (
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      fontSize: '0.7rem',
                      cursor: isCardinalityControlled ? 'default' : 'pointer',
                      p: 0.5,
                      borderRadius: 1,
                      bgcolor: isCardinalityControlled ? 'info.lighter' : 'grey.50',
                      '&:hover': { bgcolor: isCardinalityControlled ? 'info.lighter' : 'grey.100' },
                      opacity: isCardinalityControlled ? 0.8 : 1
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isCardinalityControlled) {
                        setEditingEntityRule(gNode.id);
                      }
                    }}
                  >
                    <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                      Records: <strong>
                        {isCardinalityControlled 
                          ? `${inboundEdgeWithCardinality.cardinality} × ${sourceNode?.instanceCount || 'N'} (via ${sourceNode?.displayName})`
                          : (gNode.instanceCount || 'Auto')}
                      </strong>
                    </Typography>
                  </Box>
                );
              })()}
            </Box>
          ),
        },
        style: {
          background: gNode.entityName === rootEntity ? '#e3f2fd' : '#fff',
          border: isSelected ? '2px solid #f57c00' : (gNode.entityName === rootEntity ? '2px solid #1976d2' : '1px solid #ddd'),
          borderRadius: 8,
          padding: 12,
          minWidth: 200,
        },
      };
    });

    // Add mapping nodes and create edges with mappings
    const mappingNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    
    graphEdges.forEach((gEdge, index) => {
      const sourceNode = graphNodes.find(n => n.id === gEdge.source);
      const targetNode = graphNodes.find(n => n.id === gEdge.target);
      
      if (!sourceNode || !targetNode) return;
      
      // Get primary keys for mapping display
      const sourcePK = sourceNode.structure?.attributes
        ?.filter((attr: any) => attr.isPrimaryKey)
        .map((attr: any) => attr.name)
        .join(', ') || 'No PK';
      
      const targetPK = targetNode.structure?.attributes
        ?.filter((attr: any) => attr.isPrimaryKey)
        .map((attr: any) => attr.name)
        .join(', ') || 'No PK';
      
      // Create mapping node ID
      const mappingNodeId = `mapping-${gEdge.id}`;
      
      // Calculate position between source and target
      const mappingPosition = {
        x: (sourceNode.position.x + targetNode.position.x) / 2,
        y: (sourceNode.position.y + targetNode.position.y) / 2,
      };
      
      const isExpanded = expandedMappings.has(mappingNodeId);
      
      // Check if mapping node already exists in nodes state to preserve position
      const existingMappingNode = nodes.find(n => n.id === mappingNodeId);
      const finalPosition = existingMappingNode?.position || mappingPosition;
      
      // Add mapping node
      mappingNodes.push({
        id: mappingNodeId,
        type: 'default',
        position: finalPosition,
        data: {
          label: (
            <Box 
              sx={{ 
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 }
              }}
              onClick={(e) => {
                e.stopPropagation();
                setExpandedMappings(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(mappingNodeId)) {
                    newSet.delete(mappingNodeId);
                  } else {
                    newSet.add(mappingNodeId);
                  }
                  return newSet;
                });
              }}
            >
              {!isExpanded ? (
                <>
                  <Typography variant="caption" fontWeight="bold" display="block" sx={{ color: '#1976d2' }}>
                    {gEdge.relationshipName}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem' }}>
                    {sourcePK} → {targetPK}
                  </Typography>
                </>
              ) : (
                <Box sx={{ minWidth: 250 }}>
                  <Typography variant="caption" fontWeight="bold" display="block" sx={{ color: '#1976d2', mb: 1 }}>
                    Mapping Details {isExpanded ? '▲' : '▼'}
                  </Typography>
                  <Table size="small" sx={{ '& td': { fontSize: '0.7rem', py: 0.5, px: 1, border: '1px solid #1976d2' } }}>
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Source Type:</TableCell>
                        <TableCell>{sourceNode.displayName}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Source PK:</TableCell>
                        <TableCell>{sourceNode.displayName}.{'{'}id{'}'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Target Type:</TableCell>
                        <TableCell>{targetNode.displayName}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Target PK:</TableCell>
                        <TableCell>{targetNode.displayName}.{'{'}id{'}'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Relationship:</TableCell>
                        <TableCell>{gEdge.relationshipName}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Cardinality:</TableCell>
                        <TableCell>
                          <Box 
                            sx={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              cursor: 'pointer',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRelationshipRule(gEdge.id);
                            }}
                          >
                            1 : {gEdge.cardinality || 'N'}
                          </Box>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          ),
        },
        style: {
          background: '#e3f2fd',
          border: '1px solid #1976d2',
          borderRadius: 4,
          padding: 8,
          minWidth: isExpanded ? 270 : 120,
          fontSize: '0.75rem',
        },
        draggable: true,
      });
      
      // Create edge from source to mapping
      flowEdges.push({
        id: `${gEdge.id}-to-mapping`,
        source: gEdge.source,
        target: mappingNodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#1976d2', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });
      
      // Create edge from mapping to target
      flowEdges.push({
        id: `${gEdge.id}-from-mapping`,
        source: mappingNodeId,
        target: gEdge.target,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#1976d2', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });
    });

    setNodes([...flowNodes, ...mappingNodes]);
    setEdges(flowEdges);
  }, [graphNodes, graphEdges, rootEntity, expandedMappings, selectedNode, enabledFields, allFieldRules]);

  // Handle node click
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const graphNode = graphNodes.find(n => n.id === node.id);
    if (graphNode) {
      setSelectedNode(graphNode);
    }
  }, [graphNodes]);

  // Get available relationships for selected node
  const getAvailableRelationships = (node: GraphNode, direction: 'inbound' | 'outbound') => {
    if (direction === 'outbound') {
      if (!node.structure?.relationships) return [];
      
      return node.structure.relationships.map((rel: any) => {
        const targetId = rel.target || rel.targetEntityId || '';
        const targetEntity = entities?.find(e => e.id === targetId);
        
        return {
          name: rel.name,
          displayName: rel.displayName || rel.name,
          targetEntityName: targetEntity?.name || '',
          targetEntityDisplayName: targetEntity?.displayName || targetEntity?.name || '',
          targetId,
          direction: 'outbound',
        };
      }).filter((rel: any) => rel.targetEntityName);
    } else {
      // Inbound relationships are loaded asynchronously
      return inboundRelationships;
    }
  };

  // Load inbound relationships asynchronously
  const loadInboundRelationships = async (node: GraphNode) => {
    if (!node.structure?.id) return;
    
    setLoadingInboundRels(true);
    const inboundRels: any[] = [];
    
    try {
      // Check all entities in the system
      for (const entity of entities || []) {
        // Skip the selected node itself
        if (entity.name === node.entityName) continue;
        
        // Get or fetch entity structure
        let entityStructure = entityStructureCache[entity.name];
        
        if (!entityStructure) {
          // Check if already in graph
          const graphNode = graphNodes.find(n => n.entityName === entity.name);
          if (graphNode?.structure) {
            entityStructure = graphNode.structure;
          } else {
            // Fetch structure
            entityStructure = await fetchEntityStructure(entity.name);
          }
          
          // Cache it
          if (entityStructure) {
            setEntityStructureCache(prev => ({ ...prev, [entity.name]: entityStructure }));
          }
        }
        
        // Check if this entity has relationships pointing to our selected node
        if (entityStructure?.relationships) {
          entityStructure.relationships.forEach((rel: any) => {
            const targetId = rel.target || rel.targetEntityId || '';
            // Check if this relationship points to our selected node
            if (targetId === node.structure?.id) {
              inboundRels.push({
                name: rel.name,
                displayName: rel.displayName || rel.name,
                targetEntityName: entity.name,
                targetEntityDisplayName: entity.displayName || entity.name,
                targetId: entity.id,
                direction: 'inbound',
                sourceEntityName: entity.name,
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading inbound relationships:', error);
    }
    
    setInboundRelationships(inboundRels);
    setLoadingInboundRels(false);
  };

  // Handle add relationship
  const handleAddRelationship = (direction: 'inbound' | 'outbound') => {
    if (!selectedNode) return;
    setRelationshipDirection(direction);
    // For now, we'll show a simple dialog; could be enhanced with relationship selection
  };

  const handleGenerate = async () => {
    if (!rootEntity) {
      alert('Please select a root entity');
      return;
    }

    // Build list of related entities from graph - include ALL entities
    const relatedEntities = graphNodes
      .filter(n => n.entityName !== rootEntity)
      .map(n => n.entityName);

    console.log('Graph nodes:', graphNodes.map(n => ({ id: n.id, name: n.entityName, display: n.displayName })));
    console.log('Root entity:', rootEntity);
    console.log('Related entities:', relatedEntities);

    // Build excluded fields based on checkbox state
    const excludedFields: string[] = [];
    graphNodes.forEach(node => {
      node.structure?.attributes?.forEach((attr: any) => {
        const fieldKey = `${node.entityName}.${attr.name}`;
        // Exclude field if checkbox is unchecked (enabledFields[fieldKey] === false)
        if (enabledFields[fieldKey] === false) {
          excludedFields.push(fieldKey);
        }
      });
    });

    // Build entity-specific instance counts
    const entityInstanceCounts: Record<string, number> = {};
    graphNodes.forEach(node => {
      if (node.instanceCount !== undefined) {
        entityInstanceCounts[node.entityName] = node.instanceCount;
      }
    });

    // Build relationship cardinalities
    const relationshipCardinalities = graphEdges
      .filter(edge => edge.cardinality !== undefined)
      .map(edge => {
        const sourceNode = graphNodes.find(n => n.id === edge.source);
        const targetNode = graphNodes.find(n => n.id === edge.target);
        return {
          sourceEntity: sourceNode?.entityName || '',
          targetEntity: targetNode?.entityName || '',
          relationshipName: edge.relationshipType, // Use relationshipType (ID) instead of relationshipName (display)
          cardinality: edge.cardinality!,
        };
      })
      .filter(rel => rel.sourceEntity && rel.targetEntity);

    console.log('Entity instance counts:', entityInstanceCounts);
    console.log('Relationship cardinalities:', relationshipCardinalities);

    const request: DataGenerationRequest = {
      rootEntityName: rootEntity,
      includedRelatedEntities: relatedEntities,
      instanceCount,
      seed,
      maxDepth,
      primaryKeyRules: allPKRules || [],
      fieldRules: allFieldRules || [],
      excludedFields,
      entityInstanceCounts,
      relationshipCardinalities,
    };

    try {
      const result = await generateData.mutateAsync(request);
      setGeneratedData(result.data);
    } catch (error) {
      console.error('Failed to generate data:', error);
    }
  };

  const toggleFieldEnabled = (entityName: string, fieldName: string) => {
    const key = `${entityName}.${fieldName}`;
    setEnabledFields(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>
        Graph-Based Data Generation
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Build entity relationship graphs visually and generate test data.
      </Typography>

      {/* Configuration Panel */}
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
            <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Autocomplete
                size="small"
                sx={{ minWidth: 200 }}
                options={entities || []}
                getOptionLabel={(option) => option.displayName || option.name}
                value={entities?.find(e => e.name === rootEntity) || null}
                onChange={(_, value) => {
                  if (value) {
                    setRootEntity(value.name);
                    // Add to graph if not already there
                    if (!graphNodes.find(n => n.entityName === value.name)) {
                      addEntityToGraph(value.name);
                    }
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Root Entity"
                    placeholder="Select root..."
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />

              <TextField
                size="small"
                label="Instance Count"
                type="number"
                value={instanceCount}
                onChange={(e) => setInstanceCount(parseInt(e.target.value) || 10)}
                sx={{ width: 140 }}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                size="small"
                label="Random Seed"
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value) || 42)}
                sx={{ width: 130 }}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                size="small"
                label="Max Depth"
                type="number"
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value) || 2)}
                sx={{ width: 110 }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<GenerateIcon />}
                onClick={handleGenerate}
                disabled={!rootEntity || generateData.isPending}
              >
                Generate Data
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={async () => {
                  if (!rootEntity) return;
                  
                  // Build list of related entities - include ALL entities
                  const relatedEntities = graphNodes
                    .filter(n => n.entityName !== rootEntity)
                    .map(n => n.entityName);
                  
                  // Build excluded fields based on checkbox state
                  const excludedFields: string[] = [];
                  graphNodes.forEach(node => {
                    node.structure?.attributes?.forEach((attr: any) => {
                      const fieldKey = `${node.entityName}.${attr.name}`;
                      // Exclude field if checkbox is unchecked
                      if (enabledFields[fieldKey] === false) {
                        excludedFields.push(fieldKey);
                      }
                    });
                  });
                  
                  // Build entity-specific instance counts
                  const entityInstanceCounts: Record<string, number> = {};
                  graphNodes.forEach(node => {
                    if (node.instanceCount !== undefined) {
                      entityInstanceCounts[node.entityName] = node.instanceCount;
                    }
                  });

                  // Build relationship cardinalities
                  const relationshipCardinalities = graphEdges
                    .filter(edge => edge.cardinality !== undefined)
                    .map(edge => {
                      const sourceNode = graphNodes.find(n => n.id === edge.source);
                      const targetNode = graphNodes.find(n => n.id === edge.target);
                      return {
                        sourceEntity: sourceNode?.entityName || '',
                        targetEntity: targetNode?.entityName || '',
                        relationshipName: edge.relationshipName,
                        cardinality: edge.cardinality!,
                      };
                    })
                    .filter(rel => rel.sourceEntity && rel.targetEntity);
                  
                  const request: DataGenerationRequest = {
                    rootEntityName: rootEntity,
                    includedRelatedEntities: relatedEntities,
                    instanceCount,
                    seed,
                    maxDepth,
                    primaryKeyRules: allPKRules || [],
                    fieldRules: allFieldRules || [],
                    excludedFields,
                    entityInstanceCounts,
                    relationshipCardinalities,
                  };
                  
                  try {
                    await downloadData.mutateAsync(request);
                  } catch (error) {
                    console.error('Failed to download data:', error);
                  }
                }}
                disabled={!rootEntity || downloadData.isPending}
              >
                Download
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<SaveIcon />}
                onClick={() => setSaveDialogOpen(true)}
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
          </Box>
        )}
      </Paper>

      {/* Field Configuration - Displayed Above Graph */}
      {selectedNode && selectedNode.structure?.attributes && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                {selectedNode.displayName} - Field Configuration
              </Typography>
              {selectedNode.entityName === rootEntity && (
                <Chip label="Root Entity" color="primary" size="small" />
              )}
            </Box>
            <Button
              size="small"
              onClick={() => setSelectedNode(null)}
            >
              ✕
            </Button>
          </Box>
          
          <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Field Name</TableCell>
                  {selectedNode.structure.attributes.map((attr: any) => (
                    <TableCell 
                      key={attr.name} 
                      align="center" 
                      sx={{ 
                        minWidth: 120,
                        cursor: 'pointer',
                        bgcolor: attr.isRequired ? 'grey.100' : 'transparent',
                        '&:hover': { bgcolor: 'grey.200' },
                      }}
                      onClick={() => {
                        setSelectedField({ entityName: selectedNode.entityName, fieldName: attr.name });
                        setFieldRuleDialogOpen(true);
                      }}
                    >
                      <Typography variant="caption" fontWeight={attr.isPrimaryKey ? 'bold' : 'normal'}>
                        {attr.name} {attr.isPrimaryKey ? '🔑' : ''}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  {selectedNode.structure.attributes.map((attr: any) => (
                    <TableCell key={attr.name} align="center">
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                        {attr.schema}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Generate</TableCell>
                  {selectedNode.structure.attributes.map((attr: any) => {
                    const fieldKey = `${selectedNode.entityName}.${attr.name}`;
                    const isEnabled = attr.isRequired || enabledFields[fieldKey];
                    return (
                      <TableCell key={attr.name} align="center">
                        {!attr.isRequired ? (
                          <Checkbox
                            size="small"
                            checked={isEnabled}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleFieldEnabled(selectedNode.entityName, attr.name);
                            }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">Required</Typography>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Rule</TableCell>
                  {selectedNode.structure.attributes.map((attr: any) => {
                    const fieldRule = allFieldRules?.find(
                      r => r.entityName === selectedNode.entityName && r.fieldName === attr.name
                    );
                    return (
                      <TableCell key={attr.name} align="center">
                        {fieldRule ? (
                          <Chip
                            label={fieldRule.ruleType}
                            size="small"
                            color="success"
                            onDelete={(e) => {
                              e.stopPropagation();
                              deleteFieldRule.mutate({
                                entityName: selectedNode.entityName,
                                fieldName: attr.name
                              });
                            }}
                            sx={{ fontSize: '0.65rem' }}
                          />
                        ) : (
                          <Chip label="Auto" size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', gap: 1.5, overflow: 'hidden' }}>
        {/* Left Sidebar - Entity List */}
        <Paper sx={{ width: 250, p: 2, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Available Entities
          </Typography>
          <Autocomplete
            size="small"
            options={entities || []}
            getOptionLabel={(option) => option.displayName || option.name}
            onChange={(_, value) => {
              if (value) addEntityToGraph(value.name);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Add Entity"
                placeholder="Search..."
                InputLabelProps={{ shrink: true }}
              />
            )}
          />
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            Entities in Graph ({graphNodes.length})
          </Typography>
          <List dense>
            {graphNodes.map(node => (
              <ListItem
                key={node.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => removeEntityFromGraph(node.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton
                  selected={selectedNode?.id === node.id}
                  onClick={() => setSelectedNode(node)}
                >
                  <ListItemText
                    primary={node.displayName}
                    secondary={node.entityName === rootEntity ? 'Root' : ''}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          {generatedData && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="subtitle2" gutterBottom color="success.main">
                ✓ Generated Files ({Object.keys(generatedData.generatedData).length + (generatedData.mappingFile?.mappings?.length > 0 ? new Set(generatedData.mappingFile.mappings.map(m => `${m.sourceType}_to_${m.targetType}`)).size : 0)})
              </Typography>
              <List dense>
                {Object.entries(generatedData.generatedData).map(([entityName, records]) => (
                  <ListItem key={entityName} sx={{ py: 0 }}>
                    <ListItemText
                      primary={`${entityName}.csv`}
                      secondary={`${records.length} records`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
                {generatedData.mappingFile?.mappings && Array.from(
                  new Set(generatedData.mappingFile.mappings.map(m => `${m.sourceType}_to_${m.targetType}`))
                ).map(fileName => {
                  const count = generatedData.mappingFile.mappings.filter(
                    m => `${m.sourceType}_to_${m.targetType}` === fileName
                  ).length;
                  return (
                    <ListItem key={fileName} sx={{ py: 0 }}>
                      <ListItemText
                        primary={`${fileName}_mapping.csv`}
                        secondary={`${count} mappings`}
                        primaryTypographyProps={{ variant: 'body2', color: 'primary.main' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </Paper>

        {/* Center - Graph Canvas */}
        <Paper sx={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
          >
            <Background />
            <Controls />
            <Panel position="top-right">
              <Paper sx={{ p: 1 }}>
                <Typography variant="caption" display="block">
                  Nodes: {graphNodes.length}
                </Typography>
                <Typography variant="caption" display="block">
                  Edges: {graphEdges.length}
                </Typography>
              </Paper>
            </Panel>
          </ReactFlow>
        </Paper>
      </Box>

      {/* Relationship Menu */}
      {selectedNode && (
        <Menu
          anchorEl={addRelationshipMenuAnchor}
          open={Boolean(addRelationshipMenuAnchor)}
          onClose={() => setAddRelationshipMenuAnchor(null)}
        >
          <MenuItem disabled>
            <Typography variant="caption" fontWeight="bold">
              Outbound Relationships
            </Typography>
          </MenuItem>
          {getAvailableRelationships(selectedNode, 'outbound').map((rel: any) => (
            <MenuItem
              key={rel.name}
              onClick={() => {
                addRelationship(
                  selectedNode.id,
                  rel.targetEntityName,
                  rel.displayName,
                  rel.name,
                  true
                );
                setAddRelationshipMenuAnchor(null);
              }}
            >
              <Box>
                <Typography variant="body2">{rel.displayName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  → {rel.targetEntityDisplayName}
                </Typography>
              </Box>
            </MenuItem>
          ))}
          {getAvailableRelationships(selectedNode, 'outbound').length === 0 && (
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                No outbound relationships
              </Typography>
            </MenuItem>
          )}
          
          <Divider sx={{ my: 1 }} />
          
          <MenuItem disabled>
            <Typography variant="caption" fontWeight="bold">
              Inbound Relationships {loadingInboundRels && '(Loading...)'}
            </Typography>
          </MenuItem>
          {loadingInboundRels ? (
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                Searching all entities...
              </Typography>
            </MenuItem>
          ) : (
            <>
              {getAvailableRelationships(selectedNode, 'inbound').map((rel: any) => (
            <MenuItem
              key={`${rel.sourceEntityName}-${rel.name}`}
              onClick={() => {
                addRelationship(
                  selectedNode.id,
                  rel.targetEntityName,
                  rel.displayName,
                  rel.name,
                  false
                );
                setAddRelationshipMenuAnchor(null);
              }}
            >
              <Box>
                <Typography variant="body2">{rel.displayName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  ← {rel.targetEntityDisplayName}
                </Typography>
              </Box>
            </MenuItem>
          ))}
          {!loadingInboundRels && getAvailableRelationships(selectedNode, 'inbound').length === 0 && (
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                No inbound relationships
              </Typography>
            </MenuItem>
          )}
            </>
          )}
        </Menu>
      )}

      {/* Field Rule Editor Dialog */}
      {fieldRuleDialogOpen && selectedField && (
        <FieldRuleEditor
          entityName={selectedField.entityName}
          fieldName={selectedField.fieldName}
          onClose={() => {
            setFieldRuleDialogOpen(false);
            setSelectedField(null);
          }}
        />
      )}

      {/* Entity Instance Count Dialog */}
      <Dialog 
        open={editingEntityRule !== null} 
        onClose={() => setEditingEntityRule(null)} 
        maxWidth="xs" 
        fullWidth
      >
        <DialogTitle>Set Instance Count</DialogTitle>
        <DialogContent>
          {editingEntityRule && (() => {
            const node = graphNodes.find(n => n.id === editingEntityRule);
            const inboundEdgeWithCardinality = graphEdges.find(e => 
              e.target === node?.id && e.cardinality !== undefined
            );
            const isCardinalityControlled = !!inboundEdgeWithCardinality;
            const sourceNode = inboundEdgeWithCardinality 
              ? graphNodes.find(n => n.id === inboundEdgeWithCardinality.source)
              : null;
            
            return (
              <Box sx={{ pt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Entity: <strong>{node?.displayName}</strong>
                </Typography>
                
                {isCardinalityControlled && (
                  <Alert severity="info" sx={{ my: 2 }}>
                    This entity's record count is controlled by relationship cardinality with <strong>{sourceNode?.displayName}</strong>.
                    The number of records will be: <strong>{inboundEdgeWithCardinality.cardinality} × {sourceNode?.instanceCount || 'N'}</strong>
                  </Alert>
                )}
                
                <TextField
                  fullWidth
                  label="Number of Records"
                  type="number"
                  defaultValue={node?.instanceCount || ''}
                  placeholder="Auto (uses global setting)"
                  margin="normal"
                  inputProps={{ min: 1 }}
                  disabled={isCardinalityControlled}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || undefined;
                    setGraphNodes(prev => prev.map(n => 
                      n.id === editingEntityRule 
                        ? { ...n, instanceCount: value }
                        : n
                    ));
                  }}
                  helperText={isCardinalityControlled 
                    ? "Disabled - Record count controlled by relationship cardinality" 
                    : "Leave empty to use global instance count setting"}
                />
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingEntityRule(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Relationship Cardinality Dialog */}
      <Dialog 
        open={editingRelationshipRule !== null} 
        onClose={() => setEditingRelationshipRule(null)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Set Relationship Cardinality</DialogTitle>
        <DialogContent>
          {editingRelationshipRule && (() => {
            const edge = graphEdges.find(e => e.id === editingRelationshipRule);
            const sourceNode = graphNodes.find(n => n.id === edge?.source);
            const targetNode = graphNodes.find(n => n.id === edge?.target);
            
            // Get target entity's primary key field
            const targetPKField = targetNode?.structure?.attributes?.find((attr: any) => attr.isPrimaryKey)?.name;
            
            // Check if ID composition rule already exists
            const existingRule = targetPKField && allFieldRules?.find(rule => 
              rule.entityName === targetNode?.entityName && 
              rule.fieldName === targetPKField &&
              rule.ruleType === RuleType.PrefixSequence
            );
            
            const hasIdCompositionRule = !!existingRule;
            
            return (
              <Box sx={{ pt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Relationship: <strong>{edge?.relationshipName}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  {sourceNode?.displayName} → {targetNode?.displayName}
                </Typography>
                <TextField
                  fullWidth
                  label="Cardinality (N in 1:N)"
                  type="number"
                  defaultValue={edge?.cardinality || ''}
                  placeholder="N (random)"
                  margin="normal"
                  inputProps={{ min: 1 }}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || undefined;
                    setGraphEdges(prev => prev.map(ed => 
                      ed.id === editingRelationshipRule 
                        ? { ...ed, cardinality: value }
                        : ed
                    ));
                  }}
                  helperText="Number of target records to create for each source record. Leave empty for random."
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={hasIdCompositionRule || edge?.composeId !== false}
                      onChange={async (e) => {
                        const isChecked = e.target.checked;
                        
                        if (!targetNode || !sourceNode || !targetPKField) {
                          alert('Cannot set ID composition: missing entity information');
                          return;
                        }
                        
                        if (isChecked) {
                          // Create a PrefixSequence field rule for the target entity's PK
                          // Format will be: ParentID-001, ParentID-002, etc.
                          try {
                            await defineFieldRule.mutateAsync({
                              entityName: targetNode.entityName,
                              fieldName: targetPKField,
                              ruleType: RuleType.PrefixSequence,
                              parameters: {
                                prefix: `{${sourceNode.entityName}.id}-`,
                                start: 1,
                                end: 999,
                                padding: 3,
                              }
                            });
                            
                            // Update edge to track composition
                            setGraphEdges(prev => prev.map(ed => 
                              ed.id === editingRelationshipRule 
                                ? { ...ed, composeId: true }
                                : ed
                            ));
                          } catch (error) {
                            console.error('Failed to create ID composition rule:', error);
                            alert('Failed to create ID composition rule');
                          }
                        } else {
                          // Delete the composition field rule
                          try {
                            await deleteFieldRule.mutateAsync({
                              entityName: targetNode.entityName,
                              fieldName: targetPKField
                            });
                            
                            // Update edge to track composition
                            setGraphEdges(prev => prev.map(ed => 
                              ed.id === editingRelationshipRule 
                                ? { ...ed, composeId: false }
                                : ed
                            ));
                          } catch (error) {
                            console.error('Failed to delete ID composition rule:', error);
                          }
                        }
                      }}
                    />
                  }
                  label={`Include ${sourceNode?.displayName} ID in ${targetNode?.displayName} ID`}
                />
                {targetPKField && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, ml: 4 }}>
                    This will create a PrefixSequence field rule for <strong>{targetNode?.displayName}.{targetPKField}</strong> with format: {sourceNode?.displayName}.id-001, {sourceNode?.displayName}.id-002, etc.
                  </Typography>
                )}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingRelationshipRule(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Save Scenario Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Scenario</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Scenario Name"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            value={scenarioDescription}
            onChange={(e) => setScenarioDescription(e.target.value)}
            margin="normal"
            multiline
            rows={3}
          />
          {scenarios && scenarios.length > 0 && (
            <TextField
              fullWidth
              select
              label="Overwrite Existing Scenario (Optional)"
              value={selectedScenarioId || ''}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedScenarioId(id || null);
                if (id) {
                  const scenario = scenarios.find(s => s.id === id);
                  if (scenario) {
                    setScenarioName(scenario.name);
                    // Don't overwrite description as user might want to update it
                  }
                }
              }}
              margin="normal"
              helperText="Select to overwrite an existing scenario, or leave empty to create new"
            >
              <MenuItem value="">
                <em>Create New Scenario</em>
              </MenuItem>
              {scenarios.map((s: any) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!scenarioName || !rootEntity) return;

              const relatedEntities = graphNodes
                .filter(n => n.entityName !== rootEntity)
                .map(n => n.entityName);

              // Encode graph metadata (edges and positions) in description
              const graphMetadata = {
                rootEntity: rootEntity,
                edges: graphEdges.map(e => ({
                  source: graphNodes.find(n => n.id === e.source)?.entityName,
                  target: graphNodes.find(n => n.id === e.target)?.entityName,
                  relationshipName: e.relationshipName,
                  relationshipType: e.relationshipType,
                  sourceToTarget: e.sourceToTarget,
                  cardinality: e.cardinality,
                  composeId: e.composeId,
                })),
                positions: graphNodes.map(n => ({
                  entityName: n.entityName,
                  x: n.position.x,
                  y: n.position.y,
                })),
                entityRules: graphNodes.map(n => ({
                  entityName: n.entityName,
                  instanceCount: n.instanceCount,
                })),
                userDescription: scenarioDescription,
              };
              
              const encodedDescription = JSON.stringify(graphMetadata);

              const scenario: DataGenerationScenario = {
                name: scenarioName,
                description: encodedDescription,
                rootEntityName: rootEntity,
                includedRelatedEntities: relatedEntities,
                instanceCount,
                seed,
                maxDepth,
                primaryKeyRules: (allPKRules || []).map(rule => ({
                  entityName: rule.entityName,
                  attributeName: rule.fieldNames.join(','),
                  ruleType: 'Composite',
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

              // Add ID if overwriting existing scenario
              if (selectedScenarioId) {
                (scenario as any).id = selectedScenarioId;
              }

              try {
                await saveScenario.mutateAsync(scenario);
                setSaveDialogOpen(false);
                setScenarioName('');
                setScenarioDescription('');
                setSelectedScenarioId(null);
              } catch (error) {
                console.error('Failed to save scenario:', error);
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Scenario Dialog */}
      <Dialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Load Scenario</DialogTitle>
        <DialogContent>
          <List>
            {scenarios?.map((scenario: DataGenerationScenario) => (
              <ListItem
                key={scenario.name}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => deleteScenario.mutate(scenario.name)}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemButton
                  onClick={async () => {
                    // Parse graph metadata from description
                    let graphMetadata: any = null;
                    try {
                      graphMetadata = JSON.parse(scenario.description || '{}');
                    } catch {
                      // Old format without metadata
                    }
                    
                    // Get root entity from metadata or scenario
                    const rootEntityName = graphMetadata?.rootEntity || scenario.rootEntityName;
                    
                    // Set configuration but NOT root entity yet
                    setInstanceCount(scenario.instanceCount);
                    setSeed(scenario.seed);
                    setMaxDepth(scenario.maxDepth);
                    
                    // Load entities into graph
                    setGraphNodes([]);
                    setGraphEdges([]);
                    
                    // Add root entity first
                    await addEntityToGraph(rootEntityName);
                    
                    // Add related entities by entityName
                    for (const entityName of scenario.includedRelatedEntities) {
                      // Try to find entity by name first, then by display name
                      const entity = entities?.find(e => 
                        e.name === entityName || (e.displayName || e.name) === entityName
                      );
                      if (entity) {
                        await addEntityToGraph(entity.name);
                      }
                    }
                    
                    // Wait for state to update completely
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // NOW set the root entity after all entities are loaded
                    setRootEntity(rootEntityName);
                    
                    // Restore edges, entity rules, and positions if metadata exists
                    if (graphMetadata?.edges || graphMetadata?.entityRules || graphMetadata?.positions) {
                      setGraphNodes(currentNodes => {
                        let updatedNodes = currentNodes;
                        
                        // Restore positions first
                        if (graphMetadata?.positions) {
                          updatedNodes = updatedNodes.map(node => {
                            const posData = graphMetadata.positions.find(
                              (p: any) => p.entityName === node.entityName
                            );
                            if (posData) {
                              return { ...node, position: { x: posData.x, y: posData.y } };
                            }
                            return node;
                          });
                        }
                        
                        // Restore entity rules
                        if (graphMetadata?.entityRules) {
                          updatedNodes = updatedNodes.map(node => {
                            const rule = graphMetadata.entityRules.find((r: any) => r.entityName === node.entityName);
                            return rule ? { ...node, instanceCount: rule.instanceCount } : node;
                          });
                        }
                        
                        return updatedNodes;
                      });
                      
                      // Restore edges using the current nodes
                      if (graphMetadata?.edges) {
                        setGraphNodes(currentNodes => {
                          const newEdges: GraphEdge[] = [];
                          
                          graphMetadata.edges.forEach((edgeData: any) => {
                            // Find the actual node IDs from current graph
                            const sourceNode = currentNodes.find(n => n.entityName === edgeData.source);
                            const targetNode = currentNodes.find(n => n.entityName === edgeData.target);
                            
                            if (sourceNode && targetNode) {
                              newEdges.push({
                                id: `edge-${Date.now()}-${Math.random()}`,
                                source: sourceNode.id,
                                target: targetNode.id,
                                relationshipName: edgeData.relationshipName,
                                relationshipType: edgeData.relationshipType,
                                sourceToTarget: edgeData.sourceToTarget,
                                cardinality: edgeData.cardinality,
                                composeId: edgeData.composeId,
                              });
                            }
                          });
                          
                          setGraphEdges(newEdges);
                          return currentNodes;
                        });
                      }
                    }
                    
                    setLoadDialogOpen(false);
                  }}
                >
                  <ListItemText
                    primary={scenario.name}
                    secondary={
                      (() => {
                        try {
                          const metadata = JSON.parse(scenario.description || '{}');
                          return metadata.userDescription || `Root: ${scenario.rootEntityName}`;
                        } catch {
                          return scenario.description || `Root: ${scenario.rootEntityName}`;
                        }
                      })()
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GraphDataGeneration;
