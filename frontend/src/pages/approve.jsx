import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import Layout from "../components/layout";
import { apiRequest, getCurrentUserId } from "../api";

const Approvals = () => {
  const [requests, setRequests] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [action, setAction] = useState("");
  const [processing, setProcessing] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("mams_user") || "null");
    } catch {
      return null;
    }
  }, []);

  const role = String(currentUser?.user_role || "");

  const isAdmin = role === "1";
  const isBaseCommander = role === "BC001";

  // --------------------------------------------------
  // Load approval requests
  // --------------------------------------------------

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      /*
       * Replace this endpoint with your actual approval endpoint.
       *
       * Recommended backend endpoint:
       * GET /api/v1/approvals/
       */

      const data = await apiRequest("/api/v1/approvals/");

      const formatted = Array.isArray(data)
        ? data.map((item) => ({
            id: item.id,
            requestNumber:
              item.request_number ||
              item.purchase_number ||
              item.transfer_number ||
              item.assignment_number ||
              item.expenditure_number ||
              `REQ-${item.id}`,

            type: item.type || item.request_type || "Unknown",

            base:
              item.base_name ||
              item.base ||
              "—",

            requestedBy:
              item.requested_by_name ||
              item.requested_by ||
              "—",

            date:
              item.created_at ||
              item.request_date ||
              item.purchase_date ||
              item.transfer_date ||
              "—",

            description:
              item.description ||
              item.reason ||
              item.asset_name ||
              "—",

            quantity: item.quantity ?? "—",

            status: item.status || "Pending",

            raw: item,
          }))
        : [];

      setRequests(formatted);
    } catch (err) {
      setError(err.message || "Unable to load approval requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // --------------------------------------------------
  // Filter
  // --------------------------------------------------

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesFilter =
        activeFilter === "All" ||
        request.type.toLowerCase() === activeFilter.toLowerCase();

      const searchText = search.toLowerCase();

      const matchesSearch =
        request.requestNumber.toLowerCase().includes(searchText) ||
        request.type.toLowerCase().includes(searchText) ||
        String(request.base).toLowerCase().includes(searchText) ||
        String(request.requestedBy).toLowerCase().includes(searchText);

      return matchesFilter && matchesSearch;
    });
  }, [requests, activeFilter, search]);

  // --------------------------------------------------
  // Status badge
  // --------------------------------------------------

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return <Badge bg="warning" text="dark">Pending</Badge>;

      case "Approved":
        return <Badge bg="success">Approved</Badge>;

      case "Rejected":
        return <Badge bg="danger">Rejected</Badge>;

      case "Cancelled":
        return <Badge bg="secondary">Cancelled</Badge>;

      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // --------------------------------------------------
  // Type badge
  // --------------------------------------------------

  const getTypeBadge = (type) => {
    const normalized = type.toLowerCase();

    if (normalized === "purchase") {
      return <Badge bg="primary">Purchase</Badge>;
    }

    if (normalized === "transfer") {
      return <Badge bg="info">Transfer</Badge>;
    }

    if (normalized === "assignment") {
      return <Badge bg="success">Assignment</Badge>;
    }

    if (normalized === "expenditure") {
      return <Badge bg="danger">Expenditure</Badge>;
    }

    return <Badge bg="secondary">{type}</Badge>;
  };

  // --------------------------------------------------
  // Open approval modal
  // --------------------------------------------------

  const openApprovalModal = (request, selectedAction) => {
    setSelectedRequest(request);
    setAction(selectedAction);
    setShowModal(true);
  };

  // --------------------------------------------------
  // Approve / Reject
  // --------------------------------------------------

  const handleApproval = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      setError("");

      /*
       * Recommended backend endpoint:
       *
       * PATCH /api/v1/approvals/{id}
       *
       * Body:
       * {
       *   status: "Approved",
       *   approved_by: currentUser.id
       * }
       */

    //   await apiRequest(
    //     `/api/v1/approvals/${selectedRequest.id}`,
    //     {
    //       method: "PATCH",
    //       body: {
    //         status: action === "approve" ? "Approved" : "Rejected",
    //         approved_by: getCurrentUserId(),
    //       },
    //     }
    //   );
    const status =
  action === "approve" ? "Approved" : "Rejected";

