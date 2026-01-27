import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Drawer,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import { 
  Search as SearchIcon,
  AccountTree as GraphIcon,
  Add as AddIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useEntities } from '../api/hooks';
import { useStore } from '../store/useStore';
import EntityGraph from './EntityGraph';
import EntityDetails from './EntityDetails';
import CustomEntityGraph from './CustomEntityGraph';

const DRAWER_WIDTH = 300;

const EntityBrowser: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'single' | 'custom'>('single');
  const [customGraphEntities, setCustomGraphEntities] = useState<string[]>([]);
  const { data: entities, isLoading, error } = useEntities();
  const { selectedEntity, setSelectedEntity } = useStore();

  // Expose store to EntityGraph for navigation
  React.useEffect(() => {
    (window as any).__entityBrowserStore = { setSelectedEntity };
    return () => {
      delete (window as any).__entityBrowserStore;
    };
  }, [setSelectedEntity]);

  console.log('EntityBrowser render:', { entities: entities?.length, isLoading, error });

  const filteredEntities = useMemo(() => {
    if (!entities) return [];
    if (!searchTerm) return entities;
    
    const term = searchTerm.toLowerCase();
    return entities.filter(
      (entity) =>
        entity.name.toLowerCase().includes(term) ||
        entity.displayName?.toLowerCase().includes(term) ||
        entity.description?.toLowerCase().includes(term)
    );
  }, [entities, searchTerm]);

  const handleEntityClick = useCallback(
    (entityName: string) => {
      if (viewMode === 'single') {
        setSelectedEntity(entityName);
      } else {
        // In custom mode, add to graph if not already present
        if (!customGraphEntities.includes(entityName)) {
          setCustomGraphEntities(prev => [...prev, entityName]);
        }
      }
    },
    [setSelectedEntity, viewMode, customGraphEntities]
  );

  const handleRemoveFromGraph = useCallback((entityName: string) => {
    setCustomGraphEntities(prev => prev.filter(e => e !== entityName));
  }, []);

  const handleClearGraph = useCallback(() => {
    setCustomGraphEntities([]);
  }, []);

  const handleViewModeChange = useCallback((_: React.MouseEvent<HTMLElement>, newMode: 'single' | 'custom' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
      if (newMode === 'custom') {
        setCustomGraphEntities([]);
      }
    }
  }, []);

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: '600px' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            position: 'relative',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Entities
          </Typography>

          {/* View Mode Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="single">
              Single Entity
            </ToggleButton>
            <ToggleButton value="custom">
              <GraphIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
              Custom Graph
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Custom Graph Controls */}
          {viewMode === 'custom' && (
            <Box sx={{ mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Graph: {customGraphEntities.length} entities
                </Typography>
                {customGraphEntities.length > 0 && (
                  <Button
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={handleClearGraph}
                    color="error"
                  >
                    Clear
                  </Button>
                )}
              </Box>
              {customGraphEntities.length > 0 && (
                <Box sx={{ maxHeight: '120px', overflow: 'auto' }}>
                  {customGraphEntities.map(name => (
                    <Chip
                      key={name}
                      label={name}
                      size="small"
                      onDelete={() => handleRemoveFromGraph(name)}
                      sx={{ m: 0.3 }}
                    />
                  ))}
                </Box>
              )}
              <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                <AddIcon sx={{ fontSize: '0.875rem', verticalAlign: 'middle' }} /> Click entities below to add to graph
              </Typography>
            </Box>
          )}
          
          <TextField
            fullWidth
            size="small"
            placeholder="Search entities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
            }}
            sx={{ mb: 2 }}
          />

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to load entities: {error instanceof Error ? error.message : 'Unknown error'}
            </Alert>
          )}

          {entities && (
            <Box sx={{ mb: 2 }}>
              <Chip
                label={`${filteredEntities.length} of ${entities.length}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          )}

          <List sx={{ maxHeight: 'calc(100vh - 450px)', overflow: 'auto' }}>
            {filteredEntities.map((entity) => {
              const isInGraph = customGraphEntities.includes(entity.name);
              return (
                <ListItem key={entity.name} disablePadding>
                  <ListItemButton
                    selected={viewMode === 'single' ? selectedEntity === entity.name : isInGraph}
                    onClick={() => handleEntityClick(entity.name)}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {entity.displayName || entity.name}
                          {viewMode === 'custom' && isInGraph && (
                            <Chip label="In Graph" size="small" color="primary" sx={{ height: 16, fontSize: '0.65rem' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" noWrap>
                          {(entity as any).attributeCount || 0} attrs, {(entity as any).relationshipCount || 0} rels
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {viewMode === 'single' ? (
          !selectedEntity ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <Typography variant="h6" color="text.secondary">
                Select an entity to view its graph and details
              </Typography>
            </Box>
          ) : (
            <>
              {/* Graph Visualization */}
              <Box sx={{ flexGrow: 1, position: 'relative' }}>
                <EntityGraph entityName={selectedEntity} />
              </Box>

              {/* Entity Details Panel */}
              <Paper
                elevation={3}
                sx={{
                  height: '300px',
                  overflow: 'auto',
                  borderTop: 1,
                  borderColor: 'divider',
                }}
              >
                <EntityDetails entityName={selectedEntity} />
              </Paper>
            </>
          )
        ) : (
          /* Custom Graph Mode */
          customGraphEntities.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <GraphIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.secondary">
                Start building your custom graph
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click on entities from the list to add them to the graph
              </Typography>
            </Box>
          ) : (
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
              <CustomEntityGraph entityNames={customGraphEntities} onAddEntity={handleEntityClick} />
            </Box>
          )
        )}
      </Box>
    </Box>
  );
};

export default EntityBrowser;
