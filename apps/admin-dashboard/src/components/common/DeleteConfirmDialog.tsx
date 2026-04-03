/** @format */

import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Box,
  Button,
  Dialog,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

export function DeleteConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onClose,
  onConfirm,
  loading = false,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1.5,
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ p: 0 }}>
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            background: "linear-gradient(180deg, #FFFFFF 0%, #FFF8F8 100%)",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "#FEF2F2",
                  color: "#B91C1C",
                }}
              >
                <WarningAmberRoundedIcon fontSize="small" />
              </Box>

              <Typography variant="h6" fontWeight={800}>
                {title}
              </Typography>
            </Stack>

            <IconButton onClick={onClose} disabled={loading}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ px: 2.5, py: 2.5 }}>
          <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {message}
          </Typography>
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "#fff",
          }}
        >
          <Stack direction="row" spacing={1.25} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={loading}
              sx={{ borderRadius: 1.25 }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={onConfirm}
              disabled={loading}
              sx={{
                borderRadius: 1.25,
                bgcolor: "#B91C1C",
                "&:hover": { bgcolor: "#991B1B" },
              }}
            >
              {confirmLabel}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Dialog>
  );
}