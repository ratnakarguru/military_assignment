import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
} from "react-bootstrap";
import Layout from "../components/layout";

export default function Settings() {
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    emailNotifications: true,
    transferNotifications: true,
    purchaseNotifications: true,
    assignmentNotifications: true,
    auditNotifications: false,
    compactTable: false,
  });

  const handleChange = (e) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.checked,
    });
  };

  const saveSettings = () => {
    localStorage.setItem(
      "mams_settings",
      JSON.stringify(settings)
    );

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  return (
    <Layout
      title="Settings"
      subtitle="Manage your MAMS preferences and security settings"
    >
    <Container fluid className="py-4 px-3 px-md-4">

      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h3 className="fw-bold mb-1">
            Settings
          </h3>

          <p className="text-muted mb-0">
            Manage your MAMS preferences and security settings
          </p>
        </Col>
      </Row>

      {saved && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setSaved(false)}
        >
          <i className="bi bi-check-circle me-2"></i>
          Settings saved successfully.
        </Alert>
      )}

      <Row className="g-4">

        {/* Notifications */}
        <Col lg={7}>
          <Card className="border-0 shadow-sm mb-4">

            <Card.Header className="bg-white py-3">
              <h5 className="fw-bold mb-1">
                <i className="bi bi-bell me-2"></i>
                Notifications
              </h5>

              <small className="text-muted">
                Choose which system notifications you receive.
              </small>
            </Card.Header>

            <Card.Body>

              <Form.Check
                type="switch"
                id="emailNotifications"
                name="emailNotifications"
                label="Email Notifications"
                checked={settings.emailNotifications}
                onChange={handleChange}
                className="mb-3"
              />

              <Form.Check
                type="switch"
                id="transferNotifications"
                name="transferNotifications"
                label="Transfer Notifications"
                checked={settings.transferNotifications}
                onChange={handleChange}
                className="mb-3"
              />

              <Form.Check
                type="switch"
                id="purchaseNotifications"
                name="purchaseNotifications"
                label="Purchase Notifications"
                checked={settings.purchaseNotifications}
                onChange={handleChange}
                className="mb-3"
              />

              <Form.Check
                type="switch"
                id="assignmentNotifications"
                name="assignmentNotifications"
                label="Assignment Notifications"
                checked={settings.assignmentNotifications}
                onChange={handleChange}
                className="mb-3"
              />

              <Form.Check
                type="switch"
                id="auditNotifications"
                name="auditNotifications"
                label="Audit Log Notifications"
                checked={settings.auditNotifications}
                onChange={handleChange}
              />

            </Card.Body>
          </Card>

          {/* Display */}
          <Card className="border-0 shadow-sm">

            <Card.Header className="bg-white py-3">
              <h5 className="fw-bold mb-1">
                <i className="bi bi-display me-2"></i>
                Display
              </h5>

              <small className="text-muted">
                Customize the way information is displayed.
              </small>
            </Card.Header>

            <Card.Body>

              <Form.Check
                type="switch"
                id="compactTable"
                name="compactTable"
                label="Compact Tables"
                checked={settings.compactTable}
                onChange={handleChange}
              />

            </Card.Body>
          </Card>
        </Col>

        {/* Security */}
        <Col lg={5}>

          <Card className="border-0 shadow-sm mb-4">

            <Card.Header className="bg-white py-3">
              <h5 className="fw-bold mb-1">
                <i className="bi bi-shield-lock me-2"></i>
                Security
              </h5>
            </Card.Header>

            <Card.Body>

              <div className="d-flex justify-content-between
                align-items-center mb-3">

                <div>
                  <strong>Password</strong>
                  <small className="text-muted d-block">
                    Change your account password
                  </small>
                </div>

                <Button variant="outline-primary" size="sm">
                  Change
                </Button>

              </div>

              <hr />

              <div className="d-flex justify-content-between
                align-items-center">

                <div>
                  <strong>Active Session</strong>
                  <small className="text-muted d-block">
                    Current browser session
                  </small>
                </div>

                <span className="badge bg-success">
                  Active
                </span>

              </div>

            </Card.Body>
          </Card>

          {/* System */}
          <Card className="border-0 shadow-sm">

            <Card.Header className="bg-white py-3">
              <h5 className="fw-bold mb-1">
                <i className="bi bi-info-circle me-2"></i>
                System Information
              </h5>
            </Card.Header>

            <Card.Body>

              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">
                  Application
                </span>

                <strong>
                  MAMS
                </strong>
              </div>

              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">
                  Version
                </span>

                <strong>
                  1.0.0
                </strong>
              </div>

              <div className="d-flex justify-content-between">
                <span className="text-muted">
                  API Status
                </span>

                <span className="badge bg-success">
                  Connected
                </span>
              </div>

            </Card.Body>
          </Card>

        </Col>

      </Row>

      {/* Save */}
      <div className="d-flex justify-content-end mt-4">

        <Button
          variant="primary"
          size="lg"
          onClick={saveSettings}
        >
          <i className="bi bi-check-lg me-2"></i>
          Save Settings
        </Button>

      </div>

    </Container>
    </Layout>
  );
}