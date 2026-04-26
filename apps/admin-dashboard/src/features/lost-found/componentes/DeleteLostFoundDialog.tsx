import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Box,
  Button,
  Dialog,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';

type Props = {
  open: boolean;
  postTitle: string | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export function DeleteLostFoundDialog({
  open,
  postTitle,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
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
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7F3 100%)',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: '#FFF4E5',
                  color: '#D97706',
                }}
              >
                <WarningAmberRoundedIcon />
              </Box>

              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Delete Post
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  This action cannot be undone.
                </Typography>
              </Box>
            </Stack>

            <IconButton onClick={onClose} disabled={loading}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ px: 3, py: 2.5 }}>
          <Typography color="text.secondary">
            Are you sure you want to delete this lost &amp; found post?
          </Typography>

          <Box
            sx={{
              mt: 2,
              p: 1.75,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              bgcolor: '#FAFCFF',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Post
            </Typography>
            <Typography fontWeight={700} sx={{ mt: 0.5 }}>
              {postTitle || '—'}
            </Typography>
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
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={loading}
              sx={{ borderRadius: 1.5 }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteOutlineRoundedIcon />}
              onClick={onConfirm}
              disabled={loading}
              sx={{ borderRadius: 1.5 }}
            >
              {loading ? 'Deleting...' : 'Delete Post'}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Dialog>
  );
}