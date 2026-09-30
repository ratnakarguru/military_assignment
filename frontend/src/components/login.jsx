import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Alert,
  Spinner,
  InputGroup,
} from "react-bootstrap";
import { apiRequest, saveSession } from "../api";

const styles = `
  .mams-login-page {
    min-height: 100vh;
    width: 100%;
    overflow-y: auto;
  }

  .mams-login-page .row {
    min-height: 100vh;
    margin: 0;
  }

  /* ===== LEFT PANEL ===== */
  .mams-login-left {
    background: linear-gradient(180deg, #0b1b33 0%, #0f1f3d 100%);
    color: #ffffff;
    min-height: 100vh;
    padding: 3rem 2.5rem;
  }

  .mams-login-left-content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 100%;
    gap: 2.5rem;
    text-align: left;
  }

  .mams-login-brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    text-align: left;
  }

  .mams-login-emblem {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }

  .mams-login-brand-title {
    font-weight: 700;
    font-size: 1rem;
    line-height: 1.4;
  }

  .mams-login-message {
    text-align: left;
  }

  .mams-login-line {
    width: 48px;
    height: 3px;
    background: #3b82f6;
    margin-bottom: 1.25rem;
    border-radius: 2px;
  }

  .mams-login-message h2 {
    font-weight: 800;
    font-size: 2.25rem;
    line-height: 1.15;
    margin-bottom: 1rem;
  }

  .mams-login-message p {
    color: rgba(255, 255, 255, 0.65);
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0;
    max-width: 34ch;
  }

  .mams-system-status {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 1.25rem;
    text-align: left;
  }

  .mams-status-title {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 1rem;
  }

  .mams-status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.875rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .mams-status-row:last-child {
    border-bottom: none;
  }

  .mams-status-online {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #34d399;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.03em;
  }

  .mams-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #34d399;
    display: inline-block;
  }

  .mams-security-notice {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    text-align: left;
    font-size: 0.85rem;
  }

  .mams-security-notice strong {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.8rem;
    letter-spacing: 0.02em;
  }

  .mams-security-notice p {
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    line-height: 1.5;
  }

  .mams-login-version {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    text-align: left;
    letter-spacing: 0.03em;
  }

  /* ===== RIGHT PANEL ===== */
  .mams-login-right {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f5f9;
    min-height: 100vh;
    padding: 3rem 1.5rem;
  }

  .mams-login-container {
    max-width: 480px;
    width: 100%;
  }

  .mams-mobile-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 2rem;
    text-align: left;
  }

  .mams-mobile-emblem {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: #0f1f3d;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mams-login-form-wrapper {
    background: #ffffff;
    border-radius: 20px;
    padding: 2.5rem;
    box-shadow: 0 20px 40px rgba(15, 31, 61, 0.06);
    text-align: left;
  }

  .mams-login-heading {
    text-align: left;
    margin-bottom: 1.75rem;
  }

  .mams-login-overline {
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #3b82f6;
    margin-bottom: 0.5rem;
  }

  .mams-login-heading h1 {
    font-weight: 800;
    font-size: 1.85rem;
    margin-bottom: 0.5rem;
    color: #0f1f3d;
  }

  .mams-login-heading p {
    color: #6b7280;
    font-size: 0.9rem;
    margin: 0;
  }

  .mams-login-alert {
    text-align: left;
    font-size: 0.875rem;
  }

  .mams-login-form-wrapper .form-label {
    font-weight: 600;
    font-size: 0.875rem;
    color: #0f1f3d;
    text-align: left;
    width: 100%;
  }

  .optional-label {
    float: right;
    font-size: 0.7rem;
    font-weight: 600;
    color: #9ca3af;
    letter-spacing: 0.04em;
  }

  .mams-input-group .input-group-text {
    background: #f3f5f9;
    border-right: none;
    color: #6b7280;
  }

  .mams-input-group .form-control,
  .mams-input-group .form-select {
    border-left: none;
    box-shadow: none;
  }

  .mams-input-group .form-control:focus,
  .mams-input-group .form-select:focus {
    box-shadow: none;
    border-color: #cbd5e1;
  }

  .mams-login-form-wrapper .form-text {
    text-align: left;
    font-size: 0.78rem;
    margin-top: 0.35rem;
  }

  .mams-login-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
  }

  .mams-login-options a {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 600;
  }

  .mams-login-button {
    background: #0f1f3d;
    border: none;
    padding: 0.75rem 1rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mams-login-help {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    background: #eef2ff;
    border-radius: 12px;
    padding: 1rem 1.25rem;
    margin-top: 1.5rem;
    text-align: left;
  }

  .mams-help-icon {
    color: #3b82f6;
    flex-shrink: 0;
    margin-top: 0.15rem;
  }

  .mams-login-help strong {
    display: block;
    font-size: 0.875rem;
    color: #0f1f3d;
    margin-bottom: 0.15rem;
  }

  .mams-login-help p {
    margin: 0;
    font-size: 0.8rem;
    color: #6b7280;
    line-height: 1.5;
  }

  .mams-login-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 1.5rem;
    font-size: 0.8rem;
    color: #9ca3af;
    text-align: left;
  }
`;

