import React from "react";
import { Button, Container, Row, Col, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-light min-vh-100 d-flex align-items-center">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} md={8} lg={6}>
            <Card className="border-0 shadow-sm text-center">
              <Card.Body className="p-5">

                {/* Icon */}
                <div className="mb-4">
                  <div
                    className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center"
                    style={{
                      width: "90px",
                      height: "90px",
                    }}
                  >
                    <i className="bi bi-shield-exclamation fs-1"></i>
                  </div>
                </div>

                {/* 404 */}
                <h1 className="display-1 fw-bold text-primary mb-0">
                  404
                </h1>

                {/* Title */}
                <h2 className="fw-bold text-dark mt-3">
                  Page Not Found
                </h2>

                {/* Description */}
                <p className="text-muted px-md-4 mt-3">
                  The page you are looking for doesn't exist,
                  may have been moved, or is temporarily unavailable.
                </p>

                {/* Buttons */}
                <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 mt-4">

                  <Button
                    variant="primary"
                    className="px-4"
                    onClick={() => navigate("/dashboard")}
                  >
                    <i className="bi bi-grid-1x2-fill me-2"></i>
                    Back to Dashboard
                  </Button>

                  <Button
                    variant="outline-secondary"
                    className="px-4"
                    onClick={() => navigate(-1)}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Go Back
                  </Button>

                </div>

                {/* System */}
                <div className="border-top mt-5 pt-4">
                  <small className="text-muted">
                    <i className="bi bi-shield-check me-2"></i>
                    Military Asset Management System
                  </small>
                </div>

              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default NotFound;