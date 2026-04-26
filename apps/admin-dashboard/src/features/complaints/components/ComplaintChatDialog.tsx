import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  Stack,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComplaintMessageAdmin } from '../../../types/complaints';
import {
  getComplaintMessages,
  sendComplaintMessage,
} from '../../../services/complaints.service';
import { useToastStore } from '../../../store/useToastStore';
import { api } from '../../../services/api';

type Props = {
  open: boolean;
  complaintId: string | null;
  onClose: () => void;
};

type AttachmentPreviewState = {
  open: boolean;
  url: string;
  name: string;
  mimeType?: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function isStudentMessage(message: ComplaintMessageAdmin) {
  return String(message.senderType || '').toUpperCase() === 'STUDENT';
}

function isAdminMessage(message: ComplaintMessageAdmin) {
  return String(message.senderType || '').toUpperCase() === 'ADMIN';
}

function getSenderLabel(message: ComplaintMessageAdmin) {
  if (message.senderLabel) return message.senderLabel;
  if (isStudentMessage(message)) return 'Student';
  if (isAdminMessage(message)) return 'Support Team';
  return message.senderType || 'Unknown';
}

function getAttachmentUrl(fileUrl?: string | null) {
  if (!fileUrl) return '#';

  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }

  const baseUrl = api.defaults.baseURL ?? window.location.origin;
  return new URL(fileUrl, baseUrl).toString();
}

function isImageMime(mimeType?: string | null) {
  return String(mimeType || '').toLowerCase().startsWith('image/');
}

function isPdfMime(mimeType?: string | null) {
  return String(mimeType || '').toLowerCase() === 'application/pdf';
}

function AttachmentCard({
  attachment,
  onPreview,
}: {
  attachment: {
    id: string;
    originalName: string;
    mimeType?: string;
    sizeBytes?: number;
    fileUrl?: string;
  };
  onPreview: (attachment: {
    id: string;
    originalName: string;
    mimeType?: string;
    sizeBytes?: number;
    fileUrl?: string;
  }) => void;
}) {
  const mimeType = attachment.mimeType || '';
  const isImage = isImageMime(mimeType);
  const isPdf = isPdfMime(mimeType);

  return (
    <Box
      sx={{
        mt: 1,
        p: 1.1,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: '#E6EBF2',
        bgcolor: '#FFFFFF',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.25,
            display: 'grid',
            placeItems: 'center',
            bgcolor: '#F8FAFC',
            color: '#64748B',
            flexShrink: 0,
          }}
        >
          {isImage ? (
            <ImageRoundedIcon sx={{ fontSize: 18 }} />
          ) : isPdf ? (
            <PictureAsPdfRoundedIcon sx={{ fontSize: 18 }} />
          ) : (
            <InsertDriveFileRoundedIcon sx={{ fontSize: 18 }} />
          )}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontWeight={700} sx={{ fontSize: 13.5 }}>
            {attachment.originalName}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {attachment.mimeType} {attachment.sizeBytes ? `• ${attachment.sizeBytes} bytes` : ''}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 0.9 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onPreview(attachment)}
              sx={{
                minWidth: 0,
                px: 1.2,
                py: 0.45,
                borderRadius: 1.25,
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Preview
            </Button>

            <Button
              size="small"
              variant="text"
              href={getAttachmentUrl(attachment.fileUrl)}
              target="_blank"
              rel="noreferrer"
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 15 }} />}
              sx={{
                minWidth: 0,
                px: 0.75,
                py: 0.45,
                borderRadius: 1.25,
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Open
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

function ChatBubble({
  message,
  onPreviewAttachment,
}: {
  message: ComplaintMessageAdmin;
  onPreviewAttachment: (attachment: {
    id: string;
    originalName: string;
    mimeType?: string;
    sizeBytes?: number;
    fileUrl?: string;
  }) => void;
}) {
  const student = isStudentMessage(message);
  const alignRight = !student;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: alignRight ? 'flex-end' : 'flex-start',
      }}
    >
      <Box
        sx={{
          maxWidth: { xs: '88%', md: '66%' },
          px: 1.4,
          py: 1.15,
          borderRadius: 1.5,
          bgcolor: student ? '#FFFFFF' : '#EAF4FF',
          border: '1px solid',
          borderColor: student ? '#E2E8F0' : '#CFE4FF',
          boxShadow: student
            ? '0 4px 12px rgba(15, 23, 42, 0.04)'
            : '0 6px 14px rgba(37, 99, 235, 0.06)',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.65 }}>
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: 1,
              display: 'grid',
              placeItems: 'center',
              bgcolor: student ? '#EEF2F7' : '#D8EAFE',
              color: student ? '#475569' : '#1D4ED8',
              flexShrink: 0,
            }}
          >
            {student ? (
              <PersonOutlineRoundedIcon sx={{ fontSize: 13 }} />
            ) : (
              <SupportAgentRoundedIcon sx={{ fontSize: 13 }} />
            )}
          </Box>

          <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>
            {getSenderLabel(message)}
          </Typography>
        </Stack>

        <Typography
          sx={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.55,
            color: '#0F172A',
            fontSize: 14,
          }}
        >
          {message.body}
        </Typography>

        {message.requestCounseling ? (
          <Chip
            label="Counseling Requested"
            size="small"
            sx={{
              mt: 1,
              borderRadius: 1,
              fontWeight: 700,
              bgcolor: '#F3E8FF',
              color: '#7E22CE',
            }}
          />
        ) : null}

        {message.attachments?.length ? (
          <Box sx={{ mt: 0.15 }}>
            {message.attachments.map((attachment) => (
              <AttachmentCard
                key={attachment.id}
                attachment={attachment}
                onPreview={onPreviewAttachment}
              />
            ))}
          </Box>
        ) : null}

        <Typography
          sx={{
            mt: 0.85,
            fontSize: 11.5,
            color: '#64748B',
            textAlign: 'right',
          }}
        >
          {formatDateTime(message.createdAt)}
        </Typography>
      </Box>
    </Box>
  );
}

