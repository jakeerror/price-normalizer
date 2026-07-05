import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Загрузка…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
