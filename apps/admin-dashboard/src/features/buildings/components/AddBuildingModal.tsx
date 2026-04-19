import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FileUploadRoundedIcon from '@mui/icons-material/FileUploadRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import {
  Alert,
  Box,
  Button,
  Dialog,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useRef, useState } from 'react';
import { checkZoneIdExists, importZones } from '../../../services/buildings.service';
import type { ZoneImportPayload } from '../../../types/buildings';
import { useToastStore } from '../../../store/useToastStore';

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => Promise<void> | void;
};

type ImportMode = 'geojson' | 'points';

type DraftZone = {
  internalKey: string;
  id: string;
  name: string;
  type: string;
  polygon_geojson: unknown;
  sourceMode: ImportMode;
  pointCount?: number;
  details: {
    display_name: string;
    capacity: number;
    description: string;
    area_group: string;
    capacity_mode: string;
  };
};

type PointCapture = {
  id?: string;
  placeId?: string;
  placeType?: string;
  building?: string;
  floor?: number | string | null;
  capturedAt?: string;
  geo?: {
    lat?: number;
    lng?: number;
    accuracyM?: number;
  };
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function ensurePolygonClosed(coords: number[][]) {
  if (coords.length === 0) return coords;
  const first = coords[0];
  const last = coords[coords.length - 1];

  if (!last || first[0] !== last[0] || first[1] !== last[1]) {
    return [...coords, first];
  }

  return coords;
}

function featureCollectionToDraftZones(input: any): DraftZone[] {
  if (!input || input.type !== 'FeatureCollection' || !Array.isArray(input.features)) {
    throw new Error('GeoJSON must be a valid FeatureCollection.');
  }

  return input.features.map((feature: any, index: number) => {
    const props = feature?.properties ?? {};
    const geometry = feature?.geometry;

    if (!geometry || geometry.type !== 'Polygon') {
      throw new Error(`Feature ${index + 1} must have Polygon geometry.`);
    }

    const rawName =
      props.display_name ||
      props.name ||
      props.building_id ||
      `zone_${index + 1}`;

    const id = slugify(props.building_id || rawName || `zone_${index + 1}`);

    return {
      internalKey: `geo-zone-${index}-${id}`,
      id,
      name: String(rawName).replace(/\s+/g, '_'),
      type: String(props.place_type || props.type || 'common_space'),
      polygon_geojson: geometry,
      sourceMode: 'geojson',
      details: {
        display_name: String(props.display_name || rawName),
        capacity: Number(props.capacity ?? 0),
        description: String(props.description ?? ''),
        area_group: String(props.area_group ?? 'common_space'),
        capacity_mode: String(props.capacity_mode ?? 'open'),
      },
    };
  });
}

function parsePointInput(text: string): PointCapture[] {
  const parsed = JSON.parse(text);

  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.points)) return parsed.points;
  if (Array.isArray(parsed?.data)) return parsed.data;

  throw new Error('Point JSON must be an array or an object containing points/data array.');
}

