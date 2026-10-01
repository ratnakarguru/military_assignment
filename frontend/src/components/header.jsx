
import React, { useEffect, useState } from "react";
import {
  Navbar,
  Container,
  Button,
  Dropdown,
} from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";

export default function Header({
  subtitle = "Here's what's happening with your assets today.",
  onMenuClick,
}) {
  const navigate = useNavigate();

  // Current time
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Dynamic greeting
  const getGreeting = () => {
    const hour = currentTime.getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 18) {
      return "Good afternoon";
    }

    return "Good evening";
  };

  // Format current time
  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Get logged-in user
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("mams_user"));
  } catch (error) {
    user = null;
  }

  // User information
  const username = user?.username || "User";
  const serviceId = user?.service_id || "";

  // Role mapping based on your database
  const rawRole = String(user?.user_role || "");

  const role =
    user?.role_name ||
    (rawRole === "1"
      ? "Administrator"
      : rawRole === "BC001"
      ? "Base Commander"
      : rawRole === "LO001"
      ? "Logistics Officer"
      : "User");

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("mams_user");
    localStorage.removeItem("access_token");
    navigate("/");
  };

  return (
    <Navbar className="mams-header">
      <Container fluid className="px-4 px-lg-5">

        {/* Page heading */}
        <div className="mams-header-copy">
          <Button
            variant="light"
            className="mams-menu-button"
            type="button"
            aria-label="Open navigation"
            onClick={onMenuClick}
          >
            <i className="bi bi-list"></i>
          </Button>
          <div className="d-flex align-items-center gap-3 flex-wrap">

            <h1 className="mams-header-title mb-0">
              {getGreeting()}, {username}
            </h1>

            {/* Realtime Clock */}
            <span className="badge bg-light text-dark border px-3 py-2">
              <i className="bi bi-clock me-2"></i>
              {formattedTime}
            </span>

          </div>

          <p className="mams-header-subtitle">
            {subtitle}
          </p>
        </div>

        {/* Right side */}
        <div className="mams-header-actions d-flex align-items-center gap-3">

          {/* Notification */}
          <Button
            variant="light"
            className="mams-icon-button position-relative"
            type="button"
          >
            <i className="bi bi-bell"></i>

            <span className="mams-notification-dot"></span>
          </Button>

          {/* Divider */}
          <div className="mams-header-divider"></div>

          {/* Profile */}
          <Dropdown align="end">

            <Dropdown.Toggle
              variant="light"
              className="mams-profile-button"
              id="profile-dropdown"
            >

              {/* Avatar */}
              <div className="mams-avatar">
                <i className="bi bi-person-fill"></i>
              </div>

              {/* User information */}
              <div className="d-none d-sm-block text-start">

                <div className="mams-user-name">
                  {username}
                </div>

                <div className="mams-user-role">
                  {role}
                </div>

              </div>

            </Dropdown.Toggle>

            <Dropdown.Menu>

              {/* Profile */}
              <Dropdown.Item
                as={Link}
                to="/profile"
              >
                <i className="bi bi-person me-2"></i>
                Profile
              </Dropdown.Item>

              {/* Settings */}
              <Dropdown.Item
                as={Link}
                to="/settings"
              >
                <i className="bi bi-gear me-2"></i>
                Settings
              </Dropdown.Item>

              {/* Service ID */}
              {serviceId && (
                <>
                  <Dropdown.Divider />

                  <Dropdown.ItemText>
                    <small className="text-muted">
                      Service ID
                    </small>

                    <div className="fw-semibold">
                      {serviceId}
                    </div>
                  </Dropdown.ItemText>
                </>
              )}

              <Dropdown.Divider />

              {/* Logout */}
              <Dropdown.Item
                onClick={handleLogout}
                className="text-danger"
              >
                <i className="bi bi-box-arrow-right me-2"></i>
                Sign out
              </Dropdown.Item>

            </Dropdown.Menu>

          </Dropdown>

        </div>

      </Container>
    </Navbar>
  );
}
