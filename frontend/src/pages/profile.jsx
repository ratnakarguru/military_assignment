import React from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Badge,
} from "react-bootstrap";
import Layout from "../components/layout";

export default function Profile() {
  const user = JSON.parse(localStorage.getItem("mams_user")) || {
    username: "System Admin",
    service_id: "ADM001",
    user_role: 1,
    role_name: "Admin",
    base_name: "All Bases",
    status: "Active",
  };

  return (
    <Layout
      title="My Profile"
      subtitle="View and manage your service profile"
    >
    <Container fluid className="py-4 px-3 px-md-4">

      {/* Page Header */}
      <Row className="align-items-center mb-4">
        <Col>
          <h3 className="fw-bold mb-1">My Profile</h3>
          <p className="text-muted mb-0">
            View and manage your service profile
          </p>
        </Col>

        <Col xs="auto">
          <Button variant="primary">
            <i className="bi bi-pencil me-2"></i>
            Edit Profile
          </Button>
        </Col>
      </Row>

      <Row className="g-4">

        {/* Profile Card */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center p-4">

              <div
                className="rounded-circle bg-primary text-white d-flex
                align-items-center justify-content-center mx-auto mb-3"
                style={{
                  width: "90px",
                  height: "90px",
                  fontSize: "32px",
                }}
              >
                <i className="bi bi-person"></i>
              </div>

              <h5 className="fw-bold mb-1">
                {user.username}
              </h5>

              <p className="text-muted mb-3">
                Service ID: {user.service_id}
              </p>

              <Badge bg="success" className="px-3 py-2">
                {user.status || "Active"}
              </Badge>

              <hr />

              <div className="text-start">

                <div className="mb-3">
                  <small className="text-muted d-block">
                    Role
                  </small>

                  <strong>
                    {user.role_name || "Administrator"}
                  </strong>
                </div>

                <div className="mb-3">
                  <small className="text-muted d-block">
                    Assigned Base
                  </small>

                  <strong>
                    {user.base_name || "All Bases"}
                  </strong>
                </div>

                <div>
                  <small className="text-muted d-block">
                    Account Status
                  </small>

                  <strong className="text-success">
                    Active
                  </strong>
                </div>

              </div>

            </Card.Body>
          </Card>
        </Col>

        {/* Personal Information */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-person-vcard me-2"></i>
                Service Information
              </h5>
            </Card.Header>

            <Card.Body>

              <Row className="g-3">

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">
                      Full Name
                    </Form.Label>

                    <Form.Control
                      value={user.username || ""}
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">
                      Service ID
                    </Form.Label>

                    <Form.Control
                      value={user.service_id || ""}
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">
                      Role
                    </Form.Label>

                    <Form.Control
                      value={user.role_name || "Administrator"}
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">
                      Assigned Base
                    </Form.Label>

                    <Form.Control
                      value={user.base_name || "All Bases"}
                      readOnly
                    />
                  </Form.Group>
                </Col>

              </Row>

            </Card.Body>
          </Card>

          {/* Access Information */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-shield-check me-2"></i>
                Access Information
              </h5>
            </Card.Header>

            <Card.Body>

              <Row className="g-3">

                <Col md={4}>
                  <div className="p-3 bg-light rounded">
                    <small className="text-muted d-block">
                      Dashboard
                    </small>
                    <strong className="text-success">
                      Allowed
                    </strong>
                  </div>
                </Col>

                <Col md={4}>
                  <div className="p-3 bg-light rounded">
                    <small className="text-muted d-block">
                      Asset Management
                    </small>
                    <strong className="text-success">
                      Allowed
                    </strong>
                  </div>
                </Col>

                <Col md={4}>
                  <div className="p-3 bg-light rounded">
                    <small className="text-muted d-block">
                      Audit Logs
                    </small>
                    <strong className="text-success">
                      Allowed
                    </strong>
                  </div>
                </Col>

              </Row>

            </Card.Body>
          </Card>
        </Col>

      </Row>
    </Container>
    </Layout>
  );
}