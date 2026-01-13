import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useEntityStructure } from '../api/hooks';

interface EntityDetailsProps {
  entityName: string;
}

const EntityDetails: React.FC<EntityDetailsProps> = ({ entityName }) => {
  const [tabValue, setTabValue] = React.useState(0);
  const { data: entity, isLoading, error } = useEntityStructure(entityName);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !entity) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">Failed to load entity details</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`Attributes (${entity.attributes?.length || 0})`} />
          <Tab label={`Relationships (${entity.relationships?.length || 0})`} />
        </Tabs>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {/* Attributes Tab */}
        {tabValue === 0 && (
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Display Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Properties</TableCell>
                  <TableCell>Constraints</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entity.attributes?.map((attr) => (
                  <TableRow key={attr.name}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {attr.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{attr.displayName || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {attr.schema}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 300 }} title={attr.description || ''}>
                        {attr.description ? (
                          attr.description.length > 60 
                            ? `${attr.description.substring(0, 60)}...` 
                            : attr.description
                        ) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {attr.isPrimaryKey && (
                          <Chip label="Primary Key" size="small" color="primary" />
                        )}
                        {attr.isRequired && (
                          <Chip label="Required" size="small" color="error" variant="outlined" />
                        )}
                        {attr.canBePrimaryKey && !attr.isPrimaryKey && (
                          <Chip
                            label="Can be PK"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        {attr.enumValues && attr.enumValues.length > 0 && (
                          <Box>
                            <Typography 
                              variant="caption" 
                              display="block" 
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': { textDecoration: 'underline' }
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
                            <Box sx={{ display: 'none', pl: 1, mt: 0.5 }}>
                              {attr.enumValues.map((val, idx) => (
                                <Typography key={idx} variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                                  • {typeof val === 'object' ? (val.displayName || val.enumValue || val.name) : val}
                                </Typography>
                              ))}
                            </Box>
                          </Box>
                        )}
                        {(attr.minValue !== undefined || attr.maxValue !== undefined) && (
                          <Typography variant="caption" display="block">
                            Range: [{attr.minValue ?? '∞'}, {attr.maxValue ?? '∞'}]
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Relationships Tab */}
        {tabValue === 1 && (
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Target Entity</TableCell>
                  <TableCell>Cardinality</TableCell>
                  <TableCell>Direction</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entity.relationships?.map((rel, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {rel.displayName || rel.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={rel.targetEntityName || rel.TargetEntityName} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={rel.cardinality}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{rel.direction}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {rel.description || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};

export default EntityDetails;
