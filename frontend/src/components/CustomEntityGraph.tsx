import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Connection,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEntities } from '../api/hooks';
import { entitiesApi } from '../api/client';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Typography,
  ListItemIcon,
  ListItemText,
  Paper,
  Chip,
} from '@mui/material';
import { 
  Add as AddIcon,
  CallMade as OutboundIcon, 
  CallReceived as InboundIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { EntityDefinition } from '../types';
import EntityNode from './EntityNode';

interface CustomEntityGraphProps {
  entityNames: string[];
  onAddEntity: (entityName: string) => void;
}

const nodeTypes: NodeTypes = {
  entityNode: EntityNode as any,
};

const CustomEntityGraph: React.FC<CustomEntityGraphProps> = ({ entityNames, onAddEntity }) => {
  const { data: allEntities } = useEntities();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    nodeId: string;
    entityName: string;
  } | null>(null);
  const [loadedEntities, setLoadedEntities] = useState<Map<string, EntityDefinition>>(new Map());
  const [loading, setLoading] = useState(false);

  // Load full entity structures with relationships
  useEffect(() => {
    const loadEntityStructures = async () => {
      if (entityNames.length === 0) {
        setLoadedEntities(new Map());
        return;
      }

      setLoading(true);
      const newEntities = new Map(loadedEntities);
      
      try {
        // Load structures for entities we don't have yet
        const entitiesToLoad = entityNames.filter(name => !newEntities.has(name));
        
        if (entitiesToLoad.length > 0) {
          console.log('[CustomEntityGraph] Loading structures for:', entitiesToLoad);
          
          const results = await Promise.all(
            entitiesToLoad.map(async (name) => {
              try {
                const response = await entitiesApi.getStructure(name);
                return { name, data: response.data };
              } catch (error) {
                console.error(`[CustomEntityGraph] Failed to load ${name}:`, error);
                return null;
              }
            })
          );

          results.forEach(result => {
            if (result && result.data) {
              newEntities.set(result.name, result.data);
              console.log(`[CustomEntityGraph] Loaded ${result.name} with ${result.data.relationships?.length || 0} relationships`);
            }
          });

          setLoadedEntities(newEntities);
        }
      } catch (error) {
        console.error('[CustomEntityGraph] Error loading entities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEntityStructures();
  }, [entityNames]);

  // Create a map of entities (use loaded entities with full relationships)
  const entitiesMap = useMemo(() => {
    return loadedEntities;
  }, [loadedEntities]);

  // Create ID to name mapping
  const idToName = useMemo(() => {
    const map = new Map<string, string>();
    if (allEntities) {
      allEntities.forEach(entity => {
        if (entity.id) {
          map.set(entity.id, entity.name);
        }
      });
    }
    return map;
  }, [allEntities]);

  // Calculate layout and create nodes/edges
  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    if (entityNames.length === 0 || !entitiesMap.size) {
      return { layoutedNodes: nodes, layoutedEdges: edges };
    }

    // Circular layout
    const radius = Math.max(300, entityNames.length * 50);
    const centerX = 600;
    const centerY = 400;

    entityNames.forEach((name, index) => {
      const entity = entitiesMap.get(name);
      if (!entity) {
        console.warn('[CustomEntityGraph] Entity not found:', name);
        return;
      }

      console.log('[CustomEntityGraph] Adding entity:', name, 'with', entity.relationships?.length || 0, 'relationships');

      const angle = (index * 2 * Math.PI) / entityNames.length;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      nodes.push({
        id: entity.id,
        type: 'entityNode',
        position: { x, y },
        data: { 
          entity,
          isRoot: index === 0,
        },
      });
    });

    // Create edges for relationships between nodes in the graph
    // Track which edges we've created to show both directions when bidirectional
    const processedEdges = new Map<string, { forward: boolean; reverse: boolean }>();
    
    // First pass: identify all relationships
    entityNames.forEach(name => {
      const entity = entitiesMap.get(name);
      if (!entity) return;

      entity.relationships?.forEach((rel) => {
        const targetId = rel.targetEntityId || rel.TargetEntityId;
        if (!targetId) return;

        const targetName = idToName.get(targetId);
        if (!targetName || !entityNames.includes(targetName)) return;

        const forwardKey = `${entity.id}-${targetId}`;
        const reverseKey = `${targetId}-${entity.id}`;
        
        if (!processedEdges.has(forwardKey)) {
          processedEdges.set(forwardKey, { forward: false, reverse: false });
        }
        processedEdges.get(forwardKey)!.forward = true;
        
        // Check if reverse exists
        if (processedEdges.has(reverseKey)) {
          processedEdges.get(reverseKey)!.reverse = true;
        }
      });
    });

    // Second pass: create edges with appropriate colors
    entityNames.forEach(name => {
      const entity = entitiesMap.get(name);
      if (!entity) return;

      console.log(`[CustomEntityGraph] Processing relationships for ${name}:`, entity.relationships?.length || 0);

      entity.relationships?.forEach((rel) => {
        const targetId = rel.targetEntityId || rel.TargetEntityId;
        if (!targetId) {
          console.log(`[CustomEntityGraph] - Skipping relationship ${rel.name}: no targetId`);
          return;
        }

        const targetName = idToName.get(targetId);
        
        // Check if this is a self-recursive relationship
        const isSelfRecursive = targetId === entity.id;
        
        console.log(`[CustomEntityGraph] - Relationship ${rel.name} -> targetId: ${targetId}, targetName: ${targetName}, in graph: ${targetName ? entityNames.includes(targetName) : false}, isSelfRecursive: ${isSelfRecursive}`);
        
        // For self-recursive, allow even if targetName isn't in the list (because it's the same entity)
        if (!isSelfRecursive && (!targetName || !entityNames.includes(targetName))) return;

        const edgeId = `${entity.id}-${rel.name}-${targetId}`;
        const edgeKey = `${entity.id}-${targetId}`;
        const reverseKey = `${targetId}-${entity.id}`;
        
        console.log(`[CustomEntityGraph] - Creating edge: ${entity.name} -> ${targetName || entity.name} via ${rel.name} (${rel.cardinality}), isSelfRecursive: ${isSelfRecursive}`);
        
        // Format cardinality for display
        const cardinalityLabel = rel.cardinality || 'Unknown';
        const label = `${rel.name}\n[${cardinalityLabel}]`;
        
        // Determine edge color based on direction
        // Green for outbound, purple for inbound (when reverse relationship exists)
        const edgeInfo = processedEdges.get(edgeKey);
        const hasReverse = processedEdges.get(reverseKey)?.forward || false;
        
        let edgeColor = '#4caf50'; // Green for outbound (default)
        let animated = false;
        
        // Special styling for self-recursive relationships
        if (isSelfRecursive) {
          edgeColor = '#ff5722'; // Orange-red for self-recursive
          animated = true;
        } else if (hasReverse) {
          // This edge has a corresponding reverse - show as outbound (green)
          edgeColor = '#4caf50';
          animated = true;
        }
        
        edges.push({
          id: edgeId,
          source: entity.id,
          target: targetId,
          type: isSelfRecursive ? 'default' : 'smoothstep',
          animated,
          label,
          markerEnd: {
            type: 'arrowclosed',
            width: isSelfRecursive ? 25 : 20,
            height: isSelfRecursive ? 25 : 20,
            color: edgeColor,
          },
          style: {
            stroke: edgeColor,
            strokeWidth: isSelfRecursive ? 4 : 2,
            strokeDasharray: isSelfRecursive ? '5,5' : undefined,
          },
          labelStyle: {
            fontSize: 10,
            fill: '#333',
            fontWeight: 500,
          },
          labelBgStyle: {
            fill: '#fff',
            fillOpacity: 0.9,
            padding: 4,
          },
          // Special positioning for self-loops
          sourceHandle: isSelfRecursive ? 'right' : undefined,
          targetHandle: isSelfRecursive ? 'left' : undefined,
        });
      });
    });

    console.log('[CustomEntityGraph] Created nodes:', nodes.length, 'edges:', edges.length, 'for entities:', entityNames);

    return { layoutedNodes: nodes, layoutedEdges: edges };
  }, [entityNames, entitiesMap, idToName]);

  // Update nodes and edges when layout changes
  React.useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  // Handle node context menu
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const entityName = idToName.get(node.id);
    if (entityName) {
      setContextMenu({
        mouseX: event.clientX,
        mouseY: event.clientY,
        nodeId: node.id,
        entityName,
      });
    }
  }, [idToName]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Get related entities for context menu
  const getRelatedEntities = useCallback((entityName: string) => {
    const entity = entitiesMap.get(entityName);
    if (!entity) return { outbound: [], inbound: [] };

    const outbound: Array<{ name: string; relName: string; targetName: string }> = [];
    const inbound: Array<{ name: string; relName: string; sourceName: string }> = [];

    // Outbound relationships
    entity.relationships?.forEach(rel => {
      const targetId = rel.targetEntityId || rel.TargetEntityId;
      if (targetId) {
        const targetName = idToName.get(targetId);
        if (targetName && !entityNames.includes(targetName)) {
          outbound.push({
            name: rel.name,
            relName: rel.name,
            targetName,
          });
        }
      }
    });

    // Inbound relationships
    entitiesMap.forEach((otherEntity) => {
      if (entityNames.includes(otherEntity.name)) return; // Skip if already in graph
      
      otherEntity.relationships?.forEach(rel => {
        const targetId = rel.targetEntityId || rel.TargetEntityId;
        const targetName = idToName.get(targetId);
        if (targetName === entityName) {
          inbound.push({
            name: rel.name,
            relName: rel.name,
            sourceName: otherEntity.name,
          });
        }
      });
    });

    return { outbound, inbound };
  }, [entitiesMap, entityNames, idToName]);

  const relatedEntities = useMemo(() => {
    if (!contextMenu) return { outbound: [], inbound: [] };
    return getRelatedEntities(contextMenu.entityName);
  }, [contextMenu, getRelatedEntities]);

  const handleAddRelatedEntity = useCallback((entityName: string) => {
    onAddEntity(entityName);
    handleCloseContextMenu();
  }, [onAddEntity, handleCloseContextMenu]);

  if (!allEntities) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && entityNames.length > 0 && (
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
          <CircularProgress />
        </Box>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeContextMenu={handleNodeContextMenu}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>

      {/* Info Panel with Legend */}
      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          p: 2,
          maxWidth: 300,
          zIndex: 5,
        }}
        elevation={3}
      >
        <Typography variant="subtitle2" gutterBottom>
          <InfoIcon sx={{ fontSize: '1rem', verticalAlign: 'middle', mr: 0.5 }} />
          Custom Graph
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Right-click on any entity node to see and add related entities
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip label={`${entityNames.length} entities`} size="small" color="primary" />
          <Chip label={`${layoutedEdges.length} relationships`} size="small" />
        </Box>
        
        {/* Legend */}
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
          Relationships
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 30,
                height: 2,
                backgroundColor: '#4caf50',
                borderRadius: 1,
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <OutboundIcon sx={{ fontSize: 12 }} />
              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                Outbound
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 30,
                height: 2,
                backgroundColor: '#9c27b0',
                borderRadius: 1,
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <InboundIcon sx={{ fontSize: 12 }} />
              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                Inbound
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 30,
                height: 2,
                backgroundColor: '#ff5722',
                borderRadius: 1,
                backgroundImage: 'repeating-linear-gradient(90deg, #ff5722, #ff5722 3px, transparent 3px, transparent 6px)',
              }}
            />
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              Self-recursive
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem disabled>
          <Typography variant="subtitle2" fontWeight="bold">
            {contextMenu?.entityName}
          </Typography>
        </MenuItem>
        <Divider />
        
        {relatedEntities.outbound.length > 0 && (
          <>
            <MenuItem disabled>
              <ListItemIcon>
                <OutboundIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Related Entities (Outbound)" primaryTypographyProps={{ variant: 'caption', fontWeight: 'bold' }} />
            </MenuItem>
            {relatedEntities.outbound.map((rel, idx) => (
              <MenuItem key={`out-${idx}`} onClick={() => handleAddRelatedEntity(rel.targetName)}>
                <ListItemIcon>
                  <AddIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={rel.targetName}
                  secondary={`via ${rel.relName}`}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </MenuItem>
            ))}
            <Divider />
          </>
        )}

        {relatedEntities.inbound.length > 0 && (
          <>
            <MenuItem disabled>
              <ListItemIcon>
                <InboundIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Related Entities (Inbound)" primaryTypographyProps={{ variant: 'caption', fontWeight: 'bold' }} />
            </MenuItem>
            {relatedEntities.inbound.map((rel, idx) => (
              <MenuItem key={`in-${idx}`} onClick={() => handleAddRelatedEntity(rel.sourceName)}>
                <ListItemIcon>
                  <AddIcon fontSize="small" color="secondary" />
                </ListItemIcon>
                <ListItemText 
                  primary={rel.sourceName}
                  secondary={`via ${rel.relName}`}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </MenuItem>
            ))}
          </>
        )}

        {relatedEntities.outbound.length === 0 && relatedEntities.inbound.length === 0 && (
          <MenuItem disabled>
            <Typography variant="caption" color="text.secondary">
              No related entities available to add
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default CustomEntityGraph;
