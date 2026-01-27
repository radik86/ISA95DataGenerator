import React, { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEntityGraph, useEntities } from '../api/hooks';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import { CallMade as OutboundIcon, CallReceived as InboundIcon } from '@mui/icons-material';
import { EntityDefinition, Cardinality } from '../types';
import EntityNode, { EntityNodeData } from './EntityNode';

interface EntityGraphProps {
  entityName: string;
  maxDepth?: number;
}

const nodeTypes: NodeTypes = {
  entityNode: EntityNode as any,
};

const getLayoutedNodes = (entities: Record<string, EntityDefinition>, rootEntity: string) => {
  console.log('getLayoutedNodes called with:', { entities, rootEntity, entityKeys: Object.keys(entities) });
  
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  if (!entities || Object.keys(entities).length === 0) {
    console.warn('No entities provided to getLayoutedNodes');
    return { nodes, edges };
  }
  
  // Create a map from entity ID to entity name for quick lookup
  const idToName = new Map<string, string>();
  Object.values(entities).forEach(entity => {
    if (entity.id) {
      idToName.set(entity.id, entity.name);
    }
  });
  
  const entityNames = Object.keys(entities);
  const rootIndex = entityNames.indexOf(rootEntity);
  
  if (rootIndex === -1) {
    console.warn(`Root entity ${rootEntity} not found in entities`);
    return { nodes, edges };
  }
  
  const rootEntityData = entities[rootEntity];
  const rootEntityId = rootEntityData.id;
  
  // Build connection graph to count relationships between non-root nodes
  const connectionCount = new Map<string, Map<string, number>>();
  entityNames.forEach(name => {
    const entity = entities[name];
    entity.relationships?.forEach(rel => {
      const targetId = rel.targetEntityId || rel.TargetEntityId;
      if (targetId) {
        const targetName = idToName.get(targetId);
        if (targetName && entities[targetName]) {
          if (!connectionCount.has(name)) {
            connectionCount.set(name, new Map());
          }
          connectionCount.get(name)!.set(targetName, (connectionCount.get(name)!.get(targetName) || 0) + 1);
        }
      }
    });
  });
  
  // Separate nodes into root and others
  const otherEntities = entityNames.filter(name => name !== rootEntity);
  
  // Sort other entities by their connection count to each other
  const sortedOthers = otherEntities.sort((a, b) => {
    const aConnections = connectionCount.get(a);
    const bConnections = connectionCount.get(b);
    const aCount = aConnections ? Array.from(aConnections.values()).reduce((sum, val) => sum + val, 0) : 0;
    const bCount = bConnections ? Array.from(bConnections.values()).reduce((sum, val) => sum + val, 0) : 0;
    return bCount - aCount; // Sort by connection count descending
  });
  
  // Position root node at center
  nodes.push({
    id: rootEntityData.id,
    type: 'entityNode',
    position: { x: 800, y: 400 },
    data: { 
      entity: rootEntityData,
      isRoot: true,
    },
  });
  
  // Position other nodes in a circle around root
  const radius = 450;
  sortedOthers.forEach((name, index) => {
    const entity = entities[name];
    
    if (!entity) {
      console.warn(`Entity ${name} not found in entities object`);
      return;
    }
    
    const angle = (index * 2 * Math.PI) / sortedOthers.length;
    const x = 800 + radius * Math.cos(angle);
    const y = 400 + radius * Math.sin(angle);
    
    nodes.push({
      id: entity.id,
      type: 'entityNode',
      position: { x, y },
      data: { 
        entity,
        isRoot: false,
      },
    });
  });
  
  // Create edges for all entities
  entityNames.forEach(name => {
    const entity = entities[name];
    const isRoot = name === rootEntity;
    
    console.log(`[EntityGraph] Processing entity ${name}, relationships:`, entity.relationships?.length || 0);
    
    entity.relationships?.forEach((rel) => {
      console.log(`[EntityGraph] - Relationship ${rel.name}:`, rel);
      const targetId = rel.targetEntityId || rel.TargetEntityId;
      if (!targetId) {
        console.warn(`No target ID found for relationship ${rel.name} from ${entity.name}`);
        return;
      }
      
      // Look up target entity name by ID
      const targetName = idToName.get(targetId);
      
      // For self-recursive relationships, targetName will equal entity.name
      const isSelfRecursive = targetId === entity.id;
      
      if (!isSelfRecursive && (!targetName || !entities[targetName])) {
        console.warn(`Target entity with ID ${targetId} not found in graph for relationship ${rel.name} from ${entity.name}`);
        return;
      }
      
      const targetEntity = isSelfRecursive ? entity : entities[targetName];
      const edgeId = `${entity.id}-${rel.name}-${targetEntity.id}`;
      
      console.log(`Processing relationship: ${entity.name} -> ${targetEntity.name}, isSelfRecursive: ${isSelfRecursive}`);
      
      // Determine if this is an inbound or outbound relationship relative to root
      const isOutboundFromRoot = entity.id === rootEntityId;
      const isInboundToRoot = targetEntity.id === rootEntityId;
      
      // Determine edge label based on cardinality
      let cardinalityLabel = '';
      const cardinalityStr = String(rel.cardinality);
      if (cardinalityStr.includes('OneToOne')) {
        cardinalityLabel = '1:1';
      } else if (cardinalityStr.includes('OneToMany')) {
        cardinalityLabel = '1:N';
      } else if (cardinalityStr.includes('ManyToOne')) {
        cardinalityLabel = 'N:1';
      } else if (cardinalityStr.includes('ManyToMany')) {
        cardinalityLabel = 'N:M';
      }

      // Combine relationship name with cardinality
      const label = `${rel.displayName || rel.name} (${cardinalityLabel})`;
      
      // Choose color based on relationship direction relative to root
      let edgeColor = '#9e9e9e'; // Default gray for non-root relationships
      let strokeWidth = 1.5;
      let animated = false;
      
      if (isOutboundFromRoot) {
        edgeColor = '#4caf50'; // Green for outbound from root
        strokeWidth = 3;
        animated = true;
      } else if (isInboundToRoot) {
        edgeColor = '#9c27b0'; // Purple for inbound to root
        strokeWidth = 3;
        animated = true;
      }

      // Check if this is a self-recursive relationship - overrides other colors
      if (isSelfRecursive) {
        edgeColor = '#ff5722';
        strokeWidth = 4;
        animated = true;
      }
      
      edges.push({
        id: edgeId,
        source: entity.id,  // Use source entity ID
        target: targetEntity.id,  // Use target entity ID
        label,
        type: isSelfRecursive ? 'default' : 'smoothstep',
        animated: isSelfRecursive || animated,
        style: { 
          stroke: isSelfRecursive ? '#ff5722' : edgeColor,
          strokeWidth: isSelfRecursive ? 4 : strokeWidth,
          strokeDasharray: isSelfRecursive ? '5,5' : undefined,
        },
        labelStyle: {
          fill: '#333',
          fontWeight: 600,
          fontSize: 11,
        },
        labelBgStyle: {
          fill: '#fff',
          fillOpacity: 0.95,
        },
        markerEnd: {
          type: 'arrowclosed',
          color: isSelfRecursive ? '#ff5722' : edgeColor,
          width: isSelfRecursive ? 25 : 20,
          height: isSelfRecursive ? 25 : 20,
        },
        // Special positioning for self-loops
        sourceHandle: isSelfRecursive ? 'right' : undefined,
        targetHandle: isSelfRecursive ? 'left' : undefined,
      });
    });
  });

  return { nodes, edges };
};

