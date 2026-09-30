import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";

import Layout from "../components/layout";
import { apiRequest } from "../api";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("mams_user") || "null");
  } catch {
    return null;
  }
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// CREATE_PURCHASE -> "CREATE PURCHASE"
const prettyAction = (action) => String(action || "Unknown").replace(/_/g, " ");

const has = (action, ...words) => {
  const value = String(action || "").toLowerCase();
  return words.some((word) => value.includes(word));
};

const actionVariant = (action) => {
  if (has(action, "failed", "delete", "reject", "cancel")) return "danger";
  if (has(action, "login", "logout")) return "secondary";
  if (has(action, "transfer", "assign", "return")) return "warning";
  if (has(action, "update", "edit", "approve", "status")) return "primary";
  if (has(action, "create", "add", "purchase")) return "success";
  return "dark";
};

const actionIcon = (action) => {
  if (has(action, "failed")) return "bi-shield-exclamation";
  if (has(action, "login")) return "bi-box-arrow-in-right";
  if (has(action, "logout")) return "bi-box-arrow-right";
  if (has(action, "delete")) return "bi-trash";
  if (has(action, "reject", "cancel")) return "bi-x-circle";
  if (has(action, "approve")) return "bi-check-circle";
  if (has(action, "transfer")) return "bi-arrow-left-right";
  if (has(action, "assign", "return")) return "bi-person-check";
  if (has(action, "update", "edit", "status")) return "bi-pencil-square";
  if (has(action, "create", "add")) return "bi-plus-circle";
  return "bi-activity";
};

const isCritical = (action) =>
  has(action, "delete", "reject", "cancel", "failed");

