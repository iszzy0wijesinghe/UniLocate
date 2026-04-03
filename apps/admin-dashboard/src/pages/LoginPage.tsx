/** @format */

import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { loginAdminUser } from "../services/admin-auth.service";
import { setAdminAuthUser } from "../store/adminAuthStorage";
import { useToastStore } from "../store/useToastStore";

function getLandingPath(roleKey?: string) {
  const role = String(roleKey || "").toUpperCase();

  if (role === "SUPER_ADMIN") return "/";
  if (role === "BUILDING_ADMIN") return "/buildings";
  if (role === "LOST_FOUND_ADMIN") return "/lost-found";
  if (role === "COMPLAINT_ADMIN") return "/complaints";
  if (role === "USER_ADMIN") return "/users";

  return "/";
}

export function LoginPage() {
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.showToast);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0,
    [email, password],
  );

  //   async function handleSubmit(e: React.FormEvent) {
  //     e.preventDefault();
  //     setError(null);

  //     try {
  //       setLoading(true);

  //       //   const user = await loginAdminUser({
  //       //     email: email.trim(),
  //       //     password,
  //       //   });

  //       const user = await loginAdminUser({
  //         email: email.trim(),
  //         password,
  //       });

  //       setAdminAuthUser({
  //         id: user.id,
  //         firstName: user.firstName,
  //         lastName: user.lastName,
  //         fullName: user.fullName,
  //         email: user.email,
  //         roleKey: user.roleKey,
  //         roleName: user.roleName,
  //         isActive: user.isActive,
  //         avatarUrl: user.avatarUrl ?? null,
  //         mustChangePassword: user.mustChangePassword ?? false,
  //         passwordChangedAt: user.passwordChangedAt ?? null,
  //       });

  //       setAdminAuthUser(user);

  //       showToast({
  //         severity: "success",
  //         title: "Login successful",
  //         message: `Welcome back, ${user.fullName}.`,
  //       });

  //       navigate(getLandingPath(user.roleKey));
  //     } catch (err: any) {
  //       console.error(err);
  //       const message =
  //         err?.response?.data?.message ?? "Unable to login right now.";
  //       setError(message);

  //       showToast({
  //         severity: "error",
  //         title: "Login failed",
  //         message,
  //       });
  //     } finally {
  //       setLoading(false);
  //     }
  //   }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);

      const user = await loginAdminUser({
        email: email.trim(),
        password,
      });

      setAdminAuthUser({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        roleKey: user.roleKey,
        roleName: user.roleName,
        isActive: user.isActive,
        avatarUrl: user.avatarUrl ?? null,
        mustChangePassword:
          user.roleKey !== "SUPER_ADMIN" && !user.passwordChangedAt,
        passwordChangedAt: user.passwordChangedAt ?? null,
      });

      showToast({
        severity: "success",
        title: "Login successful",
        message: `Welcome back, ${user.fullName}.`,
      });

      navigate(getLandingPath(user.roleKey));
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ?? "Unable to login right now.";
      setError(message);

      showToast({
        severity: "error",
        title: "Login failed",
        message,
      });
    } finally {
      setLoading(false);
    }
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
      }}>
      <Card
        sx={{
          width: "100%",
          maxWidth: 1080,
          borderRadius: 2,
          boxShadow: "0 24px 64px rgba(15, 23, 42, 0.10)",
          overflow: "hidden",
        }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 0.95fr" },
            minHeight: { xs: "auto", md: 700 },
          }}>
          <Box
            sx={{
              bgcolor: "#FFFFFF",
              p: { xs: 3, md: 5 },
              display: "flex",
              alignItems: "center",
              order: { xs: 2, md: 1 },
            }}>
            <CardContent
              sx={{ width: "100%", p: 0, "&:last-child": { pb: 0 } }}>
              <Stack spacing={3} component="form" onSubmit={handleSubmit}>
                <Box>
                  <Typography variant="h4" fontWeight={900}>
                    Login
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                    Sign in to access the UniLocate admin dashboard.
                  </Typography>
                </Box>

                {error ? <Alert severity="error">{error}</Alert> : null}

                <TextField
                  label="Admin Email"
                  placeholder="firstname.lastname@unilocateadmin.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
                />

                <TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end">
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

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  startIcon={<LoginRoundedIcon />}
                  disabled={loading || !canSubmit}
                  sx={{
                    height: 52,
                    borderRadius: 1.25,
                    fontWeight: 800,
                    textTransform: "none",
                    fontSize: 16,
                  }}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>

                <Typography color="text.secondary" textAlign="center">
                  Contact a system administrator if you need access.
                </Typography>
              </Stack>
            </CardContent>
          </Box>

          <Box
            sx={{
              bgcolor: "#0B4A8B",
              color: "#fff",
              p: { xs: 3, md: 5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              order: { xs: 1, md: 2 },
              background: "linear-gradient(180deg, #0B4A8B 0%, #083B70 100%)",
            }}>
            <Box>
              <Typography
                sx={{
                  fontSize: 40,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                }}>
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
                }}>
                Secure access for operational campus management.
              </Typography>

              <Typography sx={{ mt: 2, maxWidth: 420, opacity: 0.9 }}>
                Monitor complaints, manage campus buildings, review lost & found
                activity, and control admin-level access with role-based
                permissions.
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
              }}>
              <Typography sx={{ fontSize: 13, opacity: 0.9 }}>
                Quick access
              </Typography>

              <Stack spacing={1.1} sx={{ mt: 1.25 }}>
                <Typography sx={{ fontWeight: 700 }}>
                  • Complaint operations
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  • Building occupancy control
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  • Lost & found administration
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  • User and role management
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
