/** @format */

import { Navigate, Outlet } from "react-router-dom";
import { getAdminAuthUser } from "../store/adminAuthStorage";
import { getLandingPath } from "./permissions";

export function PublicRoute() {
  const user = getAdminAuthUser();

  if (user) {
    return <Navigate to={getLandingPath(user.roleKey)} replace />;
  }

  return <Outlet />;
}