export default function Login({ onLogin }) {
  const [serviceId, setServiceId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    const cleanServiceId = serviceId.trim();

    if (!cleanServiceId) {
      setError("Please enter your Service ID.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: {
          service_id: cleanServiceId,
          user_password: password,
        },
      });

      if (!data.access_token) {
  throw new Error("Server did not return a token. Check the backend login code.");
}
saveSession(data);

      if (onLogin) {
        await onLogin(data);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err instanceof TypeError && err.message === "Failed to fetch"
          ? "Unable to connect to the server. Make sure FastAPI is running on port 8000."
          : err.message || "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mams-login-page">
      <style>{styles}</style>
      <Row className="g-0">

        {/* ==================================================
            LEFT PANEL
        ================================================== */}

        <Col
          lg={6}
          xl={6}
          className="mams-login-left d-none d-lg-flex"
        >
          <div className="mams-login-left-content">

            {/* Brand */}

            <div className="mams-login-brand">
              <div className="mams-login-emblem">
                <img src="/152.png" style={{ width: "120px", height: "120px", objectFit: "contain" }}alt="MAMS Logo" />
              </div>

              <div>
                <div className="mams-login-brand-title">
                  Military Asset
                </div>

                <div className="mams-login-brand-title">
                  Management System
                </div>
              </div>
            </div>

            {/* Main message */}

            <div className="mams-login-message">
              <div className="mams-login-line"></div>

              <h2>
                Secure Asset
                <br />
                Management
              </h2>

              <p>
                Centralized management of military assets,
                transfers, assignments, purchases and
                expenditures.
              </p>
            </div>

            {/* System status */}

            <div className="mams-system-status">

              <div className="mams-status-title">
                SYSTEM STATUS
              </div>

              <div className="mams-status-row">
                <span>System</span>

                <span className="mams-status-online">
                  <span className="mams-status-dot"></span>
                  OPERATIONAL
                </span>
              </div>

              <div className="mams-status-row">
                <span>Access Model</span>
                <strong>ROLE-BASED</strong>
              </div>

              <div className="mams-status-row">
                <span>Audit Logging</span>
                <strong>ENABLED</strong>
              </div>

              <div className="mams-status-row">
                <span>Encryption</span>
                <strong>TLS 1.3</strong>
              </div>

            </div>

            {/* Security */}

            <div className="mams-security-notice">

              <i className="bi bi-shield-lock"></i>

              <div>
                <strong>
                  AUTHORIZED ACCESS ONLY
                </strong>

                <p>
                  All system activity is monitored and
                  recorded. Unauthorized access is
                  prohibited.
                </p>
              </div>

            </div>

            <div className="mams-login-version">
              MAMS v1.0 • SECURE CONSOLE
            </div>

          </div>
        </Col>

        {/* ==================================================
            RIGHT PANEL
        ================================================== */}

        <Col
          lg={6}
          xl={6}
          className="mams-login-right"
        >
          <Container className="mams-login-container">

            {/* Mobile brand */}

            <div className="d-lg-none mams-mobile-brand">

              <div className="mams-mobile-emblem">
                <i className="bi bi-stars"></i>
              </div>

              <div>
                <strong>Military Asset</strong>
                <br />
                <strong>Management System</strong>
              </div>

            </div>

            <div className="mams-login-form-wrapper">

              {/* Heading */}

              <div className="mams-login-heading">

                <span className="mams-login-overline">
                  SECURE CONSOLE
                </span>

                <h1>
                  Welcome back
                </h1>

                <p>
                  Sign in with your authorized service
                  credentials to continue.
                </p>

              </div>

              {/* Error */}

              {error && (
                <Alert
                  variant="danger"
                  className="mams-login-alert"
                  dismissible
                  onClose={() => setError("")}
                >
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </Alert>
              )}

              {/* Login form */}

              <Form method="POST" onSubmit={handleSubmit}>

                {/* SERVICE ID */}

                <Form.Group
                  className="mb-4"
                  controlId="serviceId"
                >
                  <Form.Label>
                    Service ID
                  </Form.Label>

                  <InputGroup className="mams-input-group">

                    <InputGroup.Text>
                      <i className="bi bi-person-badge"></i>
                    </InputGroup.Text>

                    <Form.Control
                      type="text"
                      placeholder="Enter your service ID"
                      value={serviceId}
                      onChange={(e) =>
                        setServiceId(e.target.value)
                      }
                      autoComplete="username"
                      autoFocus
                      disabled={loading}
                    />

                  </InputGroup>

                  <Form.Text>
                    Example: IN-ARMY-04821
                  </Form.Text>
                </Form.Group>

                {/* PASSWORD */}

                <Form.Group
                  className="mb-4"
                  controlId="password"
                >
                  <Form.Label>
                    Password
                  </Form.Label>

                  <InputGroup className="mams-input-group">

                    <InputGroup.Text>
                      <i className="bi bi-lock"></i>
                    </InputGroup.Text>

                    <Form.Control
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      autoComplete="current-password"
                      disabled={loading}
                    />

                    <Button
                      variant="outline-secondary"
                      type="button"
                      className="mams-password-button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      disabled={loading}
                    >
                      <i
                        className={
                          showPassword
                            ? "bi bi-eye-slash"
                            : "bi bi-eye"
                        }
                      ></i>
                    </Button>

                  </InputGroup>
                </Form.Group>

                {/* OPTIONS */}

                <div className="mams-login-options">

                  <Form.Check
                    type="checkbox"
                    id="remember"
                    label="Keep me signed in"
                    checked={remember}
                    onChange={(e) =>
                      setRemember(e.target.checked)
                    }
                    disabled={loading}
                  />

                  <a
                    href="/reset-credentials"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(
                        "Please contact your administrator to reset your credentials."
                      );
                    }}
                  >
                    Forgot password?
                  </a>

                </div>

                {/* LOGIN BUTTON */}

                <Button
                  type="submit"
                  className="mams-login-button w-100"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner
                        animation="border"
                        size="sm"
                        className="me-2"
                      />

                      Verifying credentials...
                    </>
                  ) : (
                    <>
                      Sign in to Console

                      <i className="bi bi-arrow-right ms-2"></i>
                    </>
                  )}
                </Button>

              </Form>

              {/* Help */}

              <div className="mams-login-help">

                <div className="mams-help-icon">
                  <i className="bi bi-info-circle"></i>
                </div>

                <div>
                  <strong>
                    Need access assistance?
                  </strong>

                  <p>
                    Contact your unit administrator or
                    Logistics IT Support for account
                    provisioning.
                  </p>
                </div>

              </div>

              {/* Footer */}

              <div className="mams-login-footer">

                <span>
                  <i className="bi bi-shield-check me-1"></i>
                  Secure connection
                </span>

                <span>
                  MAMS v1.0
                </span>

              </div>

            </div>
          </Container>
        </Col>

      </Row>
    </div>
  );
}