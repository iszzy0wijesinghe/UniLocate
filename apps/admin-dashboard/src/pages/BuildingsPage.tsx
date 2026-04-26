import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { StatusChip } from '../components/common/StatusChip';
import {
  deleteZone,
  getBuildingsOccupancy,
} from '../services/buildings.service';
import type { BuildingRow } from '../types/buildings';
import { AddBuildingModal } from '../features/buildings/components/AddBuildingModal';
import { EditBuildingDialog } from '../features/buildings/components/EditBuildingDialog';
import { DeleteBuildingDialog } from '../features/buildings/components/DeleteBuildingDialog';
import { useToastStore } from '../store/useToastStore';

export function BuildingsPage() {
  const [rows, setRows] = useState<BuildingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openAdd, setOpenAdd] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<BuildingRow | null>(null);
  const [deletingBuilding, setDeletingBuilding] = useState<BuildingRow | null>(null);

  const showToast = useToastStore((state) => state.showToast);

  async function loadBuildings() {
    try {
      setLoading(true);
      const data = await getBuildingsOccupancy();
      setRows(data ?? []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load buildings.');
      showToast({
        severity: 'error',
        title: 'Load failed',
        message: 'Unable to load building data right now.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBuildings();
  }, []);

  async function handleConfirmDelete() {
    if (!deletingBuilding) return;

    try {
      setDeleteLoading(true);
      await deleteZone(deletingBuilding.id);
      await loadBuildings();

      showToast({
        severity: 'success',
        title: 'Building deleted',
        message: `Building zone "${deletingBuilding.id}" was deleted successfully.`,
      });

      setDeletingBuilding(null);
    } catch (err: any) {
      console.error(err);
      showToast({
        severity: 'error',
        title: 'Delete failed',
        message:
          err?.response?.data?.message ??
          `Unable to delete building zone "${deletingBuilding.id}".`,
      });
    } finally {
      setDeleteLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const q = search.trim().toLowerCase();

      const matchesSearch =
        !q ||
        row.display_name?.toLowerCase().includes(q) ||
        row.id?.toLowerCase().includes(q) ||
        row.name?.toLowerCase().includes(q);

      const matchesType = typeFilter === 'all' || row.area_group === typeFilter;
      const matchesStatus =
        statusFilter === 'all' || row.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [rows, search, typeFilter, statusFilter]);

  const totalBuildings = rows.length;
  const overcrowded = rows.filter((r) => r.status === 'Crowded').length;
  const warning = rows.filter((r) => r.status === 'Almost Full').length;

  return (
    <>
      <Box
        sx={{
          height: '100%',
          minHeight: 0,
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr',
          gap: 2,
          overflow: 'hidden',
          pt: 2,
        }}
      >
        <PageHeader
          title="Building Management"
          subtitle="Manage campus buildings, live occupancy, metadata, and zone imports."
          action={
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={loadBuildings}
                sx={{ borderRadius: 2 }}
              >
                Refresh
              </Button>

              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => setOpenAdd(true)}
                sx={{ borderRadius: 2 }}
              >
                Add Building
              </Button>
            </Stack>
          }
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <StatCard label="Total Buildings" value={totalBuildings} />
          <StatCard
            label="Overcrowded Buildings"
            value={overcrowded}
            helper="90%+ usage"
          />
          <StatCard
            label="Warning Buildings"
            value={warning}
            helper="80% to 89%"
          />
        </Box>

        <Card
          sx={{
            minHeight: 0,
            height: '100%',
            borderRadius: 1.9,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
          }}
        >
          <CardContent
            sx={{
              height: '100%',
              minHeight: 0,
              display: 'grid',
              gridTemplateRows: 'auto 1fr',
              gap: 2,
              p: 2.5,
              '&:last-child': { pb: 2.5 },
            }}
          >
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Search building by name / code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              <TextField
                select
                label="Filter by type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                sx={{
                  minWidth: 220,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="common_space">common_space</MenuItem>
                <MenuItem value="structured_space">structured_space</MenuItem>
                <MenuItem value="study_food">study_food</MenuItem>
              </TextField>

              <TextField
                select
                label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{
                  minWidth: 220,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="Free">Free</MenuItem>
                <MenuItem value="Available">Available</MenuItem>
                <MenuItem value="Almost Full">Almost Full</MenuItem>
                <MenuItem value="Crowded">Crowded</MenuItem>
                <MenuItem value="Unknown">Unknown</MenuItem>
              </TextField>
            </Stack>

            <Box
              sx={{
                minHeight: 0,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: '#fff',
              }}
            >
              {loading ? (
                <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Box sx={{ p: 2 }}>
                  <Alert severity="error">{error}</Alert>
                </Box>
              ) : (
                <Box sx={{ height: '100%', overflow: 'auto' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Building</strong></TableCell>
                        <TableCell><strong>Zone ID</strong></TableCell>
                        <TableCell><strong>Area Group</strong></TableCell>
                        <TableCell><strong>Capacity</strong></TableCell>
                        <TableCell><strong>Current Count</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Capacity Mode</strong></TableCell>
                        <TableCell><strong>Description</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Stack spacing={0.25}>
                              <Typography fontWeight={700}>
                                {row.display_name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {row.name}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell>{row.id}</TableCell>
                          <TableCell>{row.area_group}</TableCell>
                          <TableCell>{row.capacity}</TableCell>
                          <TableCell>{row.current_count}</TableCell>

                          <TableCell>
                            <StatusChip status={row.status} />
                          </TableCell>

                          <TableCell>{row.capacity_mode}</TableCell>

                          <TableCell sx={{ maxWidth: 320 }}>
                            <Typography variant="body2" color="text.secondary">
                              {row.description || '—'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <IconButton
                                size="small"
                                onClick={() => setEditingBuilding(row)}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: 2,
                                }}
                              >
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>

                              <IconButton
                                size="small"
                                onClick={() => setDeletingBuilding(row)}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: 2,
                                }}
                              >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}

                      {filteredRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9}>
                            <Typography
                              color="text.secondary"
                              sx={{ py: 3, textAlign: 'center' }}
                            >
                              No buildings found for the current filters.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <AddBuildingModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onImported={async () => {
          await loadBuildings();
        }}
      />

      <EditBuildingDialog
        open={Boolean(editingBuilding)}
        building={editingBuilding}
        onClose={() => setEditingBuilding(null)}
        onSaved={async () => {
          await loadBuildings();
          showToast({
            severity: 'success',
            title: 'Building updated',
            message: 'Building details were updated successfully.',
          });
        }}
      />

      <DeleteBuildingDialog
        open={Boolean(deletingBuilding)}
        buildingId={deletingBuilding?.id ?? null}
        loading={deleteLoading}
        onClose={() => setDeletingBuilding(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}