export function ComplaintChatDialog({ open, complaintId, onClose }: Props) {
  const [messages, setMessages] = useState<ComplaintMessageAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [hasShownError, setHasShownError] = useState(false);
  const [preview, setPreview] = useState<AttachmentPreviewState>({
    open: false,
    url: '',
    name: '',
    mimeType: '',
  });

  const showToast = useToastStore((state) => state.showToast);
  const threadRef = useRef<HTMLDivElement | null>(null);

  async function loadMessages(silent = false) {
    if (!complaintId) return;

    try {
      if (!silent) setLoading(true);

      const data = await getComplaintMessages(complaintId);
      setMessages(Array.isArray(data) ? data : []);
      setHasShownError(false);
    } catch (err) {
      console.error(err);

      if (!silent && !hasShownError) {
        showToast({
          severity: 'error',
          title: 'Chat unavailable',
          message: 'Unable to load chat messages for this complaint.',
        });
        setHasShownError(true);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function handleSend() {
    if (!complaintId || !draft.trim()) return;

    try {
      setSending(true);

      await sendComplaintMessage(complaintId, {
        body: draft.trim(),
        senderLabel: 'Support Team',
        requestCounseling: false,
      });

      setDraft('');
      await loadMessages(true);

      showToast({
        severity: 'success',
        title: 'Message sent',
        message: 'Your reply was sent successfully.',
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        severity: 'error',
        title: 'Send failed',
        message: err?.response?.data?.message ?? 'Unable to send the message.',
      });
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!open || !complaintId) return;

    loadMessages();

    const interval = window.setInterval(() => {
      loadMessages(true);
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [open, complaintId]);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages.length]);

  const subtitle = useMemo(() => {
    if (!complaintId) return 'Live complaint conversation';
    return `Live complaint conversation • Case ${complaintId}`;
  }, [complaintId]);

  const canPreviewInline =
    isImageMime(preview.mimeType) || isPdfMime(preview.mimeType);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '88vh',
            borderRadius: 2,
            overflow: 'hidden',
          },
        }}
      >
        <Box
          sx={{
            height: '100%',
            display: 'grid',
            gridTemplateRows: 'auto auto 1fr auto',
            bgcolor: '#FFFFFF',
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
                    width: 42,
                    height: 42,
                    borderRadius: 1.25,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: '#EEF4FF',
                    color: '#2563EB',
                  }}
                >
                  <ChatRoundedIcon fontSize="small" />
                </Box>

                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Complaint Chat
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2 }}>
                    {subtitle}
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
              py: 1.15,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: '#FFFFFF',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                p: 1.05,
                borderRadius: 1.25,
                bgcolor: '#EEF4FF',
                border: '1px solid',
                borderColor: '#D9E8FF',
              }}
            >
              <ShieldOutlinedIcon sx={{ fontSize: 16, color: '#1D4ED8', mt: '2px' }} />
              <Typography
                sx={{
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: '#1E40AF',
                  fontWeight: 600,
                }}
              >
                This chat only shows conversation content. Personal identity details should remain hidden.
              </Typography>
            </Box>
          </Box>

          <Box
            ref={threadRef}
            sx={{
              minHeight: 0,
              overflow: 'auto',
              px: 3,
              py: 2,
              bgcolor: '#F7F9FC',
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.08) 1px, transparent 0)',
              backgroundSize: '18px 18px',
            }}
          >
            {loading ? (
              <Box sx={{ py: 10, display: 'grid', placeItems: 'center' }}>
                <CircularProgress />
              </Box>
            ) : messages.length === 0 ? (
              <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
                <Typography color="text.secondary">
                  No chat messages found for this complaint.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.4}>
                {messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    message={message}
                    onPreviewAttachment={(attachment) =>
                      setPreview({
                        open: true,
                        url: getAttachmentUrl(attachment.fileUrl),
                        name: attachment.originalName,
                        mimeType: attachment.mimeType,
                      })
                    }
                  />
                ))}
              </Stack>
            )}
          </Box>

          <Box
            sx={{
              px: 3,
              py: 1.35,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: '#FFFFFF',
            }}
          >
            <Stack spacing={1}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.1}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <TextField
                  fullWidth
                  multiline
                  minRows={1}
                  maxRows={4}
                  placeholder="Write a support reply..."
                  value={draft}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      bgcolor: '#F8FAFC',
                    },
                    '& textarea': {
                      paddingTop: '10px',
                      paddingBottom: '10px',
                    },
                  }}
                />

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshRoundedIcon />}
                    onClick={() => loadMessages()}
                    sx={{ borderRadius: 1.25, minWidth: 112, height: 44 }}
                  >
                    Refresh
                  </Button>

                  <Button
                    variant="contained"
                    endIcon={<SendRoundedIcon />}
                    onClick={() => void handleSend()}
                    disabled={sending || !draft.trim()}
                    sx={{
                      borderRadius: 1.25,
                      minWidth: 110,
                      height: 44,
                    }}
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                </Stack>
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Auto-refreshes every 4 seconds
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={preview.open}
        onClose={() =>
          setPreview({
            open: false,
            url: '',
            name: '',
            mimeType: '',
          })
        }
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '82vh',
            borderRadius: 2,
            overflow: 'hidden',
          },
        }}
      >
        <Box
          sx={{
            height: '100%',
            display: 'grid',
            gridTemplateRows: 'auto 1fr',
            bgcolor: '#FFFFFF',
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <AttachFileRoundedIcon sx={{ fontSize: 18, color: '#64748B' }} />
              <Typography fontWeight={700}>{preview.name}</Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                href={preview.url}
                target="_blank"
                rel="noreferrer"
                endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 15 }} />}
                sx={{ borderRadius: 1.25, textTransform: 'none' }}
              >
                Open in new tab
              </Button>
              <IconButton
                onClick={() =>
                  setPreview({
                    open: false,
                    url: '',
                    name: '',
                    mimeType: '',
                  })
                }
              >
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
          </Box>

          <Box
            sx={{
              minHeight: 0,
              overflow: 'auto',
              bgcolor: '#F8FAFC',
              display: 'grid',
              placeItems: 'center',
              p: 2,
            }}
          >
            {canPreviewInline ? (
              isImageMime(preview.mimeType) ? (
                <Box
                  component="img"
                  src={preview.url}
                  alt={preview.name}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: 1.5,
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                    bgcolor: '#fff',
                  }}
                />
              ) : (
                <Box
                  component="iframe"
                  src={preview.url}
                  title={preview.name}
                  sx={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 1.5,
                    bgcolor: '#fff',
                  }}
                />
              )
            ) : (
              <Stack spacing={2} alignItems="center">
                <InsertDriveFileRoundedIcon sx={{ fontSize: 52, color: '#64748B' }} />
                <Typography color="text.secondary">
                  Preview is not available for this file type.
                </Typography>
                <Button
                  variant="contained"
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer"
                  endIcon={<OpenInNewRoundedIcon />}
                  sx={{ borderRadius: 1.25 }}
                >
                  Open file
                </Button>
              </Stack>
            )}
          </Box>
        </Box>
      </Dialog>
    </>
  );
}