function SummaryCard({ label, value, icon, tone }) {
  return (
    <Col xs={12} sm={6} xl={3}>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <small className="text-muted">{label}</small>
              <h3 className={`fw-bold mt-2 mb-0 text-${tone}`}>
                {value.toLocaleString()}
              </h3>
            </div>
            <div className={`fs-1 text-${tone}`}>
              <i className={`bi ${icon}`}></i>
            </div>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AuditLogs() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const role = String(currentUser?.user_role ?? currentUser?.role_id ?? "")
    .trim()
    .toUpperCase();
  const isAdmin = role === "1" || role === "ADMIN";

  const [logs, setLogs] = useState([]);
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [entityFilter, setEntityFilter] = useState("All");
  const [baseFilter, setBaseFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const loadAuditLogs = async (showRefresh = false) => {
    try {
      setError("");
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const [logRows, baseRows] = await Promise.all([
        apiRequest("/api/v1/audit-logs/?limit=500"),
        apiRequest("/api/v1/bases/"),
      ]);

      setLogs(Array.isArray(logRows) ? logRows : []);
      setBases(Array.isArray(baseRows) ? baseRows : []);
    } catch (requestError) {
      setError(requestError?.message || "Unable to load audit logs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Only Admin loads data; other roles never send the request
  useEffect(() => {
    if (!isAdmin) return;
    loadAuditLogs();
  }, [isAdmin]);

  const baseNameOf = (id) =>
    id
      ? bases.find((b) => Number(b.id) === Number(id))?.base_name || "-"
      : "-";

  /* ---------- filter options ---------- */
  const actionOptions = useMemo(
    () => [...new Set(logs.map((l) => l.action).filter(Boolean))].sort(),
    [logs]
  );

  const entityOptions = useMemo(
    () => [...new Set(logs.map((l) => l.entity_type).filter(Boolean))].sort(),
    [logs]
  );

  /* ---------- filtered logs ---------- */
  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      const logDate = log.created_at ? String(log.created_at).slice(0, 10) : "";

      const searchText = [
        log.username,
        log.service_id,
        log.description,
        log.entity_type,
        log.action,
        log.ip_address,
        baseNameOf(log.base_id),
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");

      return (
        (!query || searchText.includes(query)) &&
        (actionFilter === "All" || log.action === actionFilter) &&
        (entityFilter === "All" || log.entity_type === entityFilter) &&
        (baseFilter === "All" || String(log.base_id) === String(baseFilter)) &&
        (!dateFrom || logDate >= dateFrom) &&
        (!dateTo || logDate <= dateTo)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    logs,
    bases,
    search,
    actionFilter,
    entityFilter,
    baseFilter,
    dateFrom,
    dateTo,
  ]);

  /* ---------- summary ---------- */
  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: filteredLogs.length,
      todayCount: filteredLogs.filter(
        (l) => String(l.created_at || "").slice(0, 10) === today
      ).length,
      loginCount: filteredLogs.filter((l) => has(l.action, "login")).length,
      criticalCount: filteredLogs.filter((l) => isCritical(l.action)).length,
    };
  }, [filteredLogs]);

  const clearFilters = () => {
    setSearch("");
    setActionFilter("All");
    setEntityFilter("All");
    setBaseFilter("All");
    setDateFrom("");
    setDateTo("");
  };

  const openDetails = (log) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  const badRange = !!dateFrom && !!dateTo && dateFrom > dateTo;

  /* ---------- role gate (after all hooks) ---------- */
  if (!isAdmin) {
    return (
      <Layout
        title="Audit Logs"
        subtitle="Track system activity, user actions and operational changes"
      >
        <Container fluid className="py-4">
          <Alert variant="info">
            <i className="bi bi-shield-lock me-2"></i>
            Audit logs are available to Administrators only.
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout
      title="Audit Logs"
      subtitle="Track system activity, user actions and operational changes"
    >
      <Container fluid className="pb-4">
        {/* TOP ACTIONS */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h5 className="fw-bold mb-1">System Audit Trail</h5>
            <p className="text-muted mb-0">
              Review and monitor all recorded system activities. Records are
              read-only.
            </p>
          </div>

          <Button
            variant="outline-primary"
            onClick={() => loadAuditLogs(true)}
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : (
              <i className="bi bi-arrow-clockwise me-2"></i>
            )}
            {refreshing ? "Refreshing..." : "Refresh Logs"}
          </Button>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError("")}>
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {logs.length >= 500 && (
          <Alert variant="warning" className="py-2">
            Showing the latest 500 records. Use the filters to narrow down older
            activity.
          </Alert>
        )}

        {/* SUMMARY */}
        <Row className="g-3 mb-4">
          <SummaryCard
            label="Total Activities"
            value={summary.total}
            icon="bi-journal-text"
            tone="primary"
          />
          <SummaryCard
            label="Today's Activity"
            value={summary.todayCount}
            icon="bi-calendar-check"
            tone="success"
          />
          <SummaryCard
            label="Login Activities"
            value={summary.loginCount}
            icon="bi-person-check"
            tone="secondary"
          />
          <SummaryCard
            label="Critical Actions"
            value={summary.criticalCount}
            icon="bi-shield-exclamation"
            tone="danger"
          />
        </Row>

        {/* FILTERS */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body>
            <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
              <div>
                <h6 className="fw-bold mb-1">Audit Filters</h6>
                <small className="text-muted">
                  Filter activity by user, action, entity, base or date range.
                </small>
              </div>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={clearFilters}
              >
                <i className="bi bi-x-circle me-1"></i>
                Clear Filters
              </Button>
            </div>

            <Row className="g-3">
              <Col xs={12} lg={4}>
                <Form.Label className="small fw-semibold">Search</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <i className="bi bi-search"></i>
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search user, action, description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </InputGroup>
              </Col>

              <Col xs={12} sm={6} lg={2}>
                <Form.Label className="small fw-semibold">Action</Form.Label>
                <Form.Select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                >
                  <option value="All">All Actions</option>
                  {actionOptions.map((action) => (
                    <option key={action} value={action}>
                      {prettyAction(action)}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={12} sm={6} lg={2}>
                <Form.Label className="small fw-semibold">Entity</Form.Label>
                <Form.Select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                >
                  <option value="All">All Entities</option>
                  {entityOptions.map((entity) => (
                    <option key={entity} value={entity}>
                      {entity}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={12} sm={6} lg={2}>
                <Form.Label className="small fw-semibold">
                  User's Base
                </Form.Label>
                <Form.Select
                  value={baseFilter}
                  onChange={(e) => setBaseFilter(e.target.value)}
                >
                  <option value="All">All Bases</option>
                  {bases.map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.base_name}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={6} sm={3} lg={1}>
                <Form.Label className="small fw-semibold">From</Form.Label>
                <Form.Control
                  type="date"
                  value={dateFrom}
                  isInvalid={badRange}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </Col>

              <Col xs={6} sm={3} lg={1}>
                <Form.Label className="small fw-semibold">To</Form.Label>
                <Form.Control
                  type="date"
                  value={dateTo}
                  isInvalid={badRange}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* AUDIT TABLE */}
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white py-3">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
              <div>
                <h5 className="fw-bold mb-0">Activity History</h5>
                <small className="text-muted">
                  {filteredLogs.length} record
                  {filteredLogs.length !== 1 ? "s" : ""} found
                </small>
              </div>
              <Badge bg="light" text="dark" className="border">
                <i className="bi bi-shield-check me-1"></i>
                Audit Trail
              </Badge>
            </div>
          </Card.Header>

          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-3">Date & Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Record</th>
                    <th>User's Base</th>
                    <th>Description</th>
                    <th className="text-end pe-3">Details</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <div className="text-muted mt-2">
                          Loading audit logs...
                        </div>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <i className="bi bi-journal-x fs-1 text-muted"></i>
                        <div className="fw-semibold mt-3">
                          No audit records found
                        </div>
                        <small className="text-muted">
                          Try changing your filters.
                        </small>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-3 text-nowrap">
                          <div className="fw-semibold">
                            {formatDateTime(log.created_at)}
                          </div>
                        </td>

                        <td>
                          <div className="fw-semibold">
                            {log.username || "Unknown"}
                          </div>
                          {log.service_id && (
                            <small className="text-muted">
                              {log.service_id}
                            </small>
                          )}
                        </td>

                        <td>
                          <Badge bg={actionVariant(log.action)}>
                            <i
                              className={`bi ${actionIcon(log.action)} me-1`}
                            ></i>
                            {prettyAction(log.action)}
                          </Badge>
                        </td>

                        <td>
                          <Badge bg="light" text="dark" className="border">
                            {log.entity_type || "-"}
                          </Badge>
                        </td>

                        <td>
                          {log.entity_id ? (
                            <span className="fw-semibold">#{log.entity_id}</span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td>{baseNameOf(log.base_id)}</td>

                        <td
                          className="text-muted small"
                          style={{ maxWidth: 260 }}
                        >
                          <div className="text-truncate">
                            {log.description || "-"}
                          </div>
                        </td>

                        <td className="text-end pe-3">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => openDetails(log)}
                          >
                            <i className="bi bi-eye me-1"></i>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

        {/* DETAILS MODAL */}
        <Modal
          show={showDetails}
          onHide={() => setShowDetails(false)}
          centered
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold">Audit Log Details</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {selectedLog && (
              <>
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-3">
                    <i
                      className={`bi ${actionIcon(selectedLog.action)} fs-4`}
                    ></i>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1">
                      {prettyAction(selectedLog.action)}
                    </h5>
                    <small className="text-muted">
                      {formatDateTime(selectedLog.created_at)}
                    </small>
                  </div>
                </div>

                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Card className="bg-light border-0 h-100">
                      <Card.Body>
                        <small className="text-muted">User</small>
                        <div className="fw-semibold mt-1">
                          {selectedLog.username || "Unknown"}
                        </div>
                        {selectedLog.service_id && (
                          <small className="text-muted">
                            Service ID: {selectedLog.service_id}
                          </small>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12} md={6}>
                    <Card className="bg-light border-0 h-100">
                      <Card.Body>
                        <small className="text-muted">Entity</small>
                        <div className="fw-semibold mt-1">
                          {selectedLog.entity_type || "-"}
                        </div>
                        {selectedLog.entity_id && (
                          <small className="text-muted">
                            Record ID: #{selectedLog.entity_id}
                          </small>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12} md={6}>
                    <Card className="bg-light border-0">
                      <Card.Body>
                        <small className="text-muted">User's Base</small>
                        <div className="fw-semibold mt-1">
                          {baseNameOf(selectedLog.base_id)}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12} md={6}>
                    <Card className="bg-light border-0">
                      <Card.Body>
                        <small className="text-muted">IP Address</small>
                        <div className="fw-semibold mt-1">
                          {selectedLog.ip_address || "-"}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12}>
                    <Card className="bg-light border-0">
                      <Card.Body>
                        <small className="text-muted">Description</small>
                        <p className="mb-0 mt-2">
                          {selectedLog.description ||
                            "No description available."}
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
}