function pointsToDraftZones(points: PointCapture[]): DraftZone[] {
  if (!Array.isArray(points) || points.length === 0) {
    throw new Error('Point JSON does not contain any points.');
  }

  const validPoints = points.filter(
    (point) =>
      typeof point?.geo?.lat === 'number' &&
      typeof point?.geo?.lng === 'number',
  );

  if (validPoints.length < 3) {
    throw new Error('At least 3 valid points are required to generate a polygon preview.');
  }

  const grouped = new Map<string, PointCapture[]>();

  for (const point of validPoints) {
    const placeId = String(point.placeId || 'unknown_place');
    const building = String(point.building || 'unknown_building');
    const floor = point.floor == null ? '0' : String(point.floor);
    const key = `${placeId}__${building}__${floor}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key)!.push(point);
  }

  const draftZones: DraftZone[] = [];

  Array.from(grouped.entries()).forEach(([_, groupPoints], index) => {
    if (groupPoints.length < 3) return;

    const sorted = [...groupPoints].sort((a, b) => {
      const aTime = new Date(a.capturedAt || 0).getTime();
      const bTime = new Date(b.capturedAt || 0).getTime();
      return aTime - bTime;
    });

    const sample = sorted[0];
    const placeId = String(sample.placeId || `point_zone_${index + 1}`);
    const building = String(sample.building || 'Unknown Building');
    const floor = sample.floor == null ? 0 : Number(sample.floor);
    const placeType = String(sample.placeType || 'common_space');

    const coordinates = ensurePolygonClosed(
      sorted.map((point) => [
        Number(point.geo!.lng),
        Number(point.geo!.lat),
      ]),
    );

    const zoneId = slugify(`${placeId}_${building}_${floor}`);
    const displayName = `${building.replace(/_/g, ' ')} ${placeId}`;

    draftZones.push({
      internalKey: `point-zone-${index}-${zoneId}`,
      id: zoneId,
      name: displayName.replace(/\s+/g, '_'),
      type: placeType.toLowerCase(),
      polygon_geojson: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
      sourceMode: 'points',
      pointCount: sorted.length,
      details: {
        display_name: displayName,
        capacity: 0,
        description: `Generated from ${sorted.length} captured perimeter points.`,
        area_group: 'structured_space',
        capacity_mode: 'limited',
      },
    });
  });

  if (draftZones.length === 0) {
    throw new Error('No valid point groups with at least 3 points were found.');
  }

  return draftZones;
}

export function AddBuildingModal({ open, onClose, onImported }: Props) {
  const [mode, setMode] = useState<ImportMode>('geojson');
  const [geoJsonText, setGeoJsonText] = useState('');
  const [pointJsonText, setPointJsonText] = useState('');
  const [draftZones, setDraftZones] = useState<DraftZone[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const showToast = useToastStore((state) => state.showToast);

  const parsedCount = draftZones.length;
  const currentText = mode === 'geojson' ? geoJsonText : pointJsonText;

  const helperText = useMemo(() => {
    if (mode === 'geojson') {
      return 'Paste a GeoJSON FeatureCollection or upload a .json/.geojson file, then click Parse JSON.';
    }
    return 'Paste point-capture JSON or upload a .json file. The system will group points and generate zone previews.';
  }, [mode]);

  function resetState() {
    setGeoJsonText('');
    setPointJsonText('');
    setDraftZones([]);
    setLoading(false);
    setMode('geojson');
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function parseCurrentInput(text: string, activeMode: ImportMode) {
    if (activeMode === 'geojson') {
      const json = JSON.parse(text);
      const zones = featureCollectionToDraftZones(json);
      setDraftZones(zones);
      showToast({
        severity: 'success',
        title: 'GeoJSON parsed',
        message: `${zones.length} building zone(s) are ready for review.`,
      });
      return;
    }

    const points = parsePointInput(text);
    const zones = pointsToDraftZones(points);
    setDraftZones(zones);
    showToast({
      severity: 'success',
      title: 'Point JSON parsed',
      message: `${zones.length} building zone preview(s) were generated from points.`,
    });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();

      if (mode === 'geojson') {
        setGeoJsonText(text);
      } else {
        setPointJsonText(text);
      }

      parseCurrentInput(text, mode);
    } catch (err: any) {
      console.error(err);
      setDraftZones([]);
      showToast({
        severity: 'error',
        title: 'File read failed',
        message: err?.message ?? 'Unable to read the uploaded file.',
      });
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  }

  function handleParse() {
    try {
      if (!currentText.trim()) {
        setDraftZones([]);
        showToast({
          severity: 'warning',
          title: 'No JSON found',
          message: 'Paste JSON content first before parsing.',
        });
        return;
      }

      parseCurrentInput(currentText, mode);
    } catch (err: any) {
      setDraftZones([]);
      showToast({
        severity: 'error',
        title: 'Parsing failed',
        message: err?.message ?? 'Invalid JSON.',
      });
    }
  }

  function updateDraftZone(index: number, patch: Partial<DraftZone['details']> | Partial<DraftZone>) {
    setDraftZones((prev) =>
      prev.map((zone, i) => {
        if (i !== index) return zone;

        const next = { ...zone };

        if ('id' in patch && patch.id !== undefined) next.id = String(patch.id);
        if ('name' in patch && patch.name !== undefined) next.name = String(patch.name);
        if ('type' in patch && patch.type !== undefined) next.type = String(patch.type);

        next.details = {
          ...zone.details,
          display_name:
            'display_name' in patch && patch.display_name !== undefined
              ? String(patch.display_name)
              : zone.details.display_name,
          capacity:
            'capacity' in patch && patch.capacity !== undefined
              ? Number(patch.capacity)
              : zone.details.capacity,
          description:
            'description' in patch && patch.description !== undefined
              ? String(patch.description)
              : zone.details.description,
          area_group:
            'area_group' in patch && patch.area_group !== undefined
              ? String(patch.area_group)
              : zone.details.area_group,
          capacity_mode:
            'capacity_mode' in patch && patch.capacity_mode !== undefined
              ? String(patch.capacity_mode)
              : zone.details.capacity_mode,
        };

        return next;
      }),
    );
  }

  async function handleImport() {
    try {
      setLoading(true);

      if (draftZones.length === 0) {
        showToast({
          severity: 'warning',
          title: 'Nothing to import',
          message: `Parse ${mode === 'geojson' ? 'GeoJSON' : 'Point JSON'} first.`,
        });
        return;
      }

      const normalizedIds = draftZones.map((zone) => slugify(zone.id));
      const duplicateIds = normalizedIds.filter(
        (id, index) => normalizedIds.indexOf(id) !== index,
      );

      if (duplicateIds.length > 0) {
        showToast({
          severity: 'error',
          title: 'Duplicate IDs found',
          message: `Duplicate zone id(s) in this import: ${[...new Set(duplicateIds)].join(', ')}`,
        });
        return;
      }

      for (const zone of draftZones) {
        const normalizedId = slugify(zone.id);
        const result = await checkZoneIdExists(normalizedId);

        if (result.exists) {
          showToast({
            severity: 'error',
            title: 'Zone ID already exists',
            message: `A building with ID "${normalizedId}" already exists in the database.`,
          });
          return;
        }
      }

      const payload: ZoneImportPayload = {
        zones: draftZones.map((zone) => ({
          id: slugify(zone.id),
          name: zone.name,
          type: zone.type,
          polygon_geojson: zone.polygon_geojson,
          details: {
            display_name: zone.details.display_name,
            capacity: Number(zone.details.capacity || 0),
            description: zone.details.description,
            area_group: zone.details.area_group,
            capacity_mode: zone.details.capacity_mode,
          },
        })),
      };

      await importZones(payload);
      await onImported();

      showToast({
        severity: 'success',
        title: 'Buildings imported',
        message: `${draftZones.length} building zone(s) were imported successfully.`,
      });

      handleClose();
    } catch (err: any) {
      console.error(err);
      showToast({
        severity: 'error',
        title: 'Import failed',
        message: err?.response?.data?.message ?? 'Something went wrong while importing buildings.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          height: '88vh',
          maxHeight: '88vh',
          borderRadius: 2,
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          overflow: 'hidden',
          bgcolor: '#fff',
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2.25,
            borderBottom: '1px solid',
            borderColor: 'divider',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" fontWeight={800} color="text.primary">
                Add New Building
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Import zones using GeoJSON or generate them from point-capture JSON.
              </Typography>
            </Box>

            <IconButton onClick={handleClose}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </Box>

        <Box
          sx={{
            minHeight: 0,
            overflow: 'hidden',
            display: 'grid',
            gridTemplateRows: 'auto auto 1fr',
          }}
        >
          <Box sx={{ px: 3, pt: 2 }}>
            <Tabs
              value={mode}
              onChange={(_, value) => {
                setMode(value);
                setDraftZones([]);
              }}
              sx={{
                minHeight: 44,
                '& .MuiTab-root': {
                  minHeight: 44,
                  textTransform: 'none',
                  fontWeight: 700,
                },
              }}
            >
              <Tab
                value="geojson"
                icon={<MapRoundedIcon />}
                iconPosition="start"
                label="GeoJSON Import"
              />
              <Tab
                value="points"
                icon={<CodeRoundedIcon />}
                iconPosition="start"
                label="Point JSON Import"
              />
            </Tabs>
          </Box>

          <Box sx={{ px: 3, pt: 2 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  p: 1.75,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: '#FAFCFF',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <InfoOutlinedIcon fontSize="small" color="primary" />
                  <Typography fontWeight={700}>Step 1</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  Paste code or upload a file for the selected import mode.
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1.75,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: '#FAFCFF',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <AutoAwesomeRoundedIcon fontSize="small" color="primary" />
                  <Typography fontWeight={700}>Step 2</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  Click Parse JSON to generate editable building previews.
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1.75,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: '#FAFCFF',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <MapRoundedIcon fontSize="small" color="primary" />
                  <Typography fontWeight={700}>Step 3</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  Review fields on the right, then import the buildings.
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              minHeight: 0,
              overflow: 'hidden',
              px: 3,
              pb: 2,
              pt: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.02fr 0.98fr' },
              gap: 2.5,
            }}
          >
            <Box
              sx={{
                minHeight: 0,
                overflow: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2.5,
                bgcolor: '#FCFDFE',
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography fontWeight={700}>
                    {mode === 'geojson' ? 'Input GeoJSON' : 'Input Point JSON'}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    {helperText}
                  </Typography>
                </Box>

                <TextField
                  multiline
                  minRows={16}
                  placeholder={
                    mode === 'geojson'
                      ? 'Paste GeoJSON FeatureCollection here...'
                      : 'Paste point-capture JSON here...'
                  }
                  value={currentText}
                  onChange={(e) => {
                    if (mode === 'geojson') {
                      setGeoJsonText(e.target.value);
                    } else {
                      setPointJsonText(e.target.value);
                    }
                  }}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontFamily: 'monospace',
                      fontSize: 13,
                      alignItems: 'flex-start',
                    },
                  }}
                />

                <Stack direction="row" spacing={1.5}>
                  <Button variant="outlined" onClick={handleParse} sx={{ borderRadius: 2 }}>
                    Parse JSON
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<FileUploadRoundedIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ borderRadius: 2 }}
                  >
                    Upload File
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.geojson"
                    hidden
                    onChange={handleFileChange}
                  />
                </Stack>
              </Stack>
            </Box>

            <Box
              sx={{
                minHeight: 0,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: '#fff',
                display: 'grid',
                gridTemplateRows: 'auto auto 1fr',
              }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography fontWeight={700}>Preview & Review</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Generated building zones and editable metadata.
                </Typography>
              </Box>

              <Box
                sx={{
                  px: 2.5,
                  py: 1.75,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#FAFCFF',
                }}
              >
                <Stack direction="row" spacing={3}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Parsed items
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 0.5 }}>
                      {parsedCount}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Source mode
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, textTransform: 'capitalize' }}>
                      {mode}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Box sx={{ minHeight: 0, overflow: 'auto', p: 2.5 }}>
                {draftZones.length > 0 ? (
                  <Stack spacing={2}>
                    {draftZones.map((zone, index) => (
                      <Box
                        key={zone.internalKey}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          p: 2,
                          bgcolor: '#fff',
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ mb: 1.5 }}
                        >
                          <Typography fontWeight={700}>
                            Zone {index + 1}
                          </Typography>

                          {zone.sourceMode === 'points' && zone.pointCount ? (
                            <Typography variant="body2" color="text.secondary">
                              {zone.pointCount} points
                            </Typography>
                          ) : null}
                        </Stack>

                        <Stack spacing={1.5}>
                          <TextField
                            label="Zone ID"
                            value={zone.id}
                            onChange={(e) => updateDraftZone(index, { id: e.target.value })}
                            fullWidth
                            size="small"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                          <TextField
                            label="Name"
                            value={zone.name}
                            onChange={(e) => updateDraftZone(index, { name: e.target.value })}
                            fullWidth
                            size="small"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                          <TextField
                            label="Type"
                            value={zone.type}
                            onChange={(e) => updateDraftZone(index, { type: e.target.value })}
                            fullWidth
                            size="small"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />

                          <Divider />

                          <TextField
                            label="Display Name"
                            value={zone.details.display_name}
                            onChange={(e) => updateDraftZone(index, { display_name: e.target.value })}
                            fullWidth
                            size="small"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                          <TextField
                            label="Capacity"
                            type="number"
                            value={zone.details.capacity}
                            onChange={(e) =>
                              updateDraftZone(index, {
                                capacity: Number(e.target.value || 0),
                              })
                            }
                            fullWidth
                            size="small"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                          <TextField
                            label="Description"
                            value={zone.details.description}
                            onChange={(e) => updateDraftZone(index, { description: e.target.value })}
                            fullWidth
                            size="small"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                          <TextField
                            select
                            label="Area Group"
                            value={zone.details.area_group}
                            onChange={(e) => updateDraftZone(index, { area_group: e.target.value })}
                            fullWidth
                            size="small"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          >
                            <MenuItem value="common_space">common_space</MenuItem>
                            <MenuItem value="structured_space">structured_space</MenuItem>
                            <MenuItem value="study_food">study_food</MenuItem>
                          </TextField>
                          <TextField
                            select
                            label="Capacity Mode"
                            value={zone.details.capacity_mode}
                            onChange={(e) => updateDraftZone(index, { capacity_mode: e.target.value })}
                            fullWidth
                            size="small"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          >
                            <MenuItem value="open">open</MenuItem>
                            <MenuItem value="limited">limited</MenuItem>
                          </TextField>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Alert severity="info">
                    Parse {mode === 'geojson' ? 'GeoJSON' : 'Point JSON'} to generate a building preview here.
                  </Alert>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
          }}
        >
          <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
            <Button variant="outlined" onClick={handleClose} sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              {loading ? 'Importing...' : 'Import Buildings'}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Dialog>
  );
}