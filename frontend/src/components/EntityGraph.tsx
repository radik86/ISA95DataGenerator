import React, { useMemo, useCallback } from 'react';
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
import { useEntityGraph } from '../api/hooks';
import { Box, CircularProgress, Alert, Tooltip } from '@mui/material';
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
    
    entity.relationships?.forEach((rel) => {
      const targetId = rel.targetEntityId || rel.TargetEntityId;
      if (!targetId) {
        console.warn(`No target ID found for relationship ${rel.name} from ${entity.name}`);
        return;
      }
      
      // Look up target entity name by ID
      const targetName = idToName.get(targetId);
      if (!targetName || !entities[targetName]) {
        console.warn(`Target entity with ID ${targetId} not found in graph for relationship ${rel.name} from ${entity.name}`);
        return;
      }
      
      const targetEntity = entities[targetName];
      const edgeId = `${entity.id}-${rel.name}-${targetEntity.id}`;
      
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

      edges.push({
        id: edgeId,
        source: entity.id,  // Use source entity ID
        target: targetEntity.id,  // Use target entity ID
        label,
        type: 'default',  // Use default straight edges for clarity
        animated: isRoot,
        style: { 
          stroke: isRoot ? '#2196f3' : '#9e9e9e',
          strokeWidth: isRoot ? 3 : 1.5,
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
          color: isRoot ? '#2196f3' : '#9e9e9e',
        },
      });
    });
  });

  return { nodes, edges };
};

const EntityGraph: React.FC<EntityGraphProps> = ({ entityName, maxDepth = 2 }) => {
  const { data: graphData, isLoading, error } = useEntityGraph(entityName, maxDepth);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [] };
    try {
      return getLayoutedNodes(graphData, entityName);
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
      const { nodes: newNodes, edges: newEdges } = getLayoutedNodes(graphData, entityName);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [graphData, entityName, setNodes, setEdges]);

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
                backgroundColor: '#2196f3',
                borderRadius: 1,
              }}
            />
            <Box sx={{ fontSize: 12 }}>Root relationships</Box>
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
            <Box sx={{ fontSize: 12 }}>Other relationships</Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default EntityGraph;
