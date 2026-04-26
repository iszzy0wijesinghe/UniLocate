/** @format */

import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Box,
  Button,
  Dialog,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { api } from "../../../services/api";
import {
  getAdminAuthUser,
  setAdminAuthUser,
} from "../../../store/adminAuthStorage";
import { useToastStore } from "../../../store/useToastStore";

type Props = {
  open: boolean;
};

function getPasswordChecks(password: string) {
  return {
    min: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function ForcePasswordResetDialog({ open }: Props) {
  const currentUser = getAdminAuthUser();
  const showToast = useToastStore((state) => state.showToast);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordChecks = getPasswordChecks(newPassword);
  const passwordsMatch =
    confirmPassword.trim().length > 0 && newPassword === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!currentUser?.id) {
      setError("Missing admin user.");
      return;
    }

    if (
      !passwordChecks.min ||
      !passwordChecks.upper ||
      !passwordChecks.lower ||
      !passwordChecks.number ||
      !passwordChecks.special
    ) {
      setError("Password does not meet the required rules.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await api.patch(
        `/admin/users/${encodeURIComponent(currentUser.id)}/reset-password`,
        {
          newPassword,
          confirmPassword,
        },
      );

      const refreshedUser = {
        ...currentUser,
        mustChangePassword: false,
        passwordChangedAt: new Date().toISOString(),
      };

      setAdminAuthUser(refreshedUser);

      showToast({
        severity: "success",
        title: "Password updated",
        message: "Your password has been changed successfully.",
      });

      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ?? "Unable to update password right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  function Rule({ ok, text }: { ok: boolean; text: string }) {
    return (
      <Typography
        variant="body2"
        sx={{
          color: ok ? "#027A48" : "#64748B",
          fontWeight: ok ? 700 : 500,
        }}
      >
        {ok ? "✓" : "•"} {text}
      </Typography>
    );
  }

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1.5,
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          bgcolor: "#fff",
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
          }}
        >
          <Typography variant="h6" fontWeight={900}>
            Change your password
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            This is your first login. You must change the temporary password
            before continuing.
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          <Stack
            spacing={2.25}
            component="form"
            id="force-password-reset-form"
            onSubmit={handleSubmit}
          >
            {error ? <Alert severity="error">{error}</Alert> : null}

            <TextField
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      edge="end"
                    >
                      {showNewPassword ? (
                        <VisibilityOffRoundedIcon />
                      ) : (
                        <VisibilityRoundedIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Confirm New Password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      edge="end"
                    >
                      {showConfirmPassword ? (
                        <VisibilityOffRoundedIcon />
                      ) : (
                        <VisibilityRoundedIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.25,
                p: 2,
                bgcolor: "#FAFCFF",
              }}
            >
              <Typography fontWeight={900} sx={{ mb: 1.2 }}>
                Password requirements
              </Typography>

              <Stack spacing={0.75}>
                <Rule ok={passwordChecks.min} text="At least 8 characters" />
                <Rule
                  ok={passwordChecks.upper}
                  text="At least one uppercase letter"
                />
                <Rule
                  ok={passwordChecks.lower}
                  text="At least one lowercase letter"
                />
                <Rule ok={passwordChecks.number} text="At least one number" />
                <Rule
                  ok={passwordChecks.special}
                  text="At least one special character"
                />
                <Rule ok={passwordsMatch} text="Passwords match" />
              </Stack>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "#fff",
          }}
        >
          <Stack direction="row" justifyContent="flex-end">
            <Button
              type="submit"
              form="force-password-reset-form"
              variant="contained"
              startIcon={<LockResetRoundedIcon />}
              disabled={loading}
              sx={{ borderRadius: 1.25 }}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Dialog>
  );
}