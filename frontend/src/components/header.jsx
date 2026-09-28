import React from "react";
import {
  Navbar,
  Container,
  Button,
  Dropdown,
} from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";

export default function Header({
  title = "Good morning",
  subtitle = "Here's what's happening with your assets today.",
}) {
  const navigate = useNavigate();

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

  const role =
    user?.role_name ||
    (Number(user?.user_role) === 1
      ? "Administrator"
      : Number(user?.user_role) === 2
      ? "Base Commander"
      : Number(user?.user_role) === 3
      ? "Logistics Officer"
      : "User");

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("mams_user");
    navigate("/");
  };

  return (
    <Navbar className="mams-header">
      <Container fluid className="px-4 px-lg-5">

        {/* Page heading */}
        <div>
          <h1 className="mams-header-title">
            {title}
          </h1>

          <p className="mams-header-subtitle">
            {subtitle}
          </p>
        </div>

        {/* Right side */}
        <div className="d-flex align-items-center gap-3">

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