/** @format */

import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { registerAdminUser } from "../services/admin-auth.service";
import { useToastStore } from "../store/useToastStore";

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

export function RegisterPage() {
  const navigate = useNavigate();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    if (!passwordChecks.min || !passwordChecks.upper || !passwordChecks.lower || !passwordChecks.number || !passwordChecks.special) {
      setError("Password does not meet the required rules.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const registered = await registerAdminUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        roleKey: form.roleKey,
      });

      showToast({
        severity: "success",
        title: "Admin account created",
        message: `Login email: ${registered.email}`,
      });

      navigate("/login");
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ?? "Unable to register admin user.";
      setError(message);

      showToast({
        severity: "error",
        title: "Registration failed",
        message,
      });
    } finally {
      setLoading(false);
    }
  }

  function Rule({
    ok,
    text,
  }: {
    ok: boolean;
    text: string;
  }) {
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
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#F4F7FB",
        display: "grid",
        placeItems: "center",
        px: 2,
        py: 4,
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 1120,
          borderRadius: 2,
          boxShadow: "0 24px 64px rgba(15, 23, 42, 0.10)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "0.95fr 1.05fr" },
            minHeight: { xs: "auto", md: 720 },
          }}
        >
          <Box
            sx={{
              bgcolor: "#0B4A8B",
              color: "#fff",
              p: { xs: 3, md: 5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background:
                "linear-gradient(180deg, #0B4A8B 0%, #083B70 100%)",
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 40,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                }}
              >
                Uni
                <Box component="span" sx={{ color: "#FF7100" }}>
                  Locate
                </Box>
              </Typography>

              <Typography sx={{ mt: 2, fontSize: 15, opacity: 0.92 }}>
                Admin Dashboard
              </Typography>

              <Typography
                sx={{
                  mt: 5,
                  fontSize: { xs: 28, md: 36 },
                  fontWeight: 800,
                  lineHeight: 1.15,
                }}
              >
                Create admin access for the UniLocate control center.
              </Typography>

              <Typography sx={{ mt: 2, maxWidth: 440, opacity: 0.9 }}>
                Register new admin users with role-based access for buildings,
                complaints, lost & found, and user management.
              </Typography>
            </Box>

            <Box
              sx={{
                mt: 4,
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 1.5,
                p: 2.25,
                bgcolor: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Typography sx={{ fontSize: 13, opacity: 0.9 }}>
                Generated admin email preview
              </Typography>
              <Typography
                sx={{
                  mt: 0.75,
                  fontSize: 17,
                  fontWeight: 800,
                  wordBreak: "break-word",
                }}
              >
                {previewEmail}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              bgcolor: "#FFFFFF",
              p: { xs: 3, md: 5 },
              display: "flex",
              alignItems: "center",
            }}
          >
            <CardContent sx={{ width: "100%", p: 0, "&:last-child": { pb: 0 } }}>
              <Stack spacing={3} component="form" onSubmit={handleSubmit}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight={900}>
                      Register
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                      Create a new admin account with controlled dashboard access.
                    </Typography>
                  </Box>

                  <Button
                    component={RouterLink}
                    to="/login"
                    startIcon={<ArrowBackRoundedIcon />}
                    sx={{ borderRadius: 1.25, textTransform: "none" }}
                  >
                    Back to login
                  </Button>
                </Stack>

                {error ? <Alert severity="error">{error}</Alert> : null}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="First Name"
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    fullWidth
                    required
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
                  />

                  <TextField
                    label="Last Name"
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    fullWidth
                    required
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

                <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="flex-start">
                  <Box sx={{ flex: 1, width: "100%" }}>
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
                            <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                              {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>

                  <Box sx={{ flex: 1, width: "100%" }}>
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
                            <IconButton onClick={() => setShowConfirmPassword((prev) => !prev)} edge="end">
                              {showConfirmPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                </Stack>

                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    p: 2,
                    bgcolor: "#FAFCFF",
                  }}
                >
                  <Typography fontWeight={800} sx={{ mb: 1.25 }}>
                    Password requirements
                  </Typography>

                  <Stack spacing={0.8}>
                    <Rule ok={passwordChecks.min} text="At least 8 characters" />
                    <Rule ok={passwordChecks.upper} text="At least one uppercase letter" />
                    <Rule ok={passwordChecks.lower} text="At least one lowercase letter" />
                    <Rule ok={passwordChecks.number} text="At least one number" />
                    <Rule ok={passwordChecks.special} text="At least one special character" />
                    <Rule ok={passwordsMatch} text="Passwords match" />
                  </Stack>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  startIcon={<PersonAddAlt1RoundedIcon />}
                  disabled={loading}
                  sx={{
                    height: 52,
                    borderRadius: 1.25,
                    fontWeight: 800,
                    textTransform: "none",
                    fontSize: 16,
                  }}
                >
                  {loading ? "Creating account..." : "Create Admin Account"}
                </Button>

                <Typography color="text.secondary" textAlign="center">
                  Already registered?{" "}
                  <Box
                    component={RouterLink}
                    to="/login"
                    sx={{
                      color: "#0B4A8B",
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    Go to login
                  </Box>
                </Typography>
              </Stack>
            </CardContent>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}