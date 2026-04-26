/** @format */

import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import GppMaybeRoundedIcon from "@mui/icons-material/GppMaybeRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  Divider,
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
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { StatCard } from "../components/common/StatCard";
import { useToastStore } from "../store/useToastStore";
import {
  getComplaintById,
  getComplaints,
  updateComplaintStatus,
} from "../services/complaints.service";
import type { ComplaintDetail, ComplaintSummary } from "../types/complaints";
import { ComplaintChatDialog } from "../features/complaints/components/ComplaintChatDialog";
import { ComplaintLogsDialog } from "../features/complaints/components/ComplaintLogsDialog";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getSeverityChip(severity: string) {
  const normalized = String(severity || "").toUpperCase();

  if (normalized === "CRITICAL") {
    return (
      <Chip
        label="CRITICAL"
        size="small"
        sx={{
          borderRadius: 1.25,
          fontWeight: 700,
          bgcolor: "#FEF2F2",
          color: "#B91C1C",
        }}
      />
    );
  }

  if (normalized === "HIGH") {
    return (
      <Chip
        label="HIGH"
        size="small"
        sx={{
          borderRadius: 1.25,
          fontWeight: 700,
          bgcolor: "#FFF7ED",
          color: "#C2410C",
        }}
      />
    );
  }

  if (normalized === "MED") {
    return (
      <Chip
        label="MED"
        size="small"
        sx={{
          borderRadius: 1.25,
          fontWeight: 700,
          bgcolor: "#EFF6FF",
          color: "#1D4ED8",
        }}
      />
    );
  }

  return (
    <Chip
      label={normalized || "LOW"}
      size="small"
      sx={{
        borderRadius: 1.25,
        fontWeight: 700,
        bgcolor: "#F8FAFC",
        color: "#475569",
      }}
    />
  );
}

