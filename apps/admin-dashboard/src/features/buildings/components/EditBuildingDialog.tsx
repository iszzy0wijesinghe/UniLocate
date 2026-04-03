import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {
  Alert,
  Box,
  Button,
  Dialog,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { updateZoneDetails } from '../../../services/buildings.service';
import type { BuildingRow } from '../../../types/buildings';

type Props = {
  open: boolean;
  building: BuildingRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export function EditBuildingDialog({
  open,
  building,
  onClose,
  onSaved,
}: Props) {
  const [areaGroup, setAreaGroup] = useState('common_space');
  const [capacity, setCapacity] = useState(0);
  const [capacityMode, setCapacityMode] = useState('open');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!building) return;

    setAreaGroup(building.area_group || 'common_space');
    setCapacity(Number(building.capacity || 0));
    setCapacityMode(building.capacity_mode || 'open');
    setDescription(building.description || '');
    setError(null);
  }, [building]);

  async function handleSave() {
    if (!building) return;

    try {
      setLoading(true);
      setError(null);

      await updateZoneDetails(building.id, {
        area_group: areaGroup,
        capacity,
        capacity_mode: capacityMode,
        description,
      });

      await onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message ?? 'Failed to update building.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Edit Building
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Update editable building metadata.
              </Typography>
            </Box>

            <IconButton onClick={onClose}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={2}>
            <TextField
              label="Zone ID"
              value={building?.id ?? ''}
              disabled
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              label="Display Name"
              value={building?.display_name ?? ''}
              disabled
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              select
              label="Area Group"
              value={areaGroup}
              onChange={(e) => setAreaGroup(e.target.value)}
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="common_space">common_space</MenuItem>
              <MenuItem value="structured_space">structured_space</MenuItem>
              <MenuItem value="study_food">study_food</MenuItem>
            </TextField>

            <TextField
              label="Capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value || 0))}
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              select
              label="Capacity Mode"
              value={capacityMode}
              onChange={(e) => setCapacityMode(e.target.value)}
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="open">open</MenuItem>
              <MenuItem value="limited">limited</MenuItem>
            </TextField>

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              minRows={4}
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
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
            <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Dialog>
  );
}