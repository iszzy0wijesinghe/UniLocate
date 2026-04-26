/** @format */

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Box,
  Button,
  Dialog,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { api } from "../../../services/api";
import { useToastStore } from "../../../store/useToastStore";

type AdminUserRow = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roleKey: string;
  roleName: string;
  avatarUrl?: string | null;
};

type Props = {
  open: boolean;
  user: AdminUserRow | null;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
};

export function EditAdminUserDialog({
  open,
  user,
  onClose,
  onUpdated,
}: Props) {
  const showToast = useToastStore((state) => state.showToast);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleKey, setRoleKey] = useState("USER_ADMIN");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setRoleKey(user.roleKey || "USER_ADMIN");
    setIsActive(Boolean(user.isActive));
  }, [user]);

  async function handleSave() {
    if (!user) return;

    try {
      setLoading(true);

      await api.patch(`/admin/users/${encodeURIComponent(user.id)}`, {
        firstName,
        lastName,
        roleKey,
        isActive,
      });

      showToast({
        severity: "success",
        title: "User updated",
        message: "Admin user details were updated successfully.",
      });

      await onUpdated();
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast({
        severity: "error",
        title: "Update failed",
        message:
          err?.response?.data?.message ??
          "Unable to update this admin user right now.",
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
                Edit Admin User
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Update role, status, and profile details.
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
              value={user?.email || ""}
              fullWidth
              disabled
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
            />

            <TextField
              select
              label="Role"
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value)}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.25 } }}
            >
              <MenuItem value="SUPER_ADMIN">Super Admin</MenuItem>
              <MenuItem value="BUILDING_ADMIN">Building Admin</MenuItem>
              <MenuItem value="LOST_FOUND_ADMIN">Lost & Found Admin</MenuItem>
              <MenuItem value="COMPLAINT_ADMIN">Complaint Admin</MenuItem>
              <MenuItem value="USER_ADMIN">User Admin</MenuItem>
            </TextField>

            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography fontWeight={700}>Account Status</Typography>
                <Typography variant="body2" color="text.secondary">
                  Turn off to make this account inactive.
                </Typography>
              </Box>
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            </Stack>
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
              onClick={handleSave}
              disabled={loading}
              sx={{ borderRadius: 1.25 }}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Dialog>
  );
}