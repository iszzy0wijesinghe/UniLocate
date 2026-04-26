/** @format */

import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { StatCard } from "../components/common/StatCard";
import { useToastStore } from "../store/useToastStore";
import { getAdminAuthUser } from "../store/adminAuthStorage";
import { canManageAdminUsers } from "../app/permissions";
import { AddAdminUserDialog } from "../features/users/components/AddAdminUserDialog";
import { EditAdminUserDialog } from "../features/users/components/EditAdminUserDialog";
import { ResetAdminPasswordDialog } from "../features/users/components/ResetAdminPasswordDialog";
import { DeleteConfirmDialog } from "../components/common/DeleteConfirmDialog";
import { api } from "../services/api";

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

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getRoleChip(roleKey: string, roleName: string) {
  const normalized = String(roleKey || "").toUpperCase();

  const styles: Record<string, { bg: string; color: string }> = {
    SUPER_ADMIN: { bg: "#FEF3C7", color: "#92400E" },
    BUILDING_ADMIN: { bg: "#E0F2FE", color: "#075985" },
    LOST_FOUND_ADMIN: { bg: "#ECFCCB", color: "#3F6212" },
    COMPLAINT_ADMIN: { bg: "#F3E8FF", color: "#7E22CE" },
    USER_ADMIN: { bg: "#DBEAFE", color: "#1D4ED8" },
  };

  const style = styles[normalized] ?? {
    bg: "#F8FAFC",
    color: "#475569",
  };

  return (
    <Chip
      label={roleName || normalized || "Unknown"}
      size="small"
      sx={{
        borderRadius: 1,
        fontWeight: 800,
        bgcolor: style.bg,
        color: style.color,
      }}
    />
  );
}

function getStatusChip(isActive: boolean) {
  return (
    <Chip
      label={isActive ? "Active" : "Inactive"}
      size="small"
      sx={{
        borderRadius: 1,
        fontWeight: 800,
        bgcolor: isActive ? "#ECFDF3" : "#FEF2F2",
        color: isActive ? "#027A48" : "#B91C1C",
      }}
    />
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Box sx={{ py: 6, display: "grid", placeItems: "center" }}>
      <Typography color="text.secondary">{text}</Typography>
    </Box>
  );
}

