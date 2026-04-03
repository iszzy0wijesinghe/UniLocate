import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  Divider,
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
import { useToastStore } from '../store/useToastStore';
import {
  deleteLostFoundPost,
  getLostFoundPostById,
  getLostFoundPosts,
} from '../services/lostFound.service';
import type { LostFoundPost, LostFoundPostDetail } from '../types/lost-found';
import { DeleteLostFoundDialog } from '../features/lost-found/componentes/DeleteLostFoundDialog';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getTypeChip(type: string) {
  return (
    <Chip
      label={type === 'lost' ? 'Lost' : 'Found'}
      size="small"
      sx={{
        borderRadius: 1.25,
        fontWeight: 700,
        bgcolor: type === 'lost' ? '#FEF2F2' : '#EFF6FF',
        color: type === 'lost' ? '#B91C1C' : '#1D4ED8',
      }}
    />
  );
}

function getStatusChip(status: string, isFound: boolean) {
  const resolved = String(status || '').toLowerCase() === 'resolved' || isFound;

  return (
    <Chip
      label={resolved ? 'Found' : 'Still Not Found'}
      size="small"
      sx={{
        borderRadius: 1.25,
        fontWeight: 700,
        bgcolor: resolved ? '#ECFDF3' : '#FFF7ED',
        color: resolved ? '#027A48' : '#C2410C',
      }}
    />
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Box
      sx={{
        py: 6,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Typography color="text.secondary">{text}</Typography>
    </Box>
  );
}

export function LostFoundPage() {
  const [rows, setRows] = useState<LostFoundPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<LostFoundPostDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [deletingPost, setDeletingPost] = useState<LostFoundPost | null>(null);

  const showToast = useToastStore((state) => state.showToast);

  async function loadPosts() {
    try {
      setLoading(true);
      const data = await getLostFoundPosts();
      setRows(data ?? []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load Lost & Found data.');
      showToast({
        severity: 'error',
        title: 'Load failed',
        message: 'Unable to load lost and found posts right now.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function openDetails(id: string) {
    try {
      setSelectedPostId(id);
      setDetailsLoading(true);
      const data = await getLostFoundPostById(id);
      setSelectedPost(data);
    } catch (err) {
      console.error(err);
      showToast({
        severity: 'error',
        title: 'Details unavailable',
        message: 'Unable to load the selected post details.',
      });
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingPost) return;

    try {
      setActionLoading(true);
      await deleteLostFoundPost(deletingPost.id);
      await loadPosts();

      if (selectedPostId === deletingPost.id) {
        setSelectedPostId(null);
        setSelectedPost(null);
      }

      showToast({
        severity: 'success',
        title: 'Post deleted',
        message: 'The lost and found post was deleted successfully.',
      });

      setDeletingPost(null);
    } catch (err: any) {
      console.error(err);
      showToast({
        severity: 'error',
        title: 'Delete failed',
        message:
          err?.response?.data?.message ??
          'Unable to delete the selected post.',
      });
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.title?.toLowerCase().includes(q) ||
        row.category?.toLowerCase().includes(q) ||
        row.id?.toLowerCase().includes(q) ||
        row.ownerUsername?.toLowerCase().includes(q) ||
        row.description?.toLowerCase().includes(q);

      const matchesType = typeFilter === 'all' || row.type === typeFilter;

      const computedStatus =
        row.status?.toLowerCase() === 'resolved' || row.isFound ? 'found' : 'not_found';

      const matchesStatus =
        statusFilter === 'all' || computedStatus === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [rows, search, typeFilter, statusFilter]);

  const totalPosts = rows.length;
  const lostPosts = rows.filter((row) => row.type === 'lost').length;
  const foundPosts = rows.filter(
    (row) => row.status?.toLowerCase() === 'resolved' || row.isFound,
  ).length;
  const notFoundPosts = totalPosts - foundPosts;

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
          title="Lost & Found Management"
          subtitle="Track recovery activity, moderate posts, and review post history."
          action={
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={loadPosts}
              sx={{ borderRadius: 1.5 }}
            >
              Refresh
            </Button>
          }
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              xl: 'repeat(4, 1fr)',
            },
            gap: 2,
          }}
        >
          <StatCard label="Total Posts" value={totalPosts} icon={<Inventory2RoundedIcon />} />
          <StatCard label="Lost Reports" value={lostPosts} icon={<ReportProblemRoundedIcon />} />
          <StatCard label="Found Posts" value={foundPosts} icon={<TaskAltRoundedIcon />} />
          <StatCard label="Still Not Found" value={notFoundPosts} icon={<TaskAltRoundedIcon />} />
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
                label="Search by title, category, user, description or ID"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                  },
                }}
              />

              <TextField
                select
                label="Filter by type"
                value={typeFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypeFilter(e.target.value)}
                sx={{
                  minWidth: 220,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                  },
                }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="lost">lost</MenuItem>
                <MenuItem value="found">found</MenuItem>
              </TextField>

              <TextField
                select
                label="Filter by status"
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusFilter(e.target.value)}
                sx={{
                  minWidth: 220,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                  },
                }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="found">Found</MenuItem>
                <MenuItem value="not_found">Still Not Found</MenuItem>
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
              ) : filteredRows.length === 0 ? (
                <EmptyState text="No lost and found posts match the current filters." />
              ) : (
                <Box sx={{ height: '100%', overflow: 'auto' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Post</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell><strong>Category</strong></TableCell>
                        <TableCell><strong>Owner</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Images</strong></TableCell>
                        <TableCell><strong>Created</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ minWidth: 260 }}>
                            <Stack spacing={0.35}>
                              <Typography fontWeight={700}>{row.title}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {row.description || 'No description'}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell>{getTypeChip(row.type)}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell>{row.ownerUsername || 'Anonymous / N/A'}</TableCell>
                          <TableCell>{getStatusChip(row.status, row.isFound)}</TableCell>
                          <TableCell>{row.images?.length ?? 0}</TableCell>
                          <TableCell>{formatDateTime(row.createdAt)}</TableCell>

                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <IconButton
                                size="small"
                                onClick={() => openDetails(row.id)}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: 1.5,
                                }}
                              >
                                <VisibilityRoundedIcon fontSize="small" />
                              </IconButton>

                              <IconButton
                                size="small"
                                onClick={() => setDeletingPost(row)}
                                disabled={actionLoading}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: 1.5,
                                }}
                              >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={Boolean(selectedPostId)}
        onClose={() => {
          setSelectedPostId(null);
          setSelectedPost(null);
        }}
        maxWidth="md"
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
            maxHeight: '82vh',
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
                  Post History
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Review post information only.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ minHeight: 0, overflow: 'auto', p: 3 }}>
            {detailsLoading ? (
              <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
                <CircularProgress />
              </Box>
            ) : !selectedPost ? (
              <EmptyState text="No post selected." />
            ) : (
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography variant="h6" fontWeight={800}>
                      {selectedPost.title}
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {getTypeChip(selectedPost.type)}
                      {getStatusChip(selectedPost.status, selectedPost.isFound)}
                    </Stack>

                    <Divider />

                    <Typography><strong>Post ID:</strong> {selectedPost.id}</Typography>
                    <Typography><strong>Category:</strong> {selectedPost.category}</Typography>
                    <Typography><strong>Owner:</strong> {selectedPost.ownerUsername || 'Anonymous / N/A'}</Typography>
                    <Typography><strong>Created:</strong> {formatDateTime(selectedPost.createdAt)}</Typography>
                    <Typography><strong>Updated:</strong> {formatDateTime(selectedPost.updatedAt)}</Typography>
                    <Typography><strong>Time Hint:</strong> {selectedPost.timeHint || '—'}</Typography>
                    <Typography><strong>Image Count:</strong> {selectedPost.images?.length ?? 0}</Typography>
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                      <strong>Description:</strong> {selectedPost.description || '—'}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            )}
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
              {selectedPost ? (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setDeletingPost(selectedPost)}
                  disabled={actionLoading}
                  sx={{ borderRadius: 1.5 }}
                >
                  Delete
                </Button>
              ) : null}

              <Button
                variant="outlined"
                onClick={() => {
                  setSelectedPostId(null);
                  setSelectedPost(null);
                }}
                sx={{ borderRadius: 1.5 }}
              >
                Close
              </Button>
            </Stack>
          </Box>
        </Box>
      </Dialog>

      <DeleteLostFoundDialog
        open={Boolean(deletingPost)}
        postTitle={deletingPost?.title ?? null}
        loading={actionLoading}
        onClose={() => setDeletingPost(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}