const requestType = selectedRequest.type.toLowerCase();

await apiRequest(
  `/api/v1/approvals/${requestType}/${selectedRequest.id}?status=${status}&approved_by=${getCurrentUserId()}`,
  {
    method: "PATCH",
  }
);

      setShowModal(false);
      setSelectedRequest(null);

      await loadRequests();
    } catch (err) {
      setError(err.message || "Unable to update approval.");
    } finally {
      setProcessing(false);
    }
  };

  // --------------------------------------------------
  // Counts
  // --------------------------------------------------

  const pendingCount = requests.filter(
    (item) => item.status === "Pending"
  ).length;

  const approvedCount = requests.filter(
    (item) => item.status === "Approved"
  ).length;

  const rejectedCount = requests.filter(
    (item) => item.status === "Rejected"
  ).length;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <Layout>
      <Container fluid className="py-4">

        {/* Header */}
        <Row className="align-items-center mb-4">
          <Col>
            <h3 className="fw-bold mb-1">
              Approvals
            </h3>

            <p className="text-muted mb-0">
              Review and approve operational requests
            </p>
          </Col>

          <Col xs="auto">
            <Button
              variant="outline-primary"
              onClick={loadRequests}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Refreshing
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Refresh
                </>
              )}
            </Button>
          </Col>
        </Row>

        {/* Permission message */}
        {!isAdmin && !isBaseCommander && (
          <Alert variant="warning">
            You do not have permission to approve requests.
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}

        {/* Summary cards */}
        <Row className="g-3 mb-4">

          <Col md={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small">
                      Pending Approval
                    </div>

                    <h3 className="fw-bold mb-0 mt-1">
                      {pendingCount}
                    </h3>
                  </div>

                  <div className="bg-warning bg-opacity-10 rounded p-3">
                    <i className="bi bi-hourglass-split fs-4 text-warning"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small">
                      Approved
                    </div>

                    <h3 className="fw-bold mb-0 mt-1">
                      {approvedCount}
                    </h3>
                  </div>

                  <div className="bg-success bg-opacity-10 rounded p-3">
                    <i className="bi bi-check-circle fs-4 text-success"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small">
                      Rejected
                    </div>

                    <h3 className="fw-bold mb-0 mt-1">
                      {rejectedCount}
                    </h3>
                  </div>

                  <div className="bg-danger bg-opacity-10 rounded p-3">
                    <i className="bi bi-x-circle fs-4 text-danger"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

        </Row>

        {/* Main card */}
        <Card className="border-0 shadow-sm">

          <Card.Header className="bg-white border-0 pt-4 px-4">

            <Row className="align-items-center g-3">

              <Col lg={5}>
                <h5 className="fw-bold mb-1">
                  Pending Requests
                </h5>

                <small className="text-muted">
                  Review requests submitted by logistics personnel
                </small>
              </Col>

              <Col lg={7}>
                <div className="d-flex gap-2 justify-content-lg-end">

                  <Form.Control
                    type="text"
                    placeholder="Search request..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ maxWidth: "250px" }}
                  />

                  <Form.Select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    style={{ maxWidth: "180px" }}
                  >
                    <option value="All">All Types</option>
                    <option value="Purchase">Purchases</option>
                    <option value="Transfer">Transfers</option>
                    <option value="Assignment">Assignments</option>
                    <option value="Expenditure">Expenditures</option>
                  </Form.Select>

                </div>
              </Col>

            </Row>

          </Card.Header>

          <Card.Body className="p-0">

            <div className="table-responsive">

              <Table hover className="mb-0 align-middle">

                <thead className="table-light">

                  <tr>
                    <th className="px-4">Request</th>
                    <th>Type</th>
                    <th>Base</th>
                    <th>Requested By</th>
                    <th>Date</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th className="text-end px-4">
                      Action
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center py-5"
                      >
                        <Spinner animation="border" />
                        <div className="text-muted mt-2">
                          Loading requests...
                        </div>
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center py-5"
                      >
                        <i className="bi bi-inbox fs-1 text-muted"></i>

                        <h6 className="mt-3">
                          No requests found
                        </h6>

                        <p className="text-muted mb-0">
                          There are no requests matching your filter.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => (

                      <tr key={request.id}>

                        <td className="px-4">
                          <div className="fw-semibold">
                            {request.requestNumber}
                          </div>

                          <small className="text-muted">
                            {request.description}
                          </small>
                        </td>

                        <td>
                          {getTypeBadge(request.type)}
                        </td>

                        <td>
                          {request.base}
                        </td>

                        <td>
                          {request.requestedBy}
                        </td>

                        <td>
                          {request.date}
                        </td>

                        <td>
                          {request.quantity}
                        </td>

                        <td>
                          {getStatusBadge(request.status)}
                        </td>

                        <td className="text-end px-4">

                          <div className="d-flex justify-content-end gap-2">

                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() =>
                                openApprovalModal(
                                  request,
                                  "view"
                                )
                              }
                            >
                              View
                            </Button>

                            {request.status === "Pending" &&
                              (isAdmin || isBaseCommander) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() =>
                                      openApprovalModal(
                                        request,
                                        "approve"
                                      )
                                    }
                                  >
                                    <i className="bi bi-check-lg me-1"></i>
                                    Approve
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() =>
                                      openApprovalModal(
                                        request,
                                        "reject"
                                      )
                                    }
                                  >
                                    <i className="bi bi-x-lg me-1"></i>
                                    Reject
                                  </Button>
                                </>
                              )}

                          </div>

                        </td>

                      </tr>

                    ))
                  )}

                </tbody>

              </Table>

            </div>

          </Card.Body>

        </Card>

      </Container>

      {/* View / Approval Modal */}
      <Modal
        show={showModal}
        onHide={() => !processing && setShowModal(false)}
        centered
      >

        <Modal.Header closeButton={!processing}>
          <Modal.Title>
            {action === "approve"
              ? "Approve Request"
              : action === "reject"
              ? "Reject Request"
              : "Request Details"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>

          {selectedRequest && (
            <>
              <div className="mb-3">
                <small className="text-muted">
                  Request Number
                </small>

                <div className="fw-bold">
                  {selectedRequest.requestNumber}
                </div>
              </div>

              <Row className="g-3">

                <Col xs={6}>
                  <small className="text-muted">
                    Request Type
                  </small>

                  <div>
                    {getTypeBadge(selectedRequest.type)}
                  </div>
                </Col>

                <Col xs={6}>
                  <small className="text-muted">
                    Status
                  </small>

                  <div>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </Col>

                <Col xs={6}>
                  <small className="text-muted">
                    Base
                  </small>

                  <div className="fw-semibold">
                    {selectedRequest.base}
                  </div>
                </Col>

                <Col xs={6}>
                  <small className="text-muted">
                    Requested By
                  </small>

                  <div className="fw-semibold">
                    {selectedRequest.requestedBy}
                  </div>
                </Col>

                <Col xs={6}>
                  <small className="text-muted">
                    Quantity
                  </small>

                  <div className="fw-semibold">
                    {selectedRequest.quantity}
                  </div>
                </Col>

                <Col xs={6}>
                  <small className="text-muted">
                    Date
                  </small>

                  <div className="fw-semibold">
                    {selectedRequest.date}
                  </div>
                </Col>

                <Col xs={12}>
                  <small className="text-muted">
                    Description / Reason
                  </small>

                  <div className="border rounded p-3 mt-1 bg-light">
                    {selectedRequest.description}
                  </div>
                </Col>

              </Row>
            </>
          )}

        </Modal.Body>

        {action !== "view" && (
          <Modal.Footer>

            <Button
              variant="secondary"
              onClick={() => setShowModal(false)}
              disabled={processing}
            >
              Cancel
            </Button>

            {action === "approve" && (
              <Button
                variant="success"
                onClick={handleApproval}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Spinner
                      size="sm"
                      className="me-2"
                    />
                    Approving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-2"></i>
                    Confirm Approval
                  </>
                )}
              </Button>
            )}

            {action === "reject" && (
              <Button
                variant="danger"
                onClick={handleApproval}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Spinner
                      size="sm"
                      className="me-2"
                    />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-x-lg me-2"></i>
                    Confirm Rejection
                  </>
                )}
              </Button>
            )}

          </Modal.Footer>
        )}

      </Modal>

    </Layout>
  );
};

export default Approvals;