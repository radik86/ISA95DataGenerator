import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  InputAdornment,
  IconButton,
  Tooltip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  PlayArrow as GenerateIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  DeleteSweep as DeleteSweepIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useEntities } from '../api/hooks';
import apiClient from '../api/client';

interface EntityConfig {
  entityName: string;
  displayName: string;
  count: number;
  storeName: string; // auto-derived or overridden
  storeNameOverridden: boolean;
  editingStore: boolean;
  editStoreValue: string;
}

interface MassDataCountEntry {
  storeName: string;
  count: number;
}

interface MassDataCount {
  total: number;
  byStore: MassDataCountEntry[];
}

interface PersistEntityResult {
  entityName: string;
  storeName: string;
  generated: number;
  added: number;
  updated: number;
  error?: string;
}

interface PersistResult {
  results: PersistEntityResult[];
  totalRecords: number;
  elapsedMs: number;
  generatedAt: string;
}

const COUNT_PRESETS = [100, 1_000, 10_000, 100_000];

function deriveStoreName(entityName: string): string {
  if (!entityName) return '';
  const words = entityName.trim().split(/\s+/);
  const camel = words
    .map((w, i) => i === 0
      ? w.charAt(0).toLowerCase() + w.slice(1)
      : w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  if (camel.endsWith('y') && camel.length > 1 && !'aeiou'.includes(camel[camel.length - 2])) {
    return camel.slice(0, -1) + 'ies';
  }
  if (camel.endsWith('s') || camel.endsWith('x') || camel.endsWith('z') ||
    camel.endsWith('sh') || camel.endsWith('ch')) {
    return camel + 'es';
  }
  return camel + 's';
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const MassDataGenerator: React.FC = () => {
  const { data: entities, isLoading: entitiesLoading } = useEntities();

  const [search, setSearch] = useState('');
  const [selectedConfigs, setSelectedConfigs] = useState<EntityConfig[]>([]);
  const [seed, setSeed] = useState<number>(42);
  const [isPersisting, setIsPersisting] = useState(false);
  const [result, setResult] = useState<PersistResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cleanup state
  const [massDataCount, setMassDataCount] = useState<MassDataCount | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState<string | null>(null);

  const fetchMassDataCount = useCallback(async () => {
    setIsLoadingCount(true);
    try {
      const resp = await apiClient.get('/datageneration/mass-persist/count');
      setMassDataCount(resp.data as MassDataCount);
    } catch {
      // ignore
    } finally {
      setIsLoadingCount(false);
    }
  }, []);

  useEffect(() => { fetchMassDataCount(); }, [fetchMassDataCount]);

  async function handleClearAll() {
    setIsClearing(true);
    setClearSuccess(null);
    try {
      const resp = await apiClient.delete('/datageneration/mass-persist');
      setClearSuccess(`Deleted ${resp.data.deleted.toLocaleString()} mass-generated records.`);
      await fetchMassDataCount();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Clear failed');
    } finally {
      setIsClearing(false);
    }
  }

  // Available entities filtered by search
  const filteredEntities = useMemo(() => {
    if (!entities) return [];
    const q = search.toLowerCase();
    return entities.filter(e =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      (e.displayName ?? '').toLowerCase().includes(q)
    );
  }, [entities, search]);

  const selectedNames = useMemo(
    () => new Set(selectedConfigs.map(c => c.entityName)),
    [selectedConfigs]
  );

  function addEntity(entityName: string, displayName: string) {
    if (selectedNames.has(entityName)) return;
    setSelectedConfigs(prev => [
      ...prev,
      {
        entityName,
        displayName: displayName || entityName,
        count: 1000,
        storeName: deriveStoreName(entityName),
        storeNameOverridden: false,
        editingStore: false,
        editStoreValue: deriveStoreName(entityName),
      },
    ]);
  }

  function removeEntity(entityName: string) {
    setSelectedConfigs(prev => prev.filter(c => c.entityName !== entityName));
  }

  function updateCount(entityName: string, count: number) {
    setSelectedConfigs(prev =>
      prev.map(c => c.entityName === entityName ? { ...c, count: Math.max(1, count) } : c)
    );
  }

  function startEditStore(entityName: string) {
    setSelectedConfigs(prev =>
      prev.map(c =>
        c.entityName === entityName
          ? { ...c, editingStore: true, editStoreValue: c.storeName }
          : c
      )
    );
  }

  function confirmEditStore(entityName: string) {
    setSelectedConfigs(prev =>
      prev.map(c =>
        c.entityName === entityName
          ? {
            ...c,
            editingStore: false,
            storeName: c.editStoreValue || deriveStoreName(entityName),
            storeNameOverridden: true,
          }
          : c
      )
    );
  }

  function cancelEditStore(entityName: string) {
    setSelectedConfigs(prev =>
      prev.map(c =>
        c.entityName === entityName
          ? { ...c, editingStore: false }
          : c
      )
    );
  }

  function resetStoreName(entityName: string) {
    setSelectedConfigs(prev =>
      prev.map(c =>
        c.entityName === entityName
          ? {
            ...c,
            storeName: deriveStoreName(entityName),
            storeNameOverridden: false,
            editingStore: false,
            editStoreValue: deriveStoreName(entityName),
          }
          : c
      )
    );
  }

  async function handleGenerate() {
    if (selectedConfigs.length === 0) return;
    setIsPersisting(true);
    setError(null);
    setResult(null);

    try {
      const resp = await apiClient.post('/datageneration/mass-persist', {
        entities: selectedConfigs.map(c => ({
          entityName: c.entityName,
          count: c.count,
          storeName: c.storeName,
        })),
        seed,
        primaryKeyRules: [],
        fieldRules: [],
      });
      setResult(resp.data as PersistResult);
      await fetchMassDataCount();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Unknown error');
    } finally {
      setIsPersisting(false);
    }
  }

  const totalRecords = selectedConfigs.reduce((s, c) => s + c.count, 0);

  return (
    <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h5" gutterBottom>
          Mass Data Generator
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select entities from the DTDL schema, configure record counts, and persist large volumes of
          dummy data directly to the database for performance testing.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
        {/* ── Entity picker ── */}
        <Paper sx={{ width: 280, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Available Entities
            </Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {entitiesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              filteredEntities.map(entity => {
                const isSelected = selectedNames.has(entity.name);
                return (
                  <Box
                    key={entity.name}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 1.5,
                      py: 0.5,
                      cursor: isSelected ? 'default' : 'pointer',
                      bgcolor: isSelected ? 'action.selected' : 'transparent',
                      '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' },
                    }}
                    onClick={() => !isSelected && addEntity(entity.name, entity.displayName ?? entity.name)}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.78rem',
                        color: isSelected ? 'text.disabled' : 'text.primary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entity.displayName || entity.name}
                    </Typography>
                    {isSelected ? (
                      <CheckIcon sx={{ fontSize: 14, color: 'success.main', flexShrink: 0 }} />
                    ) : (
                      <AddIcon sx={{ fontSize: 14, color: 'action.active', flexShrink: 0 }} />
                    )}
                  </Box>
                );
              })
            )}
          </Box>
        </Paper>

        {/* ── Configuration & Results ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          {/* Selected entities table */}
          <Paper sx={{ flex: selectedConfigs.length > 0 ? '1 1 auto' : 'none', display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                p: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Selected Entities
                </Typography>
                {selectedConfigs.length > 0 && (
                  <Chip
                    label={`${selectedConfigs.length} entities · ~${formatCount(totalRecords)} records`}
                    size="small"
                    color="primary"
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  label="Seed"
                  type="number"
                  size="small"
                  value={seed}
                  onChange={e => setSeed(Number(e.target.value))}
                  sx={{ width: 90 }}
                  inputProps={{ min: 0 }}
                />
                <Button
                  variant="contained"
                  startIcon={isPersisting ? <CircularProgress size={16} color="inherit" /> : <GenerateIcon />}
                  onClick={handleGenerate}
                  disabled={selectedConfigs.length === 0 || isPersisting}
                  size="small"
                >
                  {isPersisting ? 'Generating…' : 'Generate & Persist'}
                </Button>
              </Box>
            </Box>

            {selectedConfigs.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Click entities on the left to add them to the generation list.
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Entity</TableCell>
                      <TableCell sx={{ width: 200 }}>Store Name</TableCell>
                      <TableCell sx={{ width: 220 }}>Count</TableCell>
                      <TableCell sx={{ width: 50 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedConfigs.map(cfg => (
                      <TableRow key={cfg.entityName}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace" fontSize="0.82rem">
                            {cfg.displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                            {cfg.entityName}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          {cfg.editingStore ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <TextField
                                size="small"
                                value={cfg.editStoreValue}
                                onChange={e =>
                                  setSelectedConfigs(prev =>
                                    prev.map(c =>
                                      c.entityName === cfg.entityName
                                        ? { ...c, editStoreValue: e.target.value }
                                        : c
                                    )
                                  )
                                }
                                sx={{ flex: 1 }}
                                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                              />
                              <IconButton size="small" onClick={() => confirmEditStore(cfg.entityName)}>
                                <CheckIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => cancelEditStore(cfg.entityName)}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography
                                variant="body2"
                                fontFamily="monospace"
                                fontSize="0.8rem"
                                sx={{ flex: 1 }}
                              >
                                {cfg.storeName}
                                {cfg.storeNameOverridden && (
                                  <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 0.5 }}>
                                    (custom)
                                  </Typography>
                                )}
                              </Typography>
                              <Tooltip title="Edit store name">
                                <IconButton size="small" onClick={() => startEditStore(cfg.entityName)}>
                                  <EditIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                              {cfg.storeNameOverridden && (
                                <Tooltip title="Reset to default">
                                  <IconButton size="small" onClick={() => resetStoreName(cfg.entityName)}>
                                    <CloseIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          )}
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => updateCount(cfg.entityName, cfg.count - 100)}
                              disabled={cfg.count <= 100}
                            >
                              <RemoveIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <TextField
                              size="small"
                              type="number"
                              value={cfg.count}
                              onChange={e => updateCount(cfg.entityName, Number(e.target.value))}
                              inputProps={{ min: 1, style: { width: 70, textAlign: 'right' } }}
                              sx={{ mx: 0.5 }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => updateCount(cfg.entityName, cfg.count + 100)}
                            >
                              <AddIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                            {COUNT_PRESETS.map(p => (
                              <Chip
                                key={p}
                                label={formatCount(p)}
                                size="small"
                                variant={cfg.count === p ? 'filled' : 'outlined'}
                                color={cfg.count === p ? 'primary' : 'default'}
                                onClick={() => updateCount(cfg.entityName, p)}
                                sx={{ cursor: 'pointer', fontSize: '0.7rem', height: 20 }}
                              />
                            ))}
                          </Box>
                        </TableCell>

                        <TableCell>
                          <IconButton size="small" onClick={() => removeEntity(cfg.entityName)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {isPersisting && <LinearProgress />}
          </Paper>

          {/* Results */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {clearSuccess && (
            <Alert severity="success" onClose={() => setClearSuccess(null)}>
              {clearSuccess}
            </Alert>
          )}

          {/* Clear mass data panel */}
          <Paper>
            <Box
              sx={{
                p: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Mass Data Cleanup
                </Typography>
                {massDataCount !== null && (
                  <Chip
                    label={
                      massDataCount.total === 0
                        ? 'No mass data in DB'
                        : `${massDataCount.total.toLocaleString()} mass-generated records in DB`
                    }
                    size="small"
                    color={massDataCount.total > 0 ? 'warning' : 'default'}
                  />
                )}
                <Tooltip title="Refresh count">
                  <IconButton size="small" onClick={fetchMassDataCount} disabled={isLoadingCount}>
                    {isLoadingCount ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={isClearing ? <CircularProgress size={16} color="inherit" /> : <DeleteSweepIcon />}
                onClick={handleClearAll}
                disabled={isClearing || massDataCount?.total === 0}
              >
                {isClearing ? 'Clearing…' : 'Clear All Mass Data'}
              </Button>
            </Box>

            {massDataCount && massDataCount.byStore.length > 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Store</TableCell>
                      <TableCell align="right">Records</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {massDataCount.byStore
                      .sort((a, b) => b.count - a.count)
                      .map(s => (
                        <TableRow key={s.storeName}>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace" fontSize="0.82rem">
                              {s.storeName}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">{s.count.toLocaleString()}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {result && (
            <Paper>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'success.main',
                  color: 'white',
                  borderRadius: '4px 4px 0 0',
                  display: 'flex',
                  gap: 2,
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  Generation Complete
                </Typography>
                <Chip
                  label={`${result.totalRecords.toLocaleString()} total records`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
                <Chip
                  label={`${(result.elapsedMs / 1000).toFixed(1)}s`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Entity</TableCell>
                      <TableCell>Store</TableCell>
                      <TableCell align="right">Generated</TableCell>
                      <TableCell align="right">Added</TableCell>
                      <TableCell align="right">Updated</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.results.map(r => (
                      <TableRow key={r.entityName}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace" fontSize="0.82rem">
                            {r.entityName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem" color="text.secondary">
                            {r.storeName}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{r.generated.toLocaleString()}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="success.main">
                            {r.added.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="warning.main">
                            {r.updated.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {r.error ? (
                            <Chip label="Error" color="error" size="small" />
                          ) : (
                            <Chip label="OK" color="success" size="small" />
                          )}
                          {r.error && (
                            <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                              {r.error}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MassDataGenerator;
