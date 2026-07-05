import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Price-Normalizer</span>
        <nav>
          <NavLink to="/batches">Прайсы</NavLink>
          <NavLink to="/catalog">Каталог</NavLink>
        </nav>
        <div className="spacer" />
        {user && (
          <div className="user">
            <span>
              {user.fullName} · <b>{user.role}</b>
            </span>
            <button onClick={logout}>Выйти</button>
          </div>
        )}
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
