/** @format */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAdminAuthUser } from "../store/adminAuthStorage";
import { canAccessPath, getLandingPath } from "./permissions";

export function ProtectedRoute() {
  const location = useLocation();
  const user = getAdminAuthUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentPath = location.pathname;

  if (!canAccessPath(user.roleKey, currentPath)) {
    return <Navigate to={getLandingPath(user.roleKey)} replace />;
  }

  return <Outlet />;
}