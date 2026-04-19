/** @format */

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Box,
  Button,
  Dialog,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { registerAdminUser } from "../../../services/admin-auth.service";
import { useToastStore } from "../../../store/useToastStore";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

type RegisterForm = {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  roleKey: string;
};

function buildPreviewEmail(firstName: string, lastName: string) {
  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "");

  const first = normalize(firstName);
  const last = normalize(lastName);

  if (!first || !last) return "firstname.lastname@unilocateadmin.com";
  return `${first}.${last}@unilocateadmin.com`;
}

function getPasswordChecks(password: string) {
  return {
    min: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function sanitizeNameInput(value: string) {
  return value.replace(/[^A-Za-z ]/g, "").replace(/\s{2,}/g, " ");
}

function isValidName(value: string) {
  return /^[A-Za-z ]+$/.test(value.trim());
}

export function AddAdminUserDialog({ open, onClose, onCreated }: Props) {
  const showToast = useToastStore((state) => state.showToast);

  const [form, setForm] = useState<RegisterForm>({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    roleKey: "COMPLAINT_ADMIN",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const previewEmail = useMemo(
    () => buildPreviewEmail(form.firstName, form.lastName),
    [form.firstName, form.lastName],
  );

  const passwordChecks = useMemo(
    () => getPasswordChecks(form.password),
    [form.password],
  );

  const passwordsMatch =
    !!form.confirmPassword && form.password === form.confirmPassword;

  function updateField<K extends keyof RegisterForm>(
    key: K,
    value: RegisterForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetState() {
    setForm({
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
      roleKey: "COMPLAINT_ADMIN",
    });
    setError(null);
    setLoading(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();

    if (!firstName || !lastName) {
      setError("First name and last name are required.");
      return;
    }

    if (!isValidName(firstName) || !isValidName(lastName)) {
      setError(
        "First name and last name can contain letters and spaces only.",
      );
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

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const created = await registerAdminUser({
        firstName,
        lastName,
        password: form.password,
        confirmPassword: form.confirmPassword,
        roleKey: form.roleKey,
      });

      showToast({
        severity: "success",
        title: "Admin user created",
        message: `Login email: ${created.email}`,
      });

      await onCreated();
      handleClose();
    } catch (err: any) {
      console.error(err);

      const message =
        err?.response?.data?.message ?? "Unable to create admin user.";
      setError(message);

      showToast({
        severity: "error",
        title: "Creation failed",
        message,
      });
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
      onClose={handleClose}
      maxWidth="md"
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
          maxHeight: "88vh",
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
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography variant="h6" fontWeight={900}>
                Add Admin User
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Create a new role-based admin account for the UniLocate
                dashboard.
              </Typography>
            </Box>

            <IconButton onClick={handleClose}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ p: 3, overflow: "auto" }}>
          <Stack
            spacing={2.25}
            component="form"
            id="add-admin-user-form"
            onSubmit={handleSubmit}
          >
            {error ? <Alert severity="error">{error}</Alert> : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="First Name"
                value={form.firstName}
                onChange={(e) =>
                  updateField("firstName", sanitizeNameInput(e.target.value))
                }
                fullWidth
                required
                helperText="Letters and spaces only"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
              />

              <TextField
                label="Last Name"
                value={form.lastName}
                onChange={(e) =>
                  updateField("lastName", sanitizeNameInput(e.target.value))
                }
                fullWidth
                required
                helperText="Letters and spaces only"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
              />
            </Stack>

            <TextField
              label="Admin Role"
              select
              value={form.roleKey}
              onChange={(e) => updateField("roleKey", e.target.value)}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
            >
              <MenuItem value="SUPER_ADMIN">Super Admin</MenuItem>
              <MenuItem value="BUILDING_ADMIN">Building Admin</MenuItem>
              <MenuItem value="LOST_FOUND_ADMIN">Lost & Found Admin</MenuItem>
              <MenuItem value="COMPLAINT_ADMIN">Complaint Admin</MenuItem>
              <MenuItem value="USER_ADMIN">User Admin</MenuItem>
            </TextField>

            <TextField
              label="Generated Login Email"
              value={previewEmail}
              fullWidth
              disabled
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
            />

            <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                fullWidth
                required
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showPassword ? (
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
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                fullWidth
                required
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
            </Stack>

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
          <Stack direction="row" justifyContent="flex-end" spacing={1.25}>
            <Button
              variant="outlined"
              onClick={handleClose}
              sx={{ borderRadius: 1.25 }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="add-admin-user-form"
              variant="contained"
              startIcon={<PersonAddAlt1RoundedIcon />}
              disabled={loading}
              sx={{ borderRadius: 1.25 }}
            >
              {loading ? "Creating..." : "Create Admin User"}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Dialog>
  );
}