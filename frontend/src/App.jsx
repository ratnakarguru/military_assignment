import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import "./App.css";
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

function LoginWrapper() {
  const navigate = useNavigate();

  const handleLogin = async (data) => {
    if (data?.user) {
      localStorage.setItem("mams_user", JSON.stringify(data.user));
    }

    if (data?.access_token) {
      localStorage.setItem("mams_token", data.access_token);
    }

    navigate("/dashboard");
  };

  return <Login onLogin={handleLogin} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginWrapper />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/purchases" element={<Purchase />} />
        <Route path="/transfers" element={<Transfer />} />
        <Route path="/assignments" element={<AssignmentsExpenditures />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="*" element={<NotFound />} />
        {/* <Route path="*" element={<Navigate to="/login" replace />} /> */}
      </Routes>
    </BrowserRouter>
  );
}