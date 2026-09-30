import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Badge, Button, Card, Col, Container, Form, InputGroup, Modal, Row, Table,
} from "react-bootstrap";

import Layout from "../components/layout";
import { apiRequest } from "../api";

const todayStr = () => new Date().toISOString().split("T")[0];

const EMPTY_ASSIGNMENT = {
  assetId: "", asset: "", type: "", personnel: "", rank: "",
  base: "", quantity: 1, date: "", returnDate: "", remarks: "",
};
const EMPTY_EXPENDITURE = {
  assetId: "", asset: "", type: "", quantity: "", base: "",
  purpose: "", personnel: "", date: "", remarks: "",
};
const PURPOSES = [
  "Training Exercise", "Field Operation", "Vehicle Operation",
  "Maintenance", "Emergency", "Other",
];

/* ---------- small helpers ---------- */

function StatusBadge({ status }) {
  return <Badge bg={status === "Returned" ? "secondary" : "success"}>{status}</Badge>;
}

function SummaryCard({ label, value, color, icon }) {
  return (
    <Col xs={12} sm={6} lg={3}>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body>
          <small className="text-muted">{label}</small>
          <div className="d-flex justify-content-between align-items-center mt-2">
            <h2 className={`fw-bold text-${color} mb-0`}>{value}</h2>
            <i className={`bi ${icon} text-${color} fs-2`}></i>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

function Field({ label, xs = 12, md = 6, children }) {
  return (
    <Col xs={xs} md={md}>
      <Form.Label>{label}</Form.Label>
      {children}
    </Col>
  );
}

function Info({ label, children, xs = 6 }) {
  return (
    <Col xs={xs}>
      <small className="text-muted">{label}</small>
      <div>{children}</div>
    </Col>
  );
}

/* ---------- page ---------- */

export default function AssignmentsExpenditures() {
  const [activeTab, setActiveTab] = useState("assignments");
  const [assignments, setAssignments] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [assets, setAssets] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [baseFilter, setBaseFilter] = useState("All Bases");
  const [typeFilter, setTypeFilter] = useState("All Equipment");

  const [modal, setModal] = useState(null); // "assignment" | "expenditure" | "details"
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState(EMPTY_ASSIGNMENT);
  const [expenditureForm, setExpenditureForm] = useState(EMPTY_EXPENDITURE);

  /* ---------- role (plain values, no hooks) ---------- */
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("mams_user") || "null"); }
    catch { return null; }
  })();
  const role = String(currentUser?.user_role ?? "").trim().toUpperCase();
  const userBaseId = Number(currentUser?.base ?? currentUser?.base_id ?? 0);
  const isAdmin = role === "1" || role === "ADMIN";
  const isBaseCommander =
    role === "2" || role === "BC001" || role === "COMMANDER" || role === "BASE COMMANDER";

  /* ---------- data loading ---------- */
  const loadData = async () => {
    const [aRows, eRows, assetRows, baseRows, typeRows] = await Promise.all([
      apiRequest("/api/v1/assignments/?limit=500"),
      apiRequest("/api/v1/expenditures/?limit=500"),
      apiRequest("/api/v1/assets/"),
      apiRequest("/api/v1/bases/"),
      apiRequest("/api/v1/equipment-types/"),
    ]);

    const common = (r) => {
      const asset = assetRows.find((x) => x.id === r.asset_id);
      return {
        dbId: r.id,
        assetDbId: r.asset_id,
        assetId: asset?.asset_code || String(r.asset_id),
        asset: asset?.asset_name || "Unknown asset",
        type: typeRows.find((t) => t.id === asset?.equipment_type_id)?.type_name || "Unknown",
        base: baseRows.find((b) => b.id === r.base_id)?.base_name || "Unknown",
        quantity: r.quantity,
        status: r.status,
        remarks: r.remarks || "",
      };
    };

    setAssets(assetRows);
    setBases(baseRows);
    setEquipmentTypes(typeRows);
    setAssignments(aRows.map((r) => ({
      ...common(r),
      id: r.assignment_number,
      personnel: r.personnel_name,
      rank: r.personnel_service_id || "",
      date: r.assigned_date,
      returnDate: r.expected_return_date || "",
    })));
    setExpenditures(eRows.map((r) => ({
      ...common(r),
      id: r.expenditure_number || `EXP-${1000 + r.id}`,
      purpose: r.purpose || "",
      personnel: r.personnel_name || "",
      date: r.expenditure_date,
    })));
  };

  useEffect(() => {
  if (!isAdmin && !isBaseCommander) return;
  loadData().catch((e) => setError(e.message));
}, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- derived data (all hooks BEFORE the role guard) ---------- */
  const matches = (item, fields) => {
    const q = search.toLowerCase();
    return (
      fields.some((f) => String(item[f] ?? "").toLowerCase().includes(q)) &&
      (baseFilter === "All Bases" || item.base === baseFilter) &&
      (typeFilter === "All Equipment" || item.type === typeFilter)
    );
  };

  const filteredAssignments = useMemo(
    () => assignments.filter((i) => matches(i, ["id", "asset", "personnel", "base"])),
    [assignments, search, baseFilter, typeFilter] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const filteredExpenditures = useMemo(
    () => expenditures.filter((i) => matches(i, ["id", "asset", "personnel", "purpose", "base"])),
    [expenditures, search, baseFilter, typeFilter] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const activeByAsset = useMemo(() => {
    const map = new Map();
    assignments
      .filter((a) => a.status === "Active")
      .forEach((a) => map.set(a.assetDbId, (map.get(a.assetDbId) || 0) + Number(a.quantity)));
    return map;
  }, [assignments]);

  /* ---------- role guard ---------- */
  if (!isAdmin && !isBaseCommander) {
    return (
      <Layout title="Assignments & Expenditures">
        <Container fluid className="py-4">
          <Alert variant="info">
            This page is available to Administrators and Base Commanders.
          </Alert>
        </Container>
      </Layout>
    );
  }

  /* ---------- helpers that depend on data ---------- */
  const visibleAssets = assets.filter((a) => isAdmin || Number(a.base_id) === userBaseId);
  const baseOptions = bases.filter((b) => isAdmin || b.id === userBaseId);
  const availableOf = (asset) => asset.quantity - (activeByAsset.get(asset.id) || 0);
  const maxQty = (id) => {
    const a = assets.find((x) => x.id === Number(id));
    return a ? availableOf(a) : undefined;
  };
  const baseName = (id) => bases.find((b) => b.id === Number(id))?.base_name || "";

  const activeAssignments = assignments.filter((i) => i.status === "Active");
  const assignedQuantity = activeAssignments.reduce((t, i) => t + Number(i.quantity), 0);
  const expenditureQuantity = expenditures.reduce((t, i) => t + Number(i.quantity), 0);
  const ammunitionExpended = expenditures
    .filter((i) => i.type === "Ammunition")
    .reduce((t, i) => t + Number(i.quantity), 0);

  /* ---------- form handlers ---------- */
  const change = (setForm) => (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const pickAsset = (setForm) => (e) => {
    const asset = assets.find((a) => a.id === Number(e.target.value));
    setForm((p) => ({
      ...p,
      assetId: e.target.value,
      asset: asset?.asset_name || "",
      type: equipmentTypes.find((t) => t.id === asset?.equipment_type_id)?.type_name || "",
      base: asset ? String(asset.base_id) : "",
    }));
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 3000);
  };

  const submit = async (e, url, body, form, reset, message) => {
    e.preventDefault();
    setError("");
    const limit = maxQty(form.assetId);
    if (limit !== undefined && Number(form.quantity) > limit) {
      setError(`Only ${limit} available for this asset.`);
      return;
    }
    setSaving(true);
    try {
      await apiRequest(url, { method: "POST", body });
      await loadData();
      reset();
      setModal(null);
      showSuccess(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // user id is taken from the JWT on the server, so it is NOT sent here
  const createAssignment = (e) =>
    submit(
      e,
      "/api/v1/assignments/",
      {
        asset_id: Number(assignmentForm.assetId),
        personnel_name: assignmentForm.personnel.trim(),
        personnel_service_id: assignmentForm.rank.trim() || null,
        base_id: Number(assignmentForm.base),
        quantity: Number(assignmentForm.quantity),
        assigned_date: assignmentForm.date,
        expected_return_date: assignmentForm.returnDate || null,
        remarks: assignmentForm.remarks,
      },
      assignmentForm,
      () => setAssignmentForm(EMPTY_ASSIGNMENT),
      "Asset assigned successfully."
    );

  const createExpenditure = (e) =>
    submit(
      e,
      "/api/v1/expenditures/",
      {
        asset_id: Number(expenditureForm.assetId),
        base_id: Number(expenditureForm.base),
        quantity: Number(expenditureForm.quantity),
        purpose: expenditureForm.purpose,
        personnel_name: expenditureForm.personnel.trim(),
        expenditure_date: expenditureForm.date,
        remarks: expenditureForm.remarks,
      },
      expenditureForm,
      () => setExpenditureForm(EMPTY_EXPENDITURE),
      "Expenditure recorded successfully."
    );

  const returnAssignment = async (id) => {
    setError("");
    try {
      await apiRequest(`/api/v1/assignments/${id}/return`, { method: "PATCH" });
      await loadData();
      showSuccess("Asset marked as returned.");
    } catch (err) {
      setError(err.message);
    }
  };

  const openDetails = (record, type) => {
    setSelectedRecord({ ...record, recordType: type });
    setModal("details");
  };

  const assetOptions = () =>
    visibleAssets
      .filter((a) => availableOf(a) > 0)
      .map((a) => (
        <option key={a.id} value={a.id}>
          {a.asset_code} - {a.asset_name} ({availableOf(a)} available)
        </option>
      ));

  /* ---------- render ---------- */
  return (
    <Layout
      title="Assignments & Expenditures"
      subtitle="Manage issued assets and track asset expenditure."
    >
      <Container fluid className="py-4 px-3 px-md-4">
        <div className="d-flex justify-content-end mb-4">
          <Button
            variant={activeTab === "assignments" ? "primary" : "danger"}
            onClick={() => setModal(activeTab === "assignments" ? "assignment" : "expenditure")}
          >
            <i className="bi bi-plus-lg me-2"></i>
            {activeTab === "assignments" ? "New Assignment" : "Record Expenditure"}
          </Button>
        </div>

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess("")}>
            <i className="bi bi-check-circle-fill me-2"></i>
            {success}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* SUMMARY */}
        <Row className="g-3 mb-4">
          <SummaryCard label="Active Assignments" value={activeAssignments.length} color="success" icon="bi-person-check-fill" />
          <SummaryCard label="Assigned Assets" value={assignedQuantity} color="warning" icon="bi-box-seam-fill" />
          <SummaryCard label="Total Expended" value={expenditureQuantity} color="danger" icon="bi-box-arrow-down-fill" />
          <SummaryCard label="Ammunition Expended" value={ammunitionExpended} color="danger" icon="bi-crosshair" />
        </Row>

        {/* TABS */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-2">
            <Row className="g-2">
              {[
                ["assignments", "Assignments", "primary", "bi-person-badge-fill", assignments.length],
                ["expenditures", "Expenditures", "danger", "bi-box-arrow-down-fill", expenditures.length],
              ].map(([key, label, color, icon, count]) => (
                <Col xs={12} md={6} key={key}>
                  <Button
                    variant={activeTab === key ? color : "light"}
                    className="w-100 py-3"
                    onClick={() => setActiveTab(key)}
                  >
                    <i className={`bi ${icon} me-2`}></i>
                    {label}
                    <Badge
                      bg={activeTab === key ? "light" : color}
                      text={activeTab === key ? color : "white"}
                      className="ms-2"
                    >
                      {count}
                    </Badge>
                  </Button>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>

        {/* FILTERS */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body>
            <Row className="g-3">
              <Col xs={12} lg={6}>
                <InputGroup>
                  <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
                  <Form.Control
                    placeholder={
                      activeTab === "assignments"
                        ? "Search assignment, asset, personnel or base..."
                        : "Search expenditure, asset, personnel or purpose..."
                    }
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </InputGroup>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Form.Select value={baseFilter} onChange={(e) => setBaseFilter(e.target.value)}>
                  <option>All Bases</option>
                  {baseOptions.map((b) => <option key={b.id}>{b.base_name}</option>)}
                </Form.Select>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Form.Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option>All Equipment</option>
                  {equipmentTypes.map((t) => <option key={t.id}>{t.type_name}</option>)}
                </Form.Select>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ASSIGNMENTS TABLE */}
        {activeTab === "assignments" && (
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-0">Asset Assignments</h5>
                <small className="text-muted">Assets currently issued to personnel</small>
              </div>
              <Badge bg="light" text="dark">{filteredAssignments.length} Records</Badge>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-3">Assignment ID</th>
                    <th>Asset</th>
                    <th>Personnel</th>
                    <th>Base</th>
                    <th>Qty</th>
                    <th>Assigned Date</th>
                    <th>Return Date</th>
                    <th>Status</th>
                    <th className="text-end px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5 text-muted">
                        No assignment records found.
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((item) => (
                      <tr key={item.dbId}>
                        <td className="px-3 fw-semibold">{item.id}</td>
                        <td>
                          <div className="fw-semibold">{item.asset}</div>
                          <small className="text-muted">{item.assetId} • {item.type}</small>
                        </td>
                        <td>
                          <div className="fw-semibold">{item.personnel}</div>
                          <small className="text-muted">{item.rank}</small>
                        </td>
                        <td>{item.base}</td>
                        <td>{item.quantity}</td>
                        <td>{item.date}</td>
                        <td>{item.returnDate}</td>
                        <td><StatusBadge status={item.status} /></td>
                        <td className="text-end px-3">
                          <div className="d-flex justify-content-end gap-1">
                            <Button size="sm" variant="outline-primary" onClick={() => openDetails(item, "Assignment")}>
                              <i className="bi bi-eye"></i>
                            </Button>
                            {item.status === "Active" && (
                              <Button
                                size="sm"
                                variant="outline-success"
                                title="Return Asset"
                                onClick={() => returnAssignment(item.dbId)}
                              >
                                <i className="bi bi-arrow-return-left"></i>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {/* EXPENDITURES TABLE */}
        {activeTab === "expenditures" && (
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-0">Expenditure History</h5>
                <small className="text-muted">Assets consumed or expended during operations</small>
              </div>
              <Badge bg="light" text="dark">{filteredExpenditures.length} Records</Badge>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-3">Expenditure ID</th>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Base</th>
                    <th>Purpose</th>
                    <th>Personnel</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-end px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenditures.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-5 text-muted">
                        No expenditure records found.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenditures.map((item) => (
                      <tr key={item.dbId}>
                        <td className="px-3 fw-semibold">{item.id}</td>
                        <td>
                          <div className="fw-semibold">{item.asset}</div>
                          <small className="text-muted">{item.assetId}</small>
                        </td>
                        <td><Badge bg="light" text="dark">{item.type}</Badge></td>
                        <td className="fw-bold">{item.quantity}</td>
                        <td>{item.base}</td>
                        <td>{item.purpose}</td>
                        <td>{item.personnel}</td>
                        <td>{item.date}</td>
                        <td><StatusBadge status={item.status} /></td>
                        <td className="text-end px-3">
                          <Button size="sm" variant="outline-primary" onClick={() => openDetails(item, "Expenditure")}>
                            <i className="bi bi-eye"></i>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {/* ASSIGNMENT MODAL */}
        <Modal show={modal === "assignment"} onHide={() => setModal(null)} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold">
              <i className="bi bi-person-plus-fill text-primary me-2"></i>
              New Asset Assignment
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={createAssignment}>
            <Modal.Body>
              <Row className="g-3">
                <Field label="Asset ID">
                  <Form.Select name="assetId" value={assignmentForm.assetId} onChange={pickAsset(setAssignmentForm)} required>
                    <option value="">Select available asset</option>
                    {assetOptions()}
                  </Form.Select>
                </Field>
                <Field label="Asset / Equipment">
                  <Form.Control value={assignmentForm.asset} readOnly />
                </Field>
                <Field label="Equipment Type">
                  <Form.Control value={assignmentForm.type} readOnly />
                </Field>
                <Field label="Personnel">
                  <Form.Control name="personnel" value={assignmentForm.personnel} onChange={change(setAssignmentForm)} placeholder="Enter personnel name" required />
                </Field>
                <Field label="Service ID">
                  <Form.Control name="rank" value={assignmentForm.rank} onChange={change(setAssignmentForm)} placeholder="Service ID (optional)" />
                </Field>
                <Field label="Base">
                  <Form.Control value={baseName(assignmentForm.base)} readOnly />
                </Field>
                <Field label="Quantity" md={4}>
                  <Form.Control
                    type="number"
                    min="1"
                    max={maxQty(assignmentForm.assetId)}
                    name="quantity"
                    value={assignmentForm.quantity}
                    onChange={change(setAssignmentForm)}
                    required
                  />
                </Field>
                <Field label="Assignment Date" md={4}>
                  <Form.Control type="date" name="date" value={assignmentForm.date} onChange={change(setAssignmentForm)} required />
                </Field>
                <Field label="Expected Return" md={4}>
                  <Form.Control type="date" name="returnDate" min={assignmentForm.date || undefined} value={assignmentForm.returnDate} onChange={change(setAssignmentForm)} />
                </Field>
                <Field label="Remarks" md={12}>
                  <Form.Control as="textarea" rows={3} name="remarks" value={assignmentForm.remarks} onChange={change(setAssignmentForm)} placeholder="Enter assignment reason or remarks..." />
                </Field>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={saving}>
                <i className="bi bi-check-lg me-2"></i>
                {saving ? "Saving..." : "Assign Asset"}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* EXPENDITURE MODAL */}
        <Modal show={modal === "expenditure"} onHide={() => setModal(null)} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold">
              <i className="bi bi-box-arrow-down-fill text-danger me-2"></i>
              Record Expenditure
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={createExpenditure}>
            <Modal.Body>
              <Row className="g-3">
                <Field label="Asset ID">
                  <Form.Select name="assetId" value={expenditureForm.assetId} onChange={pickAsset(setExpenditureForm)} required>
                    <option value="">Select available asset</option>
                    {assetOptions()}
                  </Form.Select>
                </Field>
                <Field label="Asset / Item">
                  <Form.Control value={expenditureForm.asset} readOnly />
                </Field>
                <Field label="Equipment Type">
                  <Form.Control value={expenditureForm.type} readOnly />
                </Field>
                <Field label="Quantity Expended">
                  <Form.Control
                    type="number"
                    min="1"
                    max={maxQty(expenditureForm.assetId)}
                    name="quantity"
                    value={expenditureForm.quantity}
                    onChange={change(setExpenditureForm)}
                    placeholder="Enter quantity"
                    required
                  />
                </Field>
                <Field label="Base">
                  <Form.Control value={baseName(expenditureForm.base)} readOnly />
                </Field>
                <Field label="Expenditure Date">
                  <Form.Control type="date" name="date" max={todayStr()} value={expenditureForm.date} onChange={change(setExpenditureForm)} required />
                </Field>
                <Field label="Purpose">
                  <Form.Select name="purpose" value={expenditureForm.purpose} onChange={change(setExpenditureForm)} required>
                    <option value="">Select purpose</option>
                    {PURPOSES.map((p) => <option key={p}>{p}</option>)}
                  </Form.Select>
                </Field>
                <Field label="Personnel">
                  <Form.Control name="personnel" value={expenditureForm.personnel} onChange={change(setExpenditureForm)} placeholder="Enter personnel name" required />
                </Field>
                <Field label="Remarks" md={12}>
                  <Form.Control as="textarea" rows={3} name="remarks" value={expenditureForm.remarks} onChange={change(setExpenditureForm)} placeholder="Enter reason or additional details..." />
                </Field>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="danger" type="submit" disabled={saving}>
                <i className="bi bi-check-lg me-2"></i>
                {saving ? "Saving..." : "Record Expenditure"}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* DETAILS MODAL */}
        <Modal show={modal === "details"} onHide={() => setModal(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold">{selectedRecord?.recordType} Details</Modal.Title>
          </Modal.Header>
          {selectedRecord && (
            <Modal.Body>
              <div className="bg-light rounded p-3 mb-4">
                <small className="text-muted">Record ID</small>
                <h5 className="fw-bold mb-0">{selectedRecord.id}</h5>
              </div>
              <Row className="g-3">
                <Info label="Asset"><span className="fw-semibold">{selectedRecord.asset}</span></Info>
                <Info label="Asset ID">{selectedRecord.assetId}</Info>
                <Info label="Equipment Type">{selectedRecord.type}</Info>
                <Info label="Quantity"><span className="fw-bold">{selectedRecord.quantity}</span></Info>
                <Info label="Personnel">{selectedRecord.personnel}</Info>
                <Info label="Base">{selectedRecord.base}</Info>
                <Info label="Date">{selectedRecord.date}</Info>
                {selectedRecord.recordType === "Assignment" && (
                  <Info label="Return Date">{selectedRecord.returnDate || "-"}</Info>
                )}
                {selectedRecord.recordType === "Expenditure" && (
                  <Info label="Purpose">{selectedRecord.purpose}</Info>
                )}
                <Info label="Status" xs={12}><StatusBadge status={selectedRecord.status} /></Info>
                <Info label="Remarks" xs={12}>{selectedRecord.remarks || "-"}</Info>
              </Row>
            </Modal.Body>
          )}
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setModal(null)}>Close</Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
}