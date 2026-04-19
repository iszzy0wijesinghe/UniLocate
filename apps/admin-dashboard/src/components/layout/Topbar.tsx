/** @format */

import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import {
  Avatar,
  Badge,
  Box,
  ButtonBase,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { getAdminAuthUser } from "../../store/adminAuthStorage";
import { AdminProfileDialog } from "../../features/users/components/AdminProfileDialog";
import { toAbsoluteFileUrl } from "../../utils/fileUrl";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatNow() {
  return new Date().toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitials(fullName?: string) {
  if (!fullName) return "A";

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "A";

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function Topbar() {
  const currentUser = getAdminAuthUser();
  const [profileOpen, setProfileOpen] = useState(false);

  const fullName = currentUser?.fullName || "Admin User";
  const roleName = currentUser?.roleName || "Admin";
  const greeting = getGreeting();
  const nowText = formatNow();

  return (
    <>
      <Box
        sx={{
          px: 3,
          pt: 2,
          pb: 1.5,
          backgroundColor: "background.default",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
        <Box
          sx={{
            px: 2.5,
            py: 1.4,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
          }}>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="space-between">
            <Box>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#0F172A",
                  lineHeight: 1.2,
                }}>
                {greeting}, {currentUser?.firstName || "Admin"}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.45 }}>
                {nowText}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton>
                <Badge badgeContent={4} color="error">
                  <NotificationsRoundedIcon />
                </Badge>
              </IconButton>

              <ButtonBase
                onClick={() => setProfileOpen(true)}
                sx={{
                  borderRadius: 1.25,
                  px: 1,
                  py: 0.75,
                }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Avatar
                    src={toAbsoluteFileUrl(currentUser?.avatarUrl) || undefined}
                    sx={{
                      bgcolor: "primary.main",
                      width: 38,
                      height: 38,
                      fontSize: 14,
                      fontWeight: 800,
                    }}>
                    {getInitials(fullName)}
                  </Avatar>

                  <Box sx={{ textAlign: "left" }}>
                    <Typography fontWeight={800} sx={{ lineHeight: 1.2 }}>
                      {fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {roleName}
                    </Typography>
                  </Box>
                </Stack>
              </ButtonBase>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <AdminProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </>
  );
}
