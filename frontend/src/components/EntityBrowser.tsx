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
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useEntities } from '../api/hooks';
import { useStore } from '../store/useStore';
import EntityGraph from './EntityGraph';
import EntityDetails from './EntityDetails';

const DRAWER_WIDTH = 300;

const EntityBrowser: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
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
      setSelectedEntity(entityName);
    },
    [setSelectedEntity]
  );

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

          <List sx={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
            {filteredEntities.map((entity) => (
              <ListItem key={entity.name} disablePadding>
                <ListItemButton
                  selected={selectedEntity === entity.name}
                  onClick={() => handleEntityClick(entity.name)}
                >
                <ListItemText
                    primary={entity.displayName || entity.name}
                    secondary={
                      <Typography variant="caption" noWrap>
                        {(entity as any).attributeCount || 0} attrs, {(entity as any).relationshipCount || 0} rels
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {!selectedEntity ? (
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
        )}
      </Box>
    </Box>
  );
};

export default EntityBrowser;