function getStatusChip(status: string) {
  const normalized = String(status || "").toUpperCase();

  const map: Record<string, { bg: string; color: string }> = {
    NEW: { bg: "#FFF7ED", color: "#C2410C" },
    OPEN: { bg: "#EFF6FF", color: "#1D4ED8" },
    PENDING: { bg: "#FEF3C7", color: "#92400E" },
    NEED_MORE_INFO: { bg: "#F3E8FF", color: "#7E22CE" },
    RESOLVED: { bg: "#ECFDF3", color: "#027A48" },
    CLOSED: { bg: "#F8FAFC", color: "#334155" },
  };

  const style = map[normalized] ?? { bg: "#F8FAFC", color: "#475569" };

  return (
    <Chip
      label={normalized || "UNKNOWN"}
      size="small"
      sx={{
        borderRadius: 1.25,
        fontWeight: 700,
        bgcolor: style.bg,
        color: style.color,
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

export function ComplaintsPage() {
  const [rows, setRows] = useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(
    null,
  );
  const [selectedComplaint, setSelectedComplaint] =
    useState<ComplaintDetail | null>(null);
  const [statusDraft, setStatusDraft] = useState("NEW");
  const [assignedTeamDraft, setAssignedTeamDraft] = useState("");

  const [chatComplaintId, setChatComplaintId] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);

  const showToast = useToastStore((state) => state.showToast);

  async function loadComplaints() {
    try {
      setLoading(true);
      const data = await getComplaints();
      setRows(data ?? []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load complaint cases.");
      showToast({
        severity: "error",
        title: "Load failed",
        message: "Unable to load complaint data right now.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function openDetails(id: string) {
    try {
      setSelectedComplaintId(id);
      setDetailsLoading(true);
      const data = await getComplaintById(id);
      setSelectedComplaint(data);
      setStatusDraft(data.status || "NEW");
      setAssignedTeamDraft(data.assignedTeam || "");
    } catch (err) {
      console.error(err);
      showToast({
        severity: "error",
        title: "Details unavailable",
        message: "Unable to load complaint details.",
      });
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleSaveStatus() {
    if (!selectedComplaint) return;

    try {
      setActionLoading(true);
      await updateComplaintStatus(selectedComplaint.id, {
        status: statusDraft,
        assignedTeam: assignedTeamDraft || null,
      });

      await loadComplaints();

      const refreshed = await getComplaintById(selectedComplaint.id);
      setSelectedComplaint(refreshed);

      showToast({
        severity: "success",
        title: "Complaint updated",
        message: "Complaint status and assignment were updated successfully.",
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        severity: "error",
        title: "Update failed",
        message:
          err?.response?.data?.message ?? "Unable to update complaint status.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    loadComplaints();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.title?.toLowerCase().includes(q) ||
        row.anonId?.toLowerCase().includes(q) ||
        row.category?.toLowerCase().includes(q) ||
        row.description?.toLowerCase().includes(q);

      const matchesSeverity =
        severityFilter === "all" ||
        row.severity?.toUpperCase() === severityFilter;

      const matchesStatus =
        statusFilter === "all" || row.status?.toUpperCase() === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [rows, search, severityFilter, statusFilter]);

  const totalCases = rows.length;
  //   const criticalCases = rows.filter((row) => row.severity?.toUpperCase() === 'CRITICAL').length;
  const criticalCases = rows.filter((row) =>
    ["CRITICAL", "HIGH"].includes(String(row.severity || "").toUpperCase()),
  ).length;
  const activeCases = rows.filter((row) =>
    ["NEW", "OPEN", "PENDING", "NEED_MORE_INFO"].includes(
      String(row.status || "").toUpperCase(),
    ),
  ).length;
  const totalMessages = rows.reduce(
    (sum, row) => sum + Number(row.messageCount || 0),
    0,
  );

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
        }}>
        <PageHeader
          title="Complaint Management"
          subtitle="Review complaint cases, monitor active sessions, manage escalations, and trace admin actions."
          action={
            <Stack direction="row" spacing={1.25}>
              <Button
                variant="outlined"
                startIcon={<ReceiptLongRoundedIcon />}
                onClick={() => setLogsOpen(true)}
                sx={{ borderRadius: 1.5 }}>
                Logs
              </Button>

              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={loadComplaints}
                sx={{ borderRadius: 1.5 }}>
                Refresh
              </Button>
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
          }}>
          <StatCard
            label="Total Cases"
            value={totalCases}
            icon={<GppMaybeRoundedIcon />}
          />
          <StatCard
            label="Critical Cases"
            value={criticalCases}
            icon={<ErrorOutlineRoundedIcon />}
          />
          <StatCard
            label="Active Cases"
            value={activeCases}
            icon={<MarkEmailReadRoundedIcon />}
          />
          <StatCard
            label="Messages Logged"
            value={totalMessages}
            icon={<ForumRoundedIcon />}
          />
        </Box>

        <Card
          sx={{
            minHeight: 0,
            height: "100%",
            borderRadius: 1.9,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
          }}>
          <CardContent
            sx={{
              height: "100%",
              minHeight: 0,
              display: "grid",
              gridTemplateRows: "auto 1fr",
              gap: 2,
              p: 2.5,
              "&:last-child": { pb: 2.5 },
            }}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
              <TextField
                fullWidth
                label="Search by title, anonymous ID, category or description"
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
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
              />

              <TextField
                select
                label="Filter by severity"
                value={severityFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSeverityFilter(e.target.value)
                }
                sx={{
                  minWidth: 220,
                  "& .MuiOutlinedInput-root": { borderRadius: 1.5 },
                }}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="CRITICAL">CRITICAL</MenuItem>
                <MenuItem value="HIGH">HIGH</MenuItem>
                <MenuItem value="MED">MED</MenuItem>
                <MenuItem value="LOW">LOW</MenuItem>
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
                  "& .MuiOutlinedInput-root": { borderRadius: 1.5 },
                }}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="NEW">NEW</MenuItem>
                <MenuItem value="OPEN">OPEN</MenuItem>
                <MenuItem value="PENDING">PENDING</MenuItem>
                <MenuItem value="NEED_MORE_INFO">NEED_MORE_INFO</MenuItem>
                <MenuItem value="RESOLVED">RESOLVED</MenuItem>
                <MenuItem value="CLOSED">CLOSED</MenuItem>
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
              }}>
              {loading ? (
                <Box sx={{ py: 8, display: "grid", placeItems: "center" }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Box sx={{ p: 2 }}>
                  <Alert severity="error">{error}</Alert>
                </Box>
              ) : filteredRows.length === 0 ? (
                <EmptyState text="No complaint cases match the current filters." />
              ) : (
                <Box sx={{ height: "100%", overflow: "auto" }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Complaint</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Anon ID</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Category</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Severity</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Status</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Messages</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Sessions</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Created</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Actions</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ minWidth: 260 }}>
                            <Stack spacing={0.35}>
                              <Typography fontWeight={700}>
                                {row.title}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary">
                                {row.description || "No description"}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{row.anonId}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell>{getSeverityChip(row.severity)}</TableCell>
                          <TableCell>{getStatusChip(row.status)}</TableCell>
                          <TableCell>{row.messageCount}</TableCell>
                          <TableCell>{row.activeSessionCount}</TableCell>
                          <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <IconButton
                                size="small"
                                onClick={() => openDetails(row.id)}
                                sx={{
                                  border: "1px solid",
                                  borderColor: "divider",
                                  borderRadius: 1.5,
                                }}>
                                <VisibilityRoundedIcon fontSize="small" />
                              </IconButton>

                              <IconButton
                                size="small"
                                onClick={() => setChatComplaintId(row.id)}
                                sx={{
                                  border: "1px solid",
                                  borderColor: "divider",
                                  borderRadius: 1.5,
                                }}>
                                <ChatRoundedIcon fontSize="small" />
                              </IconButton>
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

      <Dialog
        open={Boolean(selectedComplaintId)}
        onClose={() => {
          setSelectedComplaintId(null);
          setSelectedComplaint(null);
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: "84vh",
            borderRadius: 2,
            overflow: "hidden",
          },
        }}>
        <Box
          sx={{
            height: "100%",
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
            overflow: "hidden",
          }}>
          <Box
            sx={{
              px: 3,
              py: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
              background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
            }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center">
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Complaint Details
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}>
                  Review complaint content, message history, and case
                  assignment.
                </Typography>
              </Box>

              <IconButton
                onClick={() => {
                  setSelectedComplaintId(null);
                  setSelectedComplaint(null);
                }}>
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
          </Box>

          <Box sx={{ minHeight: 0, overflow: "auto", p: 3 }}>
            {detailsLoading ? (
              <Box sx={{ py: 8, display: "grid", placeItems: "center" }}>
                <CircularProgress />
              </Box>
            ) : !selectedComplaint ? (
              <EmptyState text="No complaint selected." />
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                  gap: 3,
                }}>
                <Stack spacing={2}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Stack spacing={1.25}>
                        <Typography variant="h6" fontWeight={800}>
                          {selectedComplaint.title}
                        </Typography>

                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {getSeverityChip(selectedComplaint.severity)}
                          {getStatusChip(selectedComplaint.status)}
                        </Stack>

                        <Divider />

                        <Typography>
                          <strong>Anonymous ID:</strong>{" "}
                          {selectedComplaint.anonId}
                        </Typography>
                        <Typography>
                          <strong>Category:</strong>{" "}
                          {selectedComplaint.category}
                        </Typography>
                        <Typography>
                          <strong>Created:</strong>{" "}
                          {formatDateTime(selectedComplaint.createdAt)}
                        </Typography>
                        <Typography>
                          <strong>Updated:</strong>{" "}
                          {formatDateTime(selectedComplaint.updatedAt)}
                        </Typography>
                        <Typography>
                          <strong>Location:</strong>{" "}
                          {selectedComplaint.locationText || "—"}
                        </Typography>
                        <Typography>
                          <strong>Incident Time:</strong>{" "}
                          {formatDateTime(selectedComplaint.incidentAt)}
                        </Typography>
                        <Typography>
                          <strong>People Involved:</strong>{" "}
                          {selectedComplaint.peopleInvolved || "—"}
                        </Typography>
                        <Typography sx={{ whiteSpace: "pre-wrap" }}>
                          <strong>Description:</strong>{" "}
                          {selectedComplaint.description || "—"}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>

                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{ mb: 1.5 }}>
                        Sessions
                      </Typography>

                      {selectedComplaint.sessions?.length ? (
                        <Stack spacing={1.25}>
                          {selectedComplaint.sessions.map((session, index) => (
                            <Box
                              key={`${session.expiresAt}-${index}`}
                              sx={{
                                p: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 1.5,
                                bgcolor: "#FCFDFE",
                              }}>
                              <Typography fontWeight={700}>
                                {session.isActive
                                  ? "Active Session"
                                  : "Expired Session"}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.5 }}>
                                Expires: {formatDateTime(session.expiresAt)}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Typography color="text.secondary">
                          No session records found.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Stack>

                <Stack spacing={2}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{ mb: 1.5 }}>
                        Update Case
                      </Typography>

                      <Stack spacing={1.5}>
                        <TextField
                          select
                          label="Status"
                          value={statusDraft}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setStatusDraft(e.target.value)
                          }
                          fullWidth
                          size="small"
                          sx={{
                            "& .MuiOutlinedInput-root": { borderRadius: 1.5 },
                          }}>
                          <MenuItem value="NEW">NEW</MenuItem>
                          <MenuItem value="OPEN">OPEN</MenuItem>
                          <MenuItem value="PENDING">PENDING</MenuItem>
                          <MenuItem value="NEED_MORE_INFO">
                            NEED_MORE_INFO
                          </MenuItem>
                          <MenuItem value="RESOLVED">RESOLVED</MenuItem>
                          <MenuItem value="CLOSED">CLOSED</MenuItem>
                        </TextField>

                        <TextField
                          label="Assigned Team"
                          value={assignedTeamDraft}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setAssignedTeamDraft(e.target.value)
                          }
                          fullWidth
                          size="small"
                          sx={{
                            "& .MuiOutlinedInput-root": { borderRadius: 1.5 },
                          }}
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </Stack>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              px: 3,
              py: 2,
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: "#fff",
            }}>
            <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
              <Button
                variant="outlined"
                onClick={() => {
                  setSelectedComplaintId(null);
                  setSelectedComplaint(null);
                }}
                sx={{ borderRadius: 1.5 }}>
                Close
              </Button>

              {selectedComplaint ? (
                <Button
                  variant="contained"
                  onClick={handleSaveStatus}
                  disabled={actionLoading}
                  sx={{ borderRadius: 1.5 }}>
                  {actionLoading ? "Saving..." : "Save Changes"}
                </Button>
              ) : null}
            </Stack>
          </Box>
        </Box>
      </Dialog>

      <ComplaintChatDialog
        open={Boolean(chatComplaintId)}
        complaintId={chatComplaintId}
        onClose={() => setChatComplaintId(null)}
      />

      <ComplaintLogsDialog open={logsOpen} onClose={() => setLogsOpen(false)} />
    </>
  );
}
