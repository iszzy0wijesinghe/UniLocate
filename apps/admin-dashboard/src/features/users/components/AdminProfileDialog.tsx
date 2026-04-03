/** @format */

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearAdminAuthUser,
  getAdminAuthUser,
  setAdminAuthUser,
  type AdminAuthUser,
} from "../../../store/adminAuthStorage";
import { api } from "../../../services/api";
import { useToastStore } from "../../../store/useToastStore";
import { DeleteConfirmDialog } from "../../../components/common/DeleteConfirmDialog";
import { toAbsoluteFileUrl } from "../../../utils/fileUrl";

type Props = {
  open: boolean;
  onClose: () => void;
};

function getInitials(fullName?: string) {
  if (!fullName) return "A";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "A";
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function AdminProfileDialog({ open, onClose }: Props) {
  const showToast = useToastStore((state) => state.showToast);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [currentUser, setCurrentUser] = useState<AdminAuthUser | null>(
    getAdminAuthUser(),
  );
  const [tab, setTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [firstName, setFirstName] = useState(currentUser?.firstName || "");
  const [lastName, setLastName] = useState(currentUser?.lastName || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!open) return;

    const latestUser = getAdminAuthUser();
    setCurrentUser(latestUser);
    setFirstName(latestUser?.firstName || "");
    setLastName(latestUser?.lastName || "");
    setTab("profile");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, [open]);

  const fullName = useMemo(
    () =>
      `${firstName} ${lastName}`.trim() ||
      currentUser?.fullName ||
      "Admin User",
    [firstName, lastName, currentUser?.fullName],
  );

  const avatarUrl = useMemo(
    () => toAbsoluteFileUrl(currentUser?.avatarUrl) || undefined,
    [currentUser?.avatarUrl],
  );

  async function handleSaveProfile() {
    try {
      setLoading(true);

      const { data } = await api.patch("/admin/account/profile", {
        firstName,
        lastName,
      });

      if (!currentUser) return;

      const nextUser: AdminAuthUser = {
        id: currentUser.id,
        email: currentUser.email,
        roleKey: currentUser.roleKey,
        roleName: currentUser.roleName,
        isActive: currentUser.isActive,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: data.fullName,
        avatarUrl: data.avatarUrl ?? currentUser.avatarUrl ?? null,
      };

      setAdminAuthUser(nextUser);
      setCurrentUser(nextUser);

      showToast({
        severity: "success",
        title: "Profile updated",
        message: "Your profile details were updated successfully.",
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        severity: "error",
        title: "Update failed",
        message:
          err?.response?.data?.message ??
          "Unable to update your profile right now.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword() {
    try {
      setLoading(true);

      await api.patch("/admin/account/password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      showToast({
        severity: "success",
        title: "Password updated",
        message: "Your password was changed successfully.",
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        severity: "error",
        title: "Password update failed",
        message:
          err?.response?.data?.message ??
          "Unable to update your password right now.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await api.post("/admin/account/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!currentUser) return;

      const nextUser: AdminAuthUser = {
        id: currentUser.id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        fullName: currentUser.fullName,
        email: currentUser.email,
        roleKey: currentUser.roleKey,
        roleName: currentUser.roleName,
        isActive: currentUser.isActive,
        avatarUrl: data.avatarUrl ?? null,
      };

      setAdminAuthUser(nextUser);
      setCurrentUser(nextUser);

      showToast({
        severity: "success",
        title: "Avatar updated",
        message: "Your profile image was updated successfully.",
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        severity: "error",
        title: "Upload failed",
        message:
          err?.response?.data?.message ??
          "Unable to upload your avatar right now.",
      });
    } finally {
      if (event.target) event.target.value = "";
    }
  }

  async function handleDeleteMe() {
    try {
      if (!currentUser?.id) return;

      await api.delete(`/admin/users/${encodeURIComponent(currentUser.id)}`);
      clearAdminAuthUser();
      window.location.href = "/login";
    } catch (err: any) {
      console.error(err);
      showToast({
        severity: "error",
        title: "Delete failed",
        message:
          err?.response?.data?.message ??
          "Unable to delete your account right now.",
      });
    }
  }

  function handleLogout() {
    clearAdminAuthUser();
    window.location.href = "/login";
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
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
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  src={avatarUrl}
                  sx={{
                    width: 54,
                    height: 54,
                    bgcolor: "primary.main",
                    fontWeight: 800,
                  }}
                >
                  {getInitials(fullName)}
                </Avatar>

                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    {currentUser?.fullName || "Admin User"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentUser?.email || "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentUser?.roleName || "Admin"}
                  </Typography>
                </Box>
              </Stack>

              <IconButton onClick={onClose}>
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
          </Box>

          <Box sx={{ px: 2.5, pt: 2 }}>
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 700,
                  minHeight: 42,
                },
              }}
            >
              <Tab value="profile" label="Profile" />
              <Tab value="password" label="Password" />
            </Tabs>
          </Box>

          <Box sx={{ px: 2.5, py: 2.5 }}>
            {tab === "profile" ? (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Avatar
                    src={avatarUrl}
                    sx={{
                      width: 68,
                      height: 68,
                      bgcolor: "primary.main",
                      fontWeight: 800,
                    }}
                  >
                    {getInitials(fullName)}
                  </Avatar>

                  <Button
                    variant="outlined"
                    startIcon={<UploadRoundedIcon />}
                    onClick={() => fileRef.current?.click()}
                    sx={{ borderRadius: 1.25 }}
                  >
                    Upload Avatar
                  </Button>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleAvatarChange}
                  />
                </Stack>

                <TextField
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  fullWidth
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
                />

                <TextField
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  fullWidth
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
                />

                <TextField
                  label="Email"
                  value={currentUser?.email || ""}
                  fullWidth
                  disabled
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
                />
              </Stack>
            ) : (
              <Stack spacing={2}>
                <TextField
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  fullWidth
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
                />

                <TextField
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
                />

                <TextField
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
                />
              </Stack>
            )}
          </Box>

          <Divider />

          <Box sx={{ px: 2.5, py: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1.25}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineRoundedIcon />}
                  onClick={() => setDeleteOpen(true)}
                  sx={{ borderRadius: 1.25 }}
                >
                  Delete Account
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<LogoutRoundedIcon />}
                  onClick={handleLogout}
                  sx={{ borderRadius: 1.25 }}
                >
                  Logout
                </Button>
              </Stack>

              <Button
                variant="contained"
                startIcon={
                  tab === "profile" ? (
                    <EditRoundedIcon />
                  ) : (
                    <LockResetRoundedIcon />
                  )
                }
                onClick={
                  tab === "profile" ? handleSaveProfile : handleChangePassword
                }
                disabled={loading}
                sx={{ borderRadius: 1.25 }}
              >
                {loading
                  ? "Saving..."
                  : tab === "profile"
                    ? "Save Profile"
                    : "Update Password"}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        title="Delete your account"
        message="Are you sure you want to delete your admin account? This action cannot be undone."
        confirmLabel="Delete Account"
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteMe}
      />
    </>
  );
}