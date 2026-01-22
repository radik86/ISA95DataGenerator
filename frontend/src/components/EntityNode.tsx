import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Paper,
  Typography,
  IconButton,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  Button,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
} from '@mui/material';
import { InfoOutlined as InfoIcon, Add as AddIcon, CallMade as OutboundIcon, CallReceived as InboundIcon } from '@mui/icons-material';
import { useEntities } from '../api/hooks';
import { EntityDefinition, AttributeDefinition, RelationshipDefinition } from '../types';

export interface EntityNodeData {
  entity: EntityDefinition;
  isRoot?: boolean;
  onAddRelationship?: (entity: EntityDefinition, anchorEl: HTMLElement) => void;
}

const EntityNode: React.FC<NodeProps> = ({ data }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { entity, isRoot, onAddRelationship } = data as unknown as EntityNodeData;

  const handleInfoClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Handle type="target" position={Position.Top} />
      
      <Paper
        elevation={isRoot ? 8 : 3}
        sx={{
          p: 2,
          minWidth: 200,
          border: isRoot ? 2 : 1,
          borderColor: isRoot ? 'primary.main' : 'divider',
          bgcolor: isRoot ? 'primary.50' : 'background.paper',
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {entity.displayName || entity.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {entity.attributes?.length || 0} attributes
            </Typography>
          </Box>
          
          <IconButton
            size="small"
            onClick={handleInfoClick}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Box>

        {onAddRelationship && (
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onAddRelationship(entity, e.currentTarget);
            }}
            sx={{ mt: 1, fontSize: '0.75rem' }}
          >
            Add Relationship
          </Button>
        )}

        {isRoot && (
          <Chip
            label="Root"
            size="small"
            color="primary"
            sx={{ mt: 1 }}
          />
        )}
      </Paper>

      <Handle type="source" position={Position.Bottom} />

      {/* Property Tooltip Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            {entity.displayName || entity.name}
          </Typography>
          
          {entity.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {entity.description}
            </Typography>
          )}

          {/* DTDL Schema Info */}
          {(entity.id || entity.context) && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
              {entity.id && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">
                    @id:
                  </Typography>
                  <Typography variant="caption" sx={{ ml: 1, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {entity.id}
                  </Typography>
                </Box>
              )}
              {entity.context && (
                <Box>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">
                    @context:
                  </Typography>
                  <Typography variant="caption" sx={{ ml: 1, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {entity.context}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          <Typography variant="subtitle2" gutterBottom>
            Attributes ({entity.attributes?.length || 0})
          </Typography>
          
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Properties</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entity.attributes?.map((attr: AttributeDefinition) => (
                  <TableRow key={attr.name}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={attr.isPrimaryKey ? 'bold' : 'normal'}>
                        {attr.displayName || attr.name}
                        {attr.isPrimaryKey && ' 🔑'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {attr.schema}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} 
                        title={attr.description || ''}
                      >
                        {attr.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flexDirection: 'column', alignItems: 'flex-start' }}>
                        {attr.isRequired && (
                          <Chip label="Required" size="small" color="error" variant="outlined" />
                        )}
                        {attr.canBePrimaryKey && (
                          <Chip label="Can be PK" size="small" color="primary" variant="outlined" />
                        )}
                        {attr.enumValues && attr.enumValues.length > 0 && (
                          <Box sx={{ width: '100%' }}>
                            <Typography 
                              variant="caption" 
                              display="block" 
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': { textDecoration: 'underline' },
                                fontSize: '0.75rem',
                                fontWeight: 500
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const details = e.currentTarget.nextElementSibling as HTMLElement;
                                if (details) {
                                  details.style.display = details.style.display === 'none' ? 'block' : 'none';
                                }
                              }}
                            >
                              Enum ({attr.enumValues.length}) ▼
                            </Typography>
                            <Box sx={{ display: 'none', pl: 1, mt: 0.5, maxHeight: 150, overflowY: 'auto' }}>
                              {attr.enumValues.map((val, idx) => (
                                <Typography key={idx} variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                                  • {typeof val === 'object' ? (val.displayName || val.enumValue || val.name) : val}
                                </Typography>
                              ))}
                            </Box>
                          </Box>
                        )}
                        {(attr.minValue !== undefined || attr.maxValue !== undefined) && (
                          <Chip
                            label={`Range: ${attr.minValue ?? '∞'}-${attr.maxValue ?? '∞'}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {entity.relationships && entity.relationships.length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Relationships ({entity.relationships.length})
              </Typography>
              <TableContainer sx={{ maxHeight: 200 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Target</TableCell>
                      <TableCell>Cardinality</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entity.relationships?.map((rel: RelationshipDefinition, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{rel.displayName || rel.name}</TableCell>
                        <TableCell>{rel.targetEntityName || rel.TargetEntityName}</TableCell>
                        <TableCell>{rel.cardinality}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default EntityNode;