export function UsersPage() {
  const currentUser = getAdminAuthUser();
  const showToast = useToastStore((state) => state.showToast);

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canCreateUsers = canManageAdminUsers(currentUser?.roleKey);

  async function loadUsers() {
    try {
      setLoading(true);
      const { data } = await api.get<AdminUserRow[]>("/admin/users");
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load admin users.");
      showToast({
        severity: "error",
        title: "Load failed",
        message: "Unable to load admin user data right now.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.fullName?.toLowerCase().includes(q) ||
        row.email?.toLowerCase().includes(q) ||
        row.roleName?.toLowerCase().includes(q) ||
        row.roleKey?.toLowerCase().includes(q);

      const matchesRole =
        roleFilter === "all" ||
        String(row.roleKey || "").toUpperCase() === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && row.isActive) ||
        (statusFilter === "inactive" && !row.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [rows, search, roleFilter, statusFilter]);

  const totalUsers = rows.length;
  const activeUsers = rows.filter((row) => row.isActive).length;
  const superAdmins = rows.filter(
    (row) => String(row.roleKey || "").toUpperCase() === "SUPER_ADMIN",
  ).length;
  const inactiveUsers = rows.filter((row) => !row.isActive).length;

  async function handleDeleteUser() {
    if (!selectedUser) return;

    try {
      setDeleteLoading(true);
      await api.delete(`/admin/users/${encodeURIComponent(selectedUser.id)}`);

      showToast({
        severity: "success",
        title: "User deleted",
        message: `${selectedUser.fullName} was removed successfully.`,
      });

      setDeleteOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err: any) {
      console.error(err);
      showToast({
        severity: "error",
        title: "Delete failed",
        message:
          err?.response?.data?.message ??
          "Unable to delete this admin user right now.",
      });
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <Box
        sx={{
          height: "100%",
          minHeight: 0,
          display: "grid",
          gridTemplateRows: "auto auto 1fr",
          gap: 2,
          overflow: "hidden",
          pt: 2,
        }}
      >
        <PageHeader
          title="User Management"
          subtitle="Manage admin roles, account access, user lifecycle, and operational permissions."
          action={
            <Stack direction="row" spacing={1.25}>
              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={loadUsers}
                sx={{ borderRadius: 1.25 }}
              >
                Refresh
              </Button>

              {canCreateUsers ? (
                <Button
                  variant="contained"
                  startIcon={<PersonAddAlt1RoundedIcon />}
                  onClick={() => setOpenAdd(true)}
                  sx={{ borderRadius: 1.25 }}
                >
                  Add Admin User
                </Button>
              ) : null}
            </Stack>
          }
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              xl: "repeat(4, 1fr)",
            },
            gap: 2,
          }}
        >
          <StatCard
            label="Total Admin Users"
            value={totalUsers}
            icon={<GroupRoundedIcon />}
          />
          <StatCard
            label="Active Accounts"
            value={activeUsers}
            icon={<VerifiedUserRoundedIcon />}
          />
          <StatCard
            label="Super Admins"
            value={superAdmins}
            icon={<AdminPanelSettingsRoundedIcon />}
          />
          <StatCard
            label="Inactive Accounts"
            value={inactiveUsers}
            icon={<BlockRoundedIcon />}
          />
        </Box>

        <Card
          sx={{
            minHeight: 0,
            height: "100%",
            borderRadius: 1.25,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
          }}
        >
          <CardContent
            sx={{
              height: "100%",
              minHeight: 0,
              display: "grid",
              gridTemplateRows: "auto 1fr",
              gap: 2,
              p: 2.5,
              "&:last-child": { pb: 2.5 },
            }}
          >
            <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
              <TextField
                fullWidth
                label="Search by full name, email, or role"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.25,
                  },
                }}
              />

              <TextField
                select
                label="Filter by role"
                value={roleFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRoleFilter(e.target.value)
                }
                sx={{
                  minWidth: 220,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.25,
                  },
                }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="SUPER_ADMIN">Super Admin</MenuItem>
                <MenuItem value="BUILDING_ADMIN">Building Admin</MenuItem>
                <MenuItem value="LOST_FOUND_ADMIN">Lost & Found Admin</MenuItem>
                <MenuItem value="COMPLAINT_ADMIN">Complaint Admin</MenuItem>
                <MenuItem value="USER_ADMIN">User Admin</MenuItem>
              </TextField>

              <TextField
                select
                label="Filter by status"
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStatusFilter(e.target.value)
                }
                sx={{
                  minWidth: 220,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.25,
                  },
                }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Stack>

            <Box
              sx={{
                minHeight: 0,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "#fff",
              }}
            >
              {loading ? (
                <Box sx={{ py: 8, display: "grid", placeItems: "center" }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Box sx={{ p: 2 }}>
                  <Alert severity="error">{error}</Alert>
                </Box>
              ) : filteredRows.length === 0 ? (
                <EmptyState text="No admin users match the current filters." />
              ) : (
                <Box sx={{ height: "100%", overflow: "auto" }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Admin User</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Email</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Role</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Status</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Created</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Updated</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Actions</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ minWidth: 240 }}>
                            <Stack spacing={0.3}>
                              <Typography fontWeight={800}>
                                {row.fullName}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {row.firstName} {row.lastName}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ minWidth: 260 }}>
                            <Typography fontWeight={600}>{row.email}</Typography>
                          </TableCell>

                          <TableCell>
                            {getRoleChip(row.roleKey, row.roleName)}
                          </TableCell>

                          <TableCell>{getStatusChip(row.isActive)}</TableCell>

                          <TableCell>{formatDateTime(row.createdAt)}</TableCell>

                          <TableCell>{formatDateTime(row.updatedAt)}</TableCell>

                          <TableCell align="right" sx={{ minWidth: 180 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              justifyContent="flex-end"
                            >
                              <Tooltip title="Edit user">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedUser(row);
                                    setEditOpen(true);
                                  }}
                                  sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 1,
                                  }}
                                >
                                  <EditRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Reset password">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedUser(row);
                                    setResetPasswordOpen(true);
                                  }}
                                  sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 1,
                                  }}
                                >
                                  <LockResetRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Delete user">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedUser(row);
                                    setDeleteOpen(true);
                                  }}
                                  sx={{
                                    border: "1px solid",
                                    borderColor: "#FECACA",
                                    color: "#B91C1C",
                                    borderRadius: 1,
                                  }}
                                >
                                  <DeleteOutlineRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <AddAdminUserDialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onCreated={async () => {
          await loadUsers();
        }}
      />

      <EditAdminUserDialog
        open={editOpen}
        user={selectedUser}
        onClose={() => {
          setEditOpen(false);
          setSelectedUser(null);
        }}
        onUpdated={async () => {
          await loadUsers();
        }}
      />

      <ResetAdminPasswordDialog
        open={resetPasswordOpen}
        user={selectedUser}
        onClose={() => {
          setResetPasswordOpen(false);
          setSelectedUser(null);
        }}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        title="Delete admin user"
        message={`Are you sure you want to delete ${selectedUser?.fullName ?? "this user"}? This action cannot be undone.`}
        confirmLabel={deleteLoading ? "Deleting..." : "Delete User"}
        onClose={() => {
          if (deleteLoading) return;
          setDeleteOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteUser}
        loading={deleteLoading}
      />
    </>
  );
}