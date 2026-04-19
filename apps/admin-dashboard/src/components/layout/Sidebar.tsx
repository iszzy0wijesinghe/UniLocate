/** @format */

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import { NavLink, useNavigate } from "react-router-dom";
import uniLocateLogo from "../../assets/images/UniLocateLogo.png";
import {
  clearAdminAuthUser,
  getAdminAuthUser,
} from "../../store/adminAuthStorage";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <DashboardRoundedIcon />,
    roles: [
      "SUPER_ADMIN",
      "BUILDING_ADMIN",
      "LOST_FOUND_ADMIN",
      "COMPLAINT_ADMIN",
      "USER_ADMIN",
    ],
  },
  {
    label: "Building Management",
    path: "/buildings",
    icon: <ApartmentRoundedIcon />,
    roles: ["SUPER_ADMIN", "BUILDING_ADMIN"],
  },
  {
    label: "Lost & Found",
    path: "/lost-found",
    icon: <Inventory2RoundedIcon />,
    roles: ["SUPER_ADMIN", "LOST_FOUND_ADMIN"],
  },
  {
    label: "Complaint Management",
    path: "/complaints",
    icon: <ReportProblemRoundedIcon />,
    roles: ["SUPER_ADMIN", "COMPLAINT_ADMIN"],
  },
  {
    label: "User Management",
    path: "/users",
    icon: <GroupRoundedIcon />,
    roles: ["SUPER_ADMIN", "USER_ADMIN"],
  },
];

export function Sidebar() {
  const navigate = useNavigate();
  const currentUser = getAdminAuthUser();

  const roleKey = String(currentUser?.roleKey || "").toUpperCase();

  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(roleKey),
  );

  function handleLogout() {
    clearAdminAuthUser();
    navigate("/login", { replace: true });
  }

  return (
    <Box
      sx={{
        width: 280,
        p: 0,
        borderRight: "1px solid",
        borderColor: "divider",
        backgroundColor: "#EEF3F8",
        display: { xs: "none", md: "block" },
      }}>
      <Box
        sx={{
          height: "100vh",
          backgroundColor: "#F8FBFF",
          borderRight: "1px solid",
          borderColor: "divider",
          px: 2,
          py: 2,
          display: "flex",
          flexDirection: "column",
        }}>
        <Box
          sx={{
            mb: 2,
            px: 1,
            pt: 0.5,
            pb: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}>
          <Box
            component="img"
            src={uniLocateLogo}
            alt="UniLocate"
            sx={{
              height: 100,
              width: "auto",
              objectFit: "contain",
              display: "block",
              mb: 1.25,
            }}
          />

          <Typography
            variant="body1"
            fontWeight={800}
            sx={{ color: "#0F172A", lineHeight: 1.2 }}>
            Admin Dashboard
          </Typography>

          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.4 }}>
            Secure operations center
          </Typography>
        </Box>

        <Box
          sx={{
            px: 1.5,
            py: 1.5,
            mb: 2,
            borderRadius: 1.25,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "#FFFFFF",
          }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Logged in as
          </Typography>

          <Typography fontWeight={800} sx={{ lineHeight: 1.2 }}>
            {currentUser?.fullName || "Admin User"}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.4, wordBreak: "break-word" }}>
            {currentUser?.email || "No email"}
          </Typography>

          <Typography
            sx={{
              mt: 1,
              display: "inline-flex",
              px: 1,
              py: 0.45,
              borderRadius: 1,
              fontSize: 12,
              fontWeight: 800,
              backgroundColor: "#EEF4FF",
              color: "#1D4ED8",
            }}>
            {currentUser?.roleName || "Unknown Role"}
          </Typography>
        </Box>

        <Stack spacing={1} sx={{ flex: 1 }}>
          {visibleNavItems.map((item) => (
            <Box
              key={item.path}
              component={NavLink}
              to={item.path}
              sx={{
                textDecoration: "none",
                color: "text.primary",
                display: "block",
                px: 1.5,
                py: 1.2,
                borderRadius: 1.25,
                "&.active": {
                  backgroundColor: "primary.main",
                  color: "#fff",
                  boxShadow: "0 10px 24px rgba(5, 54, 104, 0.16)",
                },
              }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {item.icon}
                <Typography fontWeight={700}>{item.label}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>

        <Button
          startIcon={<LogoutRoundedIcon />}
          variant="outlined"
          color="inherit"
          onClick={handleLogout}
          sx={{
            mt: 2,
            justifyContent: "flex-start",
            borderRadius: 1.25,
            backgroundColor: "#fff",
            borderColor: "divider",
            fontWeight: 700,
          }}>
          Logout
        </Button>
      </Box>
    </Box>
  );
}
