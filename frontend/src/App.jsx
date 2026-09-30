import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";


import Login from "./components/login";
import Dashboard from "./pages/dashboard";
import Purchase from "./pages/purchase";
import NotFound from "./pages/notfound";
import Transfer from "./pages/transfer";
import Profile from "./pages/profile";
import Settings from "./pages/setting";
import Approvals from "./pages/approve";
import AuditLogs from "./pages/auditlog";
import AssignmentsExpenditures from "./pages/assignments";
import { saveSession } from "./api";

/* ------------------------------------------------------------------ */
/* Session helpers (read synchronously so a page refresh keeps you in)  */
/* ------------------------------------------------------------------ */

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("mams_user") || "null");
  } catch {
    return null;
  }
};

const hasSession = () =>
  !!localStorage.getItem("mams_token") && !!getStoredUser();

// Turns any stored role value into ADMIN / COMMANDER / LOGISTICS
const normalizeRole = (user) => {
  const raw = String(user?.user_role ?? user?.role_id ?? "")
    .trim()
    .toUpperCase();

  if (raw === "1" || raw === "ADMIN") return "ADMIN";
  if (raw === "2" || raw === "BC001" || raw === "COMMANDER" || raw === "BASE COMMANDER")
    return "COMMANDER";
  if (raw === "3" || raw === "LO001" || raw === "LOGISTICS" || raw === "LOGISTICS OFFICER")
    return "LOGISTICS";
  return null;
};

// Where each role should land after login
const homeFor = (role) => (role === "LOGISTICS" ? "/purchases" : "/dashboard");

/* ------------------------------------------------------------------ */
/* Route guard (UI only: the backend still enforces every rule)         */
/* ------------------------------------------------------------------ */

function ProtectedRoute({ roles, children }) {
  if (!hasSession()) {
    return <Navigate to="/" replace />;
  }

  const role = normalizeRole(getStoredUser());

  if (roles && !roles.includes(role)) {
    return <Navigate to={homeFor(role)} replace />;
  }

  return children;
}

function LoginWrapper() {
  const navigate = useNavigate();

  // Already signed in: skip the login screen
  if (hasSession()) {
    return <Navigate to={homeFor(normalizeRole(getStoredUser()))} replace />;
  }

  const handleLogin = async (data) => {
    saveSession(data); // stores token and user together
    navigate(homeFor(normalizeRole(data?.user)), { replace: true });
  };

  return <Login onLogin={handleLogin} />;
}

/* ------------------------------------------------------------------ */
/* App                                                                  */
/* ------------------------------------------------------------------ */

const ALL = ["ADMIN", "COMMANDER", "LOGISTICS"];
const MANAGERS = ["ADMIN", "COMMANDER"];

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginWrapper />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={MANAGERS}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases"
          element={
            <ProtectedRoute roles={ALL}>
              <Purchase />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfers"
          element={
            <ProtectedRoute roles={ALL}>
              <Transfer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments"
          element={
            <ProtectedRoute roles={MANAGERS}>
              <AssignmentsExpenditures />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute roles={ALL}>
              <Approvals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={ALL}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={ALL}>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}