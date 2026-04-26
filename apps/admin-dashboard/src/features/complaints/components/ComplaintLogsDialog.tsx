import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  Stack,
  TextField,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getComplaintLogs } from '../../../services/complaints.service';
import { useToastStore } from '../../../store/useToastStore';

type ComplaintLogItem = {
  id: string;
  complaintId: string;
  anonId: string;
  title: string;
  actionType: string;
  actorUserId?: string | null;
  actorUsername?: string | null;
  actorEmail?: string | null;
  details?: Record<string, unknown>;
  createdAt: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function ComplaintLogsDialog({ open, onClose }: Props) {
  const [logs, setLogs] = useState<ComplaintLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const showToast = useToastStore((state) => state.showToast);

  async function loadLogs() {
    try {
      setLoading(true);
      const data = await getComplaintLogs({
        from: from || undefined,
        to: to || undefined,
      });
      setLogs(data ?? []);
    } catch (err) {
      console.error(err);
      showToast({
        severity: 'error',
        title: 'Logs unavailable',
        message: 'Unable to load complaint logs right now.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    loadLogs();
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '84vh',
          borderRadius: 2,
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr',
          overflow: 'hidden',
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
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: '#EFF6FF',
                  color: '#2563EB',
                }}
              >
                <ReceiptLongRoundedIcon fontSize="small" />
              </Box>

              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Complaint Logs
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  Append-only activity history for complaint administration.
                </Typography>
              </Box>
            </Stack>

            <IconButton onClick={onClose}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </Box>

        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              type="datetime-local"
              label="From"
              value={from}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />

            <TextField
              type="datetime-local"
              label="To"
              value={to}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />

            <Button
              variant="contained"
              onClick={loadLogs}
              sx={{ borderRadius: 1.5, minWidth: 140 }}
            >
              Apply Filter
            </Button>
          </Stack>
        </Box>

        <Box sx={{ minHeight: 0, overflow: 'auto', p: 3 }}>
          {loading ? (
            <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
              <CircularProgress />
            </Box>
          ) : logs.length === 0 ? (
            <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}>
              <Typography color="text.secondary">
                No complaint logs found for the selected time frame.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {logs.map((log) => (
                <Card
                  key={log.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 1.5,
                    borderColor: 'divider',
                  }}
                >
                  <CardContent>
                    <Stack spacing={1}>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Typography fontWeight={800}>
                          {log.actionType}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatDateTime(log.createdAt)}
                        </Typography>
                      </Stack>

                      <Typography>
                        <strong>Complaint:</strong> {log.title}
                      </Typography>
                      <Typography>
                        <strong>Anonymous ID:</strong> {log.anonId}
                      </Typography>
                      <Typography>
                        <strong>Actor Username:</strong> {log.actorUsername || '—'}
                      </Typography>
                      <Typography>
                        <strong>Actor Email:</strong> {log.actorEmail || '—'}
                      </Typography>

                      <Box
                        sx={{
                          mt: 0.5,
                          p: 1.25,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1.25,
                          bgcolor: '#FAFCFF',
                        }}
                      >
                        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                          Details
                        </Typography>
                        <Typography
                          component="pre"
                          sx={{
                            m: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: 12.5,
                            color: '#475569',
                            fontFamily: 'monospace',
                          }}
                        >
                          {JSON.stringify(log.details ?? {}, null, 2)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}