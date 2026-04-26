/** @format */

import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ToastViewport } from "../common/ToastViewport";
import { getAdminAuthUser } from "../../store/adminAuthStorage";
import { ForcePasswordResetDialog } from "../../features/auth/component/ForcePasswordResetDialog";

export function AppShell() {
  const currentUser = getAdminAuthUser();

  const shouldForcePasswordReset =
    !!currentUser &&
    currentUser.roleKey !== "SUPER_ADMIN" &&
    !currentUser.passwordChangedAt;

  const mustChangePassword =
    Boolean(currentUser?.mustChangePassword) &&
    String(currentUser?.roleKey || "").toUpperCase() !== "SUPER_ADMIN";

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "background.default",
      }}>
      <Sidebar />

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>
        <Topbar />

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            px: { xs: 2, md: 3 },
            pb: 3,
            overflow: "hidden",
          }}>
          <Outlet />
        </Box>
      </Box>

      <ToastViewport />

      <ForcePasswordResetDialog open={shouldForcePasswordReset} />
    </Box>
  );
}