const EntityGraph: React.FC<EntityGraphProps> = ({ entityName, maxDepth = 2 }) => {
  const { data: graphData, isLoading, error } = useEntityGraph(entityName, maxDepth);
  const { data: allEntities } = useEntities();
  
  // State for relationship management
  const [relationshipMenuAnchor, setRelationshipMenuAnchor] = useState<null | HTMLElement>(null);
  const [relationshipDialog, setRelationshipDialog] = useState<{ open: boolean; direction: 'inbound' | 'outbound' | null }>({ 
    open: false, 
    direction: null 
  });
  const [loadingInbound, setLoadingInbound] = useState(false);
  const [availableRelationships, setAvailableRelationships] = useState<any[]>([]);
  const [entityStructureCache, setEntityStructureCache] = useState<Record<string, any>>({});
  const [selectedEntityForRelationships, setSelectedEntityForRelationships] = useState<EntityDefinition | null>(null);

  // Fetch entity structure from API
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

  // Load inbound relationships - matches GraphDataGeneration logic
  const loadInboundRelationships = useCallback(async (entity: EntityDefinition) => {
    if (!graphData || !graphData[entity.name]) return;
    
    setLoadingInbound(true);
    const inboundRels: any[] = [];
    
    try {
      const rootEntityData = graphData[entity.name];
      const rootEntityId = rootEntityData.id;
      
      // Check all entities in the system (not just those in graphData)
      for (const otherEntity of allEntities || []) {
        // Skip the selected entity itself
        if (otherEntity.name === entity.name) continue;
        
        // Get or fetch entity structure
        let entityStructure = entityStructureCache[otherEntity.name];
        
        if (!entityStructure) {
          // Check if already in graphData
          if (graphData[otherEntity.name]) {
            entityStructure = graphData[otherEntity.name];
          } else {
            // Fetch structure from API
            entityStructure = await fetchEntityStructure(otherEntity.name);
          }
          
          // Cache it
          if (entityStructure) {
            setEntityStructureCache(prev => ({ ...prev, [otherEntity.name]: entityStructure }));
          }
        }
        
        // Check if this entity has relationships pointing to our selected entity
        if (entityStructure?.relationships) {
          entityStructure.relationships.forEach((rel: any) => {
            const targetId = rel.target || rel.targetEntityId || rel.TargetEntityId || '';
            // Check if this relationship points to our selected entity
            if (targetId === rootEntityId) {
              inboundRels.push({
                name: rel.name,
                displayName: rel.displayName || rel.name,
                sourceEntityName: otherEntity.name,
                sourceEntityDisplayName: otherEntity.displayName || otherEntity.name,
                targetEntityId: rootEntityId,
                targetEntityName: entity.name,
                direction: 'inbound',
                type: rel.type || 'Relationship',
              });
            }
          });
        }
      }
    } catch (err) {
      console.error('Error loading inbound relationships:', err);
    }
    
    setAvailableRelationships(inboundRels);
    setLoadingInbound(false);
  }, [graphData, allEntities, entityStructureCache]);

  // Handle add relationship button click
  const handleAddRelationship = useCallback((entity: EntityDefinition, anchorEl: HTMLElement) => {
    setSelectedEntityForRelationships(entity);
    loadInboundRelationships(entity);
    setRelationshipMenuAnchor(anchorEl);
  }, [loadInboundRelationships]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [] };
    try {
      const layout = getLayoutedNodes(graphData, entityName);
      // Add onAddRelationship callback to each node
      const nodesWithCallbacks = layout.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onAddRelationship: handleAddRelationship,
        },
      }));
      return { nodes: nodesWithCallbacks, edges: layout.edges };
    } catch (err) {
      console.error('Error creating graph layout:', err);
      return { nodes: [], edges: [] };
    }
  }, [graphData, entityName]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when data changes
  React.useEffect(() => {
    if (graphData) {
      const layout = getLayoutedNodes(graphData, entityName);
      const nodesWithCallbacks = layout.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onAddRelationship: handleAddRelationship,
        },
      }));
      setNodes(nodesWithCallbacks);
      setEdges(layout.edges);
    }
  }, [graphData, entityName, setNodes, setEdges, handleAddRelationship]);

  // Load outbound relationships
  const loadOutboundRelationships = useCallback(() => {
    if (!selectedEntityForRelationships || !graphData || !graphData[selectedEntityForRelationships.name]) return;
    
    const entity = graphData[selectedEntityForRelationships.name];
    const relationships = entity.relationships?.map((rel: any) => {
      const targetId = rel.targetEntityId || rel.TargetEntityId || rel.target;
      const targetEntity = allEntities?.find(e => e.id === targetId);
      
      return {
        name: rel.name,
        displayName: rel.displayName || rel.name,
        targetEntityId: targetId,
        targetEntityName: targetEntity?.name || '',
        targetEntityDisplayName: targetEntity?.displayName || targetEntity?.name || '',
        type: rel.type || 'Relationship',
      };
    }).filter((rel: any) => rel.targetEntityName) || [];
    
    setAvailableRelationships(relationships);
  }, [selectedEntityForRelationships, graphData, allEntities]);

  // Handle relationship menu
  const handleRelationshipMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setRelationshipMenuAnchor(event.currentTarget);
  };

  const handleRelationshipMenuClose = () => {
    setRelationshipMenuAnchor(null);
  };

  // Handle showing outbound relationships
  const handleShowOutbound = () => {
    handleRelationshipMenuClose();
    loadOutboundRelationships();
    setRelationshipDialog({ open: true, direction: 'outbound' });
  };

  // Handle showing inbound relationships
  const handleShowInbound = () => {
    handleRelationshipMenuClose();
    // Inbound relationships are already loading when menu opened
    setRelationshipDialog({ open: true, direction: 'inbound' });
  };

  // Handle relationship dialog close
  const handleRelationshipDialogClose = () => {
    setRelationshipDialog({ open: false, direction: null });
    setAvailableRelationships([]);
  };

  // Handle navigate to related entity
  const handleNavigateToEntity = (targetEntityName: string) => {
    handleRelationshipDialogClose();
    // Update the selected entity in the global store
    const store = (window as any).__entityBrowserStore;
    if (store?.setSelectedEntity) {
      store.setSelectedEntity(targetEntityName);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    console.error('EntityGraph error:', error);
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          Failed to load entity graph: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  if (!nodes || nodes.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">No graph data available for this entity</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      
      {/* Relationship Menu */}
      <Menu
        anchorEl={relationshipMenuAnchor}
        open={Boolean(relationshipMenuAnchor)}
        onClose={handleRelationshipMenuClose}
      >
        <MenuItem disabled>
          <Typography variant="caption" fontWeight="bold">
            Outbound Relationships
          </Typography>
        </MenuItem>
        <MenuItem onClick={handleShowOutbound}>
          <OutboundIcon sx={{ mr: 1 }} fontSize="small" />
          Show Outbound
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem disabled>
          <Typography variant="caption" fontWeight="bold">
            Inbound Relationships {loadingInbound && '(Loading...)'}
          </Typography>
        </MenuItem>
        <MenuItem onClick={handleShowInbound} disabled={loadingInbound}>
          <InboundIcon sx={{ mr: 1 }} fontSize="small" />
          Show Inbound
        </MenuItem>
      </Menu>
      
      {/* Relationship Dialog */}
      <Dialog
        open={relationshipDialog.open}
        onClose={handleRelationshipDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {relationshipDialog.direction === 'outbound' ? 'Outbound Relationships' : 'Inbound Relationships'}
          {relationshipDialog.direction === 'outbound' && selectedEntityForRelationships && (
            <Typography variant="caption" display="block" color="text.secondary">
              Relationships from {selectedEntityForRelationships.displayName || selectedEntityForRelationships.name} to other entities
            </Typography>
          )}
          {relationshipDialog.direction === 'inbound' && selectedEntityForRelationships && (
            <Typography variant="caption" display="block" color="text.secondary">
              Relationships from other entities to {selectedEntityForRelationships.displayName || selectedEntityForRelationships.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {loadingInbound && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={40} />
            </Box>
          )}
          
          {!loadingInbound && availableRelationships.length === 0 && (
            <Alert severity="info">
              No {relationshipDialog.direction} relationships available
            </Alert>
          )}
          
          {!loadingInbound && availableRelationships.length > 0 && (
            <List>
              {availableRelationships.map((rel, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <Divider />}
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => {
                        const targetEntity = relationshipDialog.direction === 'outbound' 
                          ? rel.targetEntityName 
                          : rel.sourceEntityName;
                        handleNavigateToEntity(targetEntity);
                      }}
                    >
                      <ListItemText
                        primary={rel.displayName || rel.name}
                        secondary={
                          <Box component="span">
                            <Typography variant="caption" component="span" display="block">
                              {relationshipDialog.direction === 'outbound' && (
                                <>
                                  <strong>To:</strong> {rel.targetEntityDisplayName || rel.targetEntityName}
                                </>
                              )}
                              {relationshipDialog.direction === 'inbound' && (
                                <>
                                  <strong>From:</strong> {rel.sourceEntityDisplayName || rel.sourceEntityName}
                                </>
                              )}
                            </Typography>
                            <Typography variant="caption" component="span" color="text.secondary">
                              Type: {rel.type}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRelationshipDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Legend */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          padding: 2,
          boxShadow: 2,
          zIndex: 5,
        }}
      >
        <Box sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>Legend</Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 3,
                backgroundColor: '#4caf50',
                borderRadius: 1,
              }}
            />
            <Box sx={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <OutboundIcon sx={{ fontSize: 14 }} />
              Outbound
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 3,
                backgroundColor: '#9c27b0',
                borderRadius: 1,
              }}
            />
            <Box sx={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <InboundIcon sx={{ fontSize: 14 }} />
              Inbound
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 3,
                backgroundColor: '#ff5722',
                borderRadius: 1,
                backgroundImage: 'repeating-linear-gradient(90deg, #ff5722, #ff5722 5px, transparent 5px, transparent 10px)',
              }}
            />
            <Box sx={{ fontSize: 12 }}>Self-recursive</Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 2,
                backgroundColor: '#9e9e9e',
                borderRadius: 1,
              }}
            />
            <Box sx={{ fontSize: 12 }}>Other</Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default EntityGraph;
