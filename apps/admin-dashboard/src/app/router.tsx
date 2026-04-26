/** @format */

import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { DashboardPage } from "../pages/DashboardPage";
import { BuildingsPage } from "../pages/BuildingsPage";
import { LostFoundPage } from "../pages/LostFoundPage";
import { ComplaintsPage } from "../pages/ComplaintsPage";
import { UsersPage } from "../pages/UsersPage";
import { LoginPage } from "../pages/LoginPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/buildings" element={<BuildingsPage />} />
          <Route path="/lost-found" element={<LostFoundPage />} />
          <Route path="/complaints" element={<ComplaintsPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}