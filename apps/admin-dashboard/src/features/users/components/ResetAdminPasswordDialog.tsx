/** @format */

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Box,
  Button,
  Dialog,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { api } from "../../../services/api";
import { useToastStore } from "../../../store/useToastStore";

type AdminUserRow = {
  id: string;
  fullName: string;
};

type Props = {
  open: boolean;
  user: AdminUserRow | null;
  onClose: () => void;
};

export function ResetAdminPasswordDialog({ open, user, onClose }: Props) {
  const showToast = useToastStore((state) => state.showToast);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!user) return;

    try {
      setLoading(true);

      await api.patch(`/admin/users/${encodeURIComponent(user.id)}/reset-password`, {
        newPassword,
        confirmPassword,
      });

      showToast({
        severity: "success",
        title: "Password reset",
        message: `Password was reset for ${user.fullName}.`,
      });

      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast({
        severity: "error",
        title: "Reset failed",
        message:
          err?.response?.data?.message ??
          "Unable to reset this password right now.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1.5,
          overflow: "hidden",
        },
      }}
    >
      <Box>
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Reset Password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set a new password for {user?.fullName || "this user"}.
              </Typography>
            </Box>

            <IconButton onClick={onClose} disabled={loading}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ px: 2.5, py: 2.5 }}>
          <Stack spacing={2}>
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
            />

            <TextField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
            />
          </Stack>
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
              onClick={handleReset}
              disabled={loading}
              sx={{ borderRadius: 1.25 }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Dialog>
  );
}