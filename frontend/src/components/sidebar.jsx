import React from "react";
import { Nav } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function Sidebar({ onClose }) {
  const location = useLocation();

  // Get logged-in user
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("mams_user"));
  } catch (error) {
    user = null;
  }

  const role = Number(user?.user_role);
  const serviceId = user?.service_id;

  /*
    Role IDs:
    1 = Admin
    2 = Base Commander
    3 = Logistics Officer
  */

  const menuItems = [
    {
      name: "Dashboard",
      icon: "bi-grid-1x2-fill",
      path: "/dashboard",
      roles: [1, 2, 3],
      serviceIds: [1, "com67", "log85"],
    },
    {
      name: "Purchases",
      icon: "bi-cart3",
      path: "/purchases",
      roles: [1, 2, 3],
      serviceIds: ["1", "com67", "log85"],
    },
    {
      name: "Transfers",
      icon: "bi-arrow-left-right",
      path: "/transfers",
      roles: [1, 2, 3],
      serviceIds: ["1", "com67", "log85"],
    },
    {
      name: "Assignments & Expenditures",
      icon: "bi-people",
      path: "/assignments",
      roles: [1, 2],
      serviceIds: ["1", "com67"],
    },
    {
      name: "Audit Logs",
      icon: "bi-journal-text",
      path: "/audit-logs",
      roles: [1],
      serviceIds: ["1"],
    },
    {
      name: "Approvals ",
      icon: "bi bi-check2-square",
      path: "/approvals",
      roles: [1],
      serviceIds: ["1", "com67"],
    },
  ];

  const visibleMenuItems = menuItems.filter(
    (item) =>
      item.roles?.includes(role) || item.serviceIds?.includes(serviceId)
  );

  // Role name
  const getRoleName = () => {
    switch (role) {
      case 1:
        return "Administrator";

      case 2:
        return "Base Commander";

      case 3:
        return "Logistics Officer";

      default:
        return "User";
    }
  };

  return (
    <aside className="mams-sidebar">

      {/* =========================
          LOGO
      ========================== */}
      <div className="mams-brand">

        <div className="mams-logo">
          <img src="/Logo.png" style={{ width: "120px", height: "120px", objectFit: "contain" }}alt="MAMS Logo" />
        </div>

        <div>
          <div className="mams-brand-title">
            Military Asset
          </div>

          <div className="mams-brand-title">
            Management System
          </div>
        </div>

      </div>


      {/* =========================
          USER INFORMATION
      ========================== */}
      <div className="px-3 mb-3">

        <div className="d-flex align-items-center">

          {/* Avatar */}
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
            style={{
              width: "38px",
              height: "38px",
              minWidth: "38px",
            }}
          >
            <i className="bi bi-person-fill"></i>
          </div>

          {/* User details */}
          <div className="overflow-hidden">

            <div
              className="fw-semibold text-truncate"
              style={{ fontSize: "14px" }}
            >
              {user?.username || "User"}
            </div>

            <small className="text-muted">
              {getRoleName()}
            </small>

          </div>

        </div>

      </div>


      {/* =========================
          MAIN NAVIGATION
      ========================== */}
      <Nav className="mams-navigation flex-column">

        {visibleMenuItems.map((item) => {

          const active =
            location.pathname === item.path ||
            (item.path === "/dashboard" &&
              location.pathname === "/");

          return (
            <Nav.Item key={item.path}>

              <Nav.Link
                as={Link}
                to={item.path}
                onClick={onClose}
                className={`mams-nav-link ${
                  active ? "active" : ""
                }`}
              >

                <i className={`bi ${item.icon}`}></i>

                <span>
                  {item.name}
                </span>

              </Nav.Link>

            </Nav.Item>
          );
        })}


        {/* =========================
            ADMINISTRATION
        ========================== */}
        {role === 1 && (
          <>
            <div className="px-3 mt-4 mb-2">

              <small className="text-muted fw-semibold">
                ADMINISTRATION
              </small>

            </div>

            <Nav.Item>

              <Nav.Link
                as={Link}
                to="/users"
                onClick={onClose}
                className={`mams-nav-link ${
                  location.pathname === "/users"
                    ? "active"
                    : ""
                }`}
              >

                <i className="bi bi-person-gear"></i>

                <span>
                  User Management
                </span>

              </Nav.Link>

            </Nav.Item>
          </>
        )}

      </Nav>


      {/* =========================
          BOTTOM MENU
      ========================== */}
      <div className="mams-sidebar-bottom">

        {/* Profile */}
        <Nav.Link
          as={Link}
          to="/profile"
          onClick={onClose}
          className={`mams-nav-link ${
            location.pathname === "/profile"
              ? "active"
              : ""
          }`}
        >

          <i className="bi bi-person-circle"></i>

          <span>
            My Profile
          </span>

        </Nav.Link>


        {/* Settings */}
        <Nav.Link
          as={Link}
          to="/settings"
          onClick={onClose}
          className={`mams-nav-link ${
            location.pathname === "/settings"
              ? "active"
              : ""
          }`}
        >

          <i className="bi bi-gear"></i>

          <span>
            Settings
          </span>

        </Nav.Link>


        {/* Quote */}
        <div className="mams-quote">

          <p>
            "Strength through
            <br />
            proper asset management."
          </p>

          <div className="mams-quote-line"></div>

        </div>


        {/* Version */}
        <div className="mams-version">
          MAMS v1.0
        </div>

      </div>

    </aside>
  );
}