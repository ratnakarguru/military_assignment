import React, { useCallback, useEffect, useState } from "react";
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
  Tab,
  Table,
  Tabs,
} from "react-bootstrap";

import Layout from "../components/layout";
import { apiRequest } from "../api";

const EMPTY = {
  opening_balance: 0,
  purchases: 0,
  transfer_in: 0,
  transfer_out: 0,
  net_movement: 0,
  assigned: 0,
  expended: 0,
  closing_balance: 0,
};

const EMPTY_DETAILS = { purchases: [], transfer_in: [], transfer_out: [] };

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtSigned = (n) =>
  `${Number(n || 0) >= 0 ? "+" : "−"}${fmt(Math.abs(Number(n || 0)))}`;

const buildQuery = ({ baseId, typeId, from, to }) => {
  const qs = new URLSearchParams();
  if (baseId) qs.set("base_id", baseId);
  if (typeId) qs.set("equipment_type_id", typeId);
  if (from) qs.set("date_from", from);
  if (to) qs.set("date_to", to);
  return qs.toString();
};

/* ------------------------------------------------------------------ */
/* Small reusable pieces                                               */
/* ------------------------------------------------------------------ */

function MetricCard({ label, value, hint, icon, tone, onClick, actionLabel }) {
  return (
    <Card
      className="border-0 shadow-sm h-100"
      role={onClick ? "button" : undefined}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <Card.Body>
        <div className="d-flex justify-content-between">
          <div>
            <small className="text-muted">{label}</small>
            <h2 className={`fw-bold mt-2 mb-1 text-${tone}`}>{value}</h2>
            <small className="text-muted">{hint}</small>
          </div>
          <div className={`fs-1 text-${tone}`}>
            <i className={`bi ${icon}`}></i>
          </div>
        </div>
        {onClick && (
          <Button
            variant="link"
            className={`px-0 mt-2 text-decoration-none text-${tone}`}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            {actionLabel}
            <i className="bi bi-arrow-right ms-1"></i>
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}

function SummaryTable({ title, subtitle, firstHeader, rows, nameFor }) {
  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Header className="bg-white py-3">
        <h5 className="fw-bold mb-0">{title}</h5>
        <small className="text-muted">{subtitle}</small>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-3">{firstHeader}</th>
                <th className="text-end">Opening</th>
                <th className="text-end">Purchases</th>
                <th className="text-end">Transfer In</th>
                <th className="text-end">Transfer Out</th>
                <th className="text-end">Assigned</th>
                <th className="text-end">Expended</th>
                <th className="text-end">Closing</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    No data for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={index}>
                    <td className="px-3 fw-semibold">{nameFor(row)}</td>
                    <td className="text-end">{fmt(row.opening_balance)}</td>
                    <td className="text-end text-success">
                      {fmtSigned(row.purchases)}
                    </td>
                    <td className="text-end text-primary">
                      {fmtSigned(row.transfer_in)}
                    </td>
                    <td className="text-end text-warning">
                      −{fmt(row.transfer_out)}
                    </td>
                    <td className="text-end">{fmt(row.assigned)}</td>
                    <td className="text-end text-danger">{fmt(row.expended)}</td>
                    <td
                      className={`text-end fw-bold ${
                        row.closing_balance < 0 ? "text-danger" : "text-success"
                      }`}
                    >
                      {fmt(row.closing_balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
}

function EmptyRow({ cols, text }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center py-4 text-muted">
        {text}
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Net Movement pop-up (Purchases / Transfer In / Transfer Out)        */
/* ------------------------------------------------------------------ */

function NetMovementModal({ show, onHide, data, details, loading, baseName }) {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">Net Movement Details</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="bg-light rounded p-3 mb-3 text-center fw-bold">
          Purchases + Transfer In − Transfer Out ={" "}
          <span className="text-primary">{fmtSigned(data.net_movement)}</span>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : (
          <Tabs defaultActiveKey="purchases" className="mb-3" fill>
            <Tab
              eventKey="purchases"
              title={`Purchases (${fmt(data.purchases)})`}
            >
              <div className="table-responsive">
                <Table hover size="sm" className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Asset</th>
                      <th>Base</th>
                      <th className="text-end">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.purchases.length === 0 ? (
                      <EmptyRow cols={5} text="No received purchases." />
                    ) : (
                      details.purchases.map((p) => (
                        <tr key={p.purchase_number}>
                          <td className="fw-semibold">{p.purchase_number}</td>
                          <td>{p.date}</td>
                          <td>{p.asset_name}</td>
                          <td>{baseName(p.base_id)}</td>
                          <td className="text-end">{fmt(p.quantity)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </Tab>

            <Tab
              eventKey="in"
              title={`Transfer In (${fmt(data.transfer_in)})`}
            >
              <TransferTable rows={details.transfer_in} baseName={baseName} />
            </Tab>

            <Tab
              eventKey="out"
              title={`Transfer Out (${fmt(data.transfer_out)})`}
            >
              <TransferTable rows={details.transfer_out} baseName={baseName} />
            </Tab>
          </Tabs>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function TransferTable({ rows, baseName }) {
  return (
    <div className="table-responsive">
      <Table hover size="sm" className="align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Asset</th>
            <th>From</th>
            <th>To</th>
            <th className="text-end">Qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow cols={6} text="No completed transfers." />
          ) : (
            rows.map((t) => (
              <tr key={t.transfer_number}>
                <td className="fw-semibold">{t.transfer_number}</td>
                <td>{t.date}</td>
                <td>{t.asset_name}</td>
                <td>{baseName(t.from_base_id)}</td>
                <td>{baseName(t.to_base_id)}</td>
                <td className="text-end">{fmt(t.quantity)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Assigned / Expended pop-up                                          */
/* ------------------------------------------------------------------ */

function RecordsModal({ show, onHide, kind, filters, scopeBaseId, baseName }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const isAssigned = kind === "assigned";

  useEffect(() => {
    if (!show) return undefined;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [records, assets] = await Promise.all([
          apiRequest(
            isAssigned ? "/api/v1/assignments/" : "/api/v1/expenditures/"
          ),
          apiRequest("/api/v1/assets/"),
        ]);
        const assetById = new Map(assets.map((a) => [Number(a.id), a]));
        const today = new Date().toISOString().slice(0, 10);

        const mapped = records
          .filter((r) => {
            if (isAssigned ? r.status !== "Active" : r.status !== "Recorded")
              return false;
            if (scopeBaseId && Number(r.base_id) !== Number(scopeBaseId))
              return false;

            const asset = assetById.get(Number(r.asset_id));
            if (
              filters.typeId &&
              Number(asset?.equipment_type_id) !== Number(filters.typeId)
            )
              return false;

            const d = String(
              (isAssigned ? r.assigned_date : r.expenditure_date) || ""
            ).slice(0, 10);
            if (isAssigned) return d <= (filters.to || today);
            if (filters.from && d < filters.from) return false;
            if (filters.to && d > filters.to) return false;
            return true;
          })
          .map((r) => ({
            id: isAssigned ? r.assignment_number : r.expenditure_number,
            date: isAssigned ? r.assigned_date : r.expenditure_date,
            asset:
              assetById.get(Number(r.asset_id))?.asset_name || "Unknown asset",
            base: baseName(r.base_id),
            quantity: r.quantity,
          }))
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
          .slice(0, 100);

        if (!cancelled) setRows(mapped);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [show, isAssigned, filters.typeId, filters.from, filters.to, scopeBaseId]);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">
          {isAssigned ? "Assigned Assets" : "Expenditures"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {err && <Alert variant="danger">{err}</Alert>}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Asset</th>
                  <th>Base</th>
                  <th className="text-end">Qty</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <EmptyRow
                    cols={5}
                    text={
                      isAssigned
                        ? "No active assignments."
                        : "No expenditures recorded."
                    }
                  />
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">{r.id}</td>
                      <td>{r.date}</td>
                      <td>{r.asset}</td>
                      <td>{r.base}</td>
                      <td className="text-end">{fmt(r.quantity)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard page                                                      */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  // ---- current user (UI only; the backend enforces the real rules) ----
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mams_user")) || null;
    } catch {
      return null;
    }
  });

  const role = String(currentUser?.user_role ?? currentUser?.role_id ?? "")
    .trim()
    .toUpperCase();
  const userBaseId = Number(currentUser?.base ?? currentUser?.base_id ?? 0);
  const isAdmin = role === "1" || role === "ADMIN";
  const isBaseCommander =
    role === "2" || role === "BC001" || role === "BASE COMMANDER";
  const canViewDashboard = isAdmin || isBaseCommander;

  // ---- state ----
  const [bases, setBases] = useState([]);
  const [types, setTypes] = useState([]);
  const [data, setData] = useState(EMPTY);
  const [byBase, setByBase] = useState([]);
  const [byType, setByType] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    baseId: isBaseCommander && userBaseId ? String(userBaseId) : "",
    typeId: "",
    from: "",
    to: "",
  });

  const [showNet, setShowNet] = useState(false);
  const [netDetails, setNetDetails] = useState(EMPTY_DETAILS);
  const [netLoading, setNetLoading] = useState(false);
  const [showAssigned, setShowAssigned] = useState(false);
  const [showExpended, setShowExpended] = useState(false);

  const badRange = !!filters.from && !!filters.to && filters.from > filters.to;
  const scopeBaseId = isBaseCommander ? userBaseId : filters.baseId;

  const baseName = useCallback(
    (id) =>
      bases.find((b) => Number(b.id) === Number(id))?.base_name ||
      `Base #${id}`,
    [bases]
  );
  const typeName = useCallback(
    (id) =>
      types.find((t) => Number(t.id) === Number(id))?.type_name ||
      `Type #${id}`,
    [types]
  );

  // ---- load base and equipment lists once ----
  useEffect(() => {
    if (!canViewDashboard) return;
    Promise.all([
      apiRequest("/api/v1/bases/"),
      apiRequest("/api/v1/equipment-types/"),
    ])
      .then(([baseRows, typeRows]) => {
        setBases(baseRows);
        setTypes(typeRows);
      })
      .catch((e) => setError(e.message));
  }, [canViewDashboard]);

  // ---- load dashboard numbers (server does all the maths) ----
  const loadDashboard = useCallback(async () => {
    if (!canViewDashboard || badRange) return;
    setLoading(true);
    setError("");

    const query = buildQuery(filters);
    try {
      const [summary, baseRows, typeRows] = await Promise.all([
        apiRequest(`/api/v1/dashboard/?${query}`),
        apiRequest(`/api/v1/dashboard/breakdown?group_by=base&${query}`),
        apiRequest(`/api/v1/dashboard/breakdown?group_by=equipment&${query}`),
      ]);
      setData({ ...EMPTY, ...summary });
      setByBase(baseRows);
      setByType(typeRows);
    } catch (e) {
      setError(e.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [canViewDashboard, badRange, filters]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ---- Net Movement pop-up data ----
  const openNetMovement = async () => {
    setShowNet(true);
    setNetLoading(true);
    try {
      const details = await apiRequest(
        `/api/v1/dashboard/net-movement-details?${buildQuery(filters)}`
      );
      setNetDetails({ ...EMPTY_DETAILS, ...details });
    } catch (e) {
      setError(e.message);
      setShowNet(false);
    } finally {
      setNetLoading(false);
    }
  };

  const updateFilter = (name, value) =>
    setFilters((previous) => ({ ...previous, [name]: value }));

  const clearFilters = () =>
    setFilters({
      baseId: isBaseCommander && userBaseId ? String(userBaseId) : "",
      typeId: "",
      from: "",
      to: "",
    });

  const negative = data.opening_balance < 0 || data.closing_balance < 0;

  // ---- role gate ----
  if (!canViewDashboard) {
    return (
      <Layout
        title="Command Dashboard"
        subtitle="Military Asset Management System overview"
      >
        <Container fluid className="py-4">
          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            The dashboard is available to Administrators and Base Commanders.
            Use the Purchases and Transfers pages for your work.
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout
      title="Command Dashboard"
      subtitle="Military Asset Management System overview"
    >
      <Container fluid className="pb-4">
        {/* HEADER */}
        <div className="d-flex justify-content-end align-items-center gap-2 mb-4 flex-wrap">
          <Badge bg={isAdmin ? "dark" : "primary"} className="px-3 py-2">
            <i className="bi bi-person-badge me-2"></i>
            {isAdmin
              ? "Administrator"
              : `Base Commander${
                  userBaseId ? ` · ${baseName(userBaseId)}` : ""
                }`}
          </Badge>

          <Button
            variant="outline-primary"
            onClick={loadDashboard}
            disabled={loading}
          >
            {loading ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : (
              <i className="bi bi-arrow-clockwise me-2"></i>
            )}
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {negative && (
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            A balance is negative. This usually means stock records and
            movement records do not match. Check the latest purchases,
            transfers and expenditures.
          </Alert>
        )}

        {/* FILTERS */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body>
            <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
              <div>
                <h6 className="fw-bold mb-1">Dashboard Filters</h6>
                <small className="text-muted">
                  Filter asset movement and balance information
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
              <Col xs={12} md={6} lg={3}>
                <Form.Label className="small fw-semibold">From date</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.from}
                  isInvalid={badRange}
                  onChange={(e) => updateFilter("from", e.target.value)}
                />
              </Col>

              <Col xs={12} md={6} lg={3}>
                <Form.Label className="small fw-semibold">To date</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.to}
                  isInvalid={badRange}
                  onChange={(e) => updateFilter("to", e.target.value)}
                />
                <Form.Control.Feedback type="invalid">
                  "To" must be after "From".
                </Form.Control.Feedback>
              </Col>

              <Col xs={12} md={6} lg={3}>
                <Form.Label className="small fw-semibold">Base</Form.Label>
                <Form.Select
                  value={filters.baseId}
                  onChange={(e) => updateFilter("baseId", e.target.value)}
                  disabled={isBaseCommander}
                >
                  {!isBaseCommander && <option value="">All Bases</option>}
                  {(isBaseCommander
                    ? bases.filter((b) => Number(b.id) === userBaseId)
                    : bases
                  ).map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.base_name}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={12} md={6} lg={3}>
                <Form.Label className="small fw-semibold">
                  Equipment Type
                </Form.Label>
                <Form.Select
                  value={filters.typeId}
                  onChange={(e) => updateFilter("typeId", e.target.value)}
                >
                  <option value="">All Equipment</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.type_name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* KEY METRICS */}
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} lg={4} xl>
            <MetricCard
              label="Opening Balance"
              value={fmt(data.opening_balance)}
              hint="Start of selected period"
              icon="bi-box-seam"
              tone="secondary"
            />
          </Col>

          <Col xs={12} sm={6} lg={4} xl>
            <MetricCard
              label="Net Movement"
              value={fmtSigned(data.net_movement)}
              hint="Purchases + In − Out"
              icon="bi-arrow-left-right"
              tone="primary"
              onClick={openNetMovement}
              actionLabel="View movement"
            />
          </Col>

          <Col xs={12} sm={6} lg={4} xl>
            <MetricCard
              label="Assigned"
              value={fmt(data.assigned)}
              hint="Currently assigned"
              icon="bi-person-badge"
              tone="warning"
              onClick={() => setShowAssigned(true)}
              actionLabel="View assignments"
            />
          </Col>

          <Col xs={12} sm={6} lg={4} xl>
            <MetricCard
              label="Expended"
              value={fmt(data.expended)}
              hint="Consumed in period"
              icon="bi-box-arrow-down"
              tone="danger"
              onClick={() => setShowExpended(true)}
              actionLabel="View expenditures"
            />
          </Col>

          <Col xs={12} sm={6} lg={4} xl>
            <MetricCard
              label="Closing Balance"
              value={fmt(data.closing_balance)}
              hint="End of selected period"
              icon="bi-boxes"
              tone="success"
            />
          </Col>
        </Row>

        {/* BALANCE FORMULA */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3">
            <h5 className="fw-bold mb-0">How the Closing Balance is built</h5>
            <small className="text-muted">
              Closing = Opening + Net Movement − Assigned − Expended
            </small>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-3">Component</th>
                    <th className="text-end">Quantity</th>
                    <th className="text-end pe-3">Effect</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3">Opening Balance</td>
                    <td className="text-end">{fmt(data.opening_balance)}</td>
                    <td className="text-end pe-3">
                      <Badge bg="secondary">Base</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3">Purchases</td>
                    <td className="text-end">{fmt(data.purchases)}</td>
                    <td className="text-end pe-3 text-success">+ Increase</td>
                  </tr>
                  <tr>
                    <td className="px-3">Transfer In</td>
                    <td className="text-end">{fmt(data.transfer_in)}</td>
                    <td className="text-end pe-3 text-success">+ Increase</td>
                  </tr>
                  <tr>
                    <td className="px-3">Transfer Out</td>
                    <td className="text-end">{fmt(data.transfer_out)}</td>
                    <td className="text-end pe-3 text-danger">− Decrease</td>
                  </tr>
                  <tr>
                    <td className="px-3">Assigned</td>
                    <td className="text-end">{fmt(data.assigned)}</td>
                    <td className="text-end pe-3 text-warning">− Allocated</td>
                  </tr>
                  <tr>
                    <td className="px-3">Expended</td>
                    <td className="text-end">{fmt(data.expended)}</td>
                    <td className="text-end pe-3 text-danger">− Consumed</td>
                  </tr>
                  <tr className="table-success fw-bold">
                    <td className="px-3">Closing Balance</td>
                    <td className="text-end">{fmt(data.closing_balance)}</td>
                    <td className="text-end pe-3">Available</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

        {/* SUMMARY TABLES */}
        <SummaryTable
          title="Equipment Position"
          subtitle="Balance and movement by equipment type"
          firstHeader="Equipment Type"
          rows={byType}
          nameFor={(row) => typeName(row.equipment_type_id)}
        />

        <SummaryTable
          title="Base-wise Asset Position"
          subtitle="Overview across operational bases"
          firstHeader="Base"
          rows={byBase}
          nameFor={(row) => (
            <>
              <i className="bi bi-building me-2 text-primary"></i>
              {baseName(row.base_id)}
            </>
          )}
        />

        {/* POP-UPS */}
        <NetMovementModal
          show={showNet}
          onHide={() => setShowNet(false)}
          data={data}
          details={netDetails}
          loading={netLoading}
          baseName={baseName}
        />

        <RecordsModal
          show={showAssigned}
          onHide={() => setShowAssigned(false)}
          kind="assigned"
          filters={filters}
          scopeBaseId={scopeBaseId}
          baseName={baseName}
        />

        <RecordsModal
          show={showExpended}
          onHide={() => setShowExpended(false)}
          kind="expended"
          filters={filters}
          scopeBaseId={scopeBaseId}
          baseName={baseName}
        />
      </Container>
    </Layout>
  );
}