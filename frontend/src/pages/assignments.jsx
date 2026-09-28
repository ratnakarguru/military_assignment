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
  Table,
} from "react-bootstrap";

import Layout from "../components/layout";
import { apiRequest, getCurrentUserId } from "../api";

function AssignmentStatus({ status }) {
  if (status === "Active") {
    return <Badge bg="success">Active</Badge>;
  }

  return <Badge bg="secondary">Returned</Badge>;
}

function ExpenditureStatus({ status }) {
  return <Badge bg="success">{status}</Badge>;
}

export default function AssignmentsExpenditures() {
  const [activeTab, setActiveTab] = useState("assignments");

  const [assignments, setAssignments] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [assets, setAssets] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [error, setError] = useState("");

  const mapAssignment = (record, assetRows, baseRows, typeRows) => {
    const asset = assetRows.find((item) => item.id === record.asset_id);
    return {
      id: record.assignment_number,
      dbId: record.id,
      assetId: asset?.asset_code || String(record.asset_id),
      asset: asset?.asset_name || "Unknown asset",
      type: typeRows.find((type) => type.id === asset?.equipment_type_id)?.type_name || "Unknown",
      personnel: record.personnel_name,
      rank: record.personnel_service_id || "",
      base: baseRows.find((base) => base.id === record.base_id)?.base_name || "Unknown",
      quantity: record.quantity,
      date: record.assigned_date,
      returnDate: record.expected_return_date || "",
      status: record.status,
      remarks: record.remarks || "",
    };
  };

  const mapExpenditure = (record, assetRows, baseRows, typeRows) => {
    const asset = assetRows.find((item) => item.id === record.asset_id);
    return {
      id: record.expenditure_number,
      dbId: record.id,
      assetId: asset?.asset_code || String(record.asset_id),
      asset: asset?.asset_name || "Unknown asset",
      type: typeRows.find((type) => type.id === asset?.equipment_type_id)?.type_name || "Unknown",
      quantity: record.quantity,
      base: baseRows.find((base) => base.id === record.base_id)?.base_name || "Unknown",
      purpose: record.purpose || "",
      personnel: record.personnel_name || "",
      date: record.expenditure_date,
      status: record.status,
      remarks: record.remarks || "",
    };
  };

  const fetchData = async () => {
    const [assignmentRows, expenditureRows, assetRows, baseRows, typeRows] = await Promise.all([
      apiRequest("/api/v1/assignments/"),
      apiRequest("/api/v1/expenditures/"),
      apiRequest("/api/v1/assets/"),
      apiRequest("/api/v1/bases/"),
      apiRequest("/api/v1/equipment-types/"),
    ]);
    return {
      assetRows,
      baseRows,
      typeRows,
      assignments: assignmentRows.map((record) => mapAssignment(record, assetRows, baseRows, typeRows)),
      expenditures: expenditureRows.map((record) => mapExpenditure(record, assetRows, baseRows, typeRows)),
    };
  };

  const applyData = (data) => {
    const { assetRows, baseRows, typeRows } = data;
    setAssets(assetRows);
    setBases(baseRows);
    setEquipmentTypes(typeRows);
    setAssignments(data.assignments);
    setExpenditures(data.expenditures);
  };

  const loadData = async () => applyData(await fetchData());

  useEffect(() => {
    fetchData()
      .then(applyData)
      .catch((requestError) => setError(requestError.message));
  }, []);

  const [search, setSearch] = useState("");
  const [baseFilter, setBaseFilter] = useState("All Bases");
  const [typeFilter, setTypeFilter] =
    useState("All Equipment");

  const [showAssignmentModal, setShowAssignmentModal] =
    useState(false);

  const [showExpenditureModal, setShowExpenditureModal] =
    useState(false);

  const [showDetailsModal, setShowDetailsModal] =
    useState(false);

  const [selectedRecord, setSelectedRecord] =
    useState(null);

  const [success, setSuccess] = useState("");

  const [assignmentForm, setAssignmentForm] = useState({
    assetId: "",
    asset: "",
    type: "",
    personnel: "",
    rank: "",
    base: "",
    quantity: 1,
    date: "",
    returnDate: "",
    remarks: "",
  });

  const [expenditureForm, setExpenditureForm] = useState({
    assetId: "",
    asset: "",
    type: "",
    quantity: "",
    base: "",
    purpose: "",
    personnel: "",
    date: "",
    remarks: "",
  });

  /* =========================
     ASSIGNMENT FILTER
  ========================= */

  const filteredAssignments = useMemo(() => {
    const value = search.toLowerCase();

    return assignments.filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(value) ||
        item.asset.toLowerCase().includes(value) ||
        item.personnel.toLowerCase().includes(value) ||
        item.base.toLowerCase().includes(value);

      const matchesBase =
        baseFilter === "All Bases" ||
        item.base === baseFilter;

      const matchesType =
        typeFilter === "All Equipment" ||
        item.type === typeFilter;

      return (
        matchesSearch &&
        matchesBase &&
        matchesType
      );
    });
  }, [
    assignments,
    search,
    baseFilter,
    typeFilter,
  ]);

  /* =========================
     EXPENDITURE FILTER
  ========================= */

  const filteredExpenditures = useMemo(() => {
    const value = search.toLowerCase();

    return expenditures.filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(value) ||
        item.asset.toLowerCase().includes(value) ||
        item.personnel.toLowerCase().includes(value) ||
        item.purpose.toLowerCase().includes(value) ||
        item.base.toLowerCase().includes(value);

      const matchesBase =
        baseFilter === "All Bases" ||
        item.base === baseFilter;

      const matchesType =
        typeFilter === "All Equipment" ||
        item.type === typeFilter;

      return (
        matchesSearch &&
        matchesBase &&
        matchesType
      );
    });
  }, [
    expenditures,
    search,
    baseFilter,
    typeFilter,
  ]);

  /* =========================
     SUMMARY
  ========================= */

  const activeAssignments = assignments.filter(
    (item) => item.status === "Active"
  );

  const returnedAssignments = assignments.filter(
    (item) => item.status === "Returned"
  );

  const assignedQuantity = activeAssignments.reduce(
    (total, item) => total + Number(item.quantity),
    0
  );

  const expenditureQuantity = expenditures.reduce(
    (total, item) => total + Number(item.quantity),
    0
  );

  const ammunitionExpended = expenditures
    .filter((item) => item.type === "Ammunition")
    .reduce(
      (total, item) => total + Number(item.quantity),
      0
    );

  /* =========================
     FORM HANDLERS
  ========================= */

  const handleAssignmentChange = (e) => {
    const { name, value } = e.target;

    if (name === "assetId") {
      const asset = assets.find((item) => item.id === Number(value));
      setAssignmentForm((previous) => ({
        ...previous,
        assetId: value,
        asset: asset?.asset_name || "",
        type: equipmentTypes.find((type) => type.id === asset?.equipment_type_id)?.type_name || "",
        base: asset ? String(asset.base_id) : "",
      }));
      return;
    }

    setAssignmentForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleExpenditureChange = (e) => {
    const { name, value } = e.target;

    if (name === "assetId") {
      const asset = assets.find((item) => item.id === Number(value));
      setExpenditureForm((previous) => ({
        ...previous,
        assetId: value,
        asset: asset?.asset_name || "",
        type: equipmentTypes.find((type) => type.id === asset?.equipment_type_id)?.type_name || "",
        base: asset ? String(asset.base_id) : "",
      }));
      return;
    }

    setExpenditureForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =========================
     CREATE ASSIGNMENT
  ========================= */

  const createAssignment = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await apiRequest("/api/v1/assignments/", {
        method: "POST",
        body: {
          asset_id: Number(assignmentForm.assetId),
          personnel_name: assignmentForm.personnel.trim(),
          personnel_service_id: assignmentForm.rank.trim() || null,
          base_id: Number(assignmentForm.base),
          quantity: Number(assignmentForm.quantity),
          assigned_date: assignmentForm.date,
          expected_return_date: assignmentForm.returnDate || null,
          remarks: assignmentForm.remarks,
          assigned_by: getCurrentUserId(),
        },
      });
      await loadData();
      setAssignmentForm({ assetId: "", asset: "", type: "", personnel: "", rank: "", base: "", quantity: 1, date: "", returnDate: "", remarks: "" });
      setShowAssignmentModal(false);
      showSuccess("Asset assigned successfully.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  /* =========================
     CREATE EXPENDITURE
  ========================= */

  const createExpenditure = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await apiRequest("/api/v1/expenditures/", {
        method: "POST",
        body: {
          asset_id: Number(expenditureForm.assetId),
          base_id: Number(expenditureForm.base),
          quantity: Number(expenditureForm.quantity),
          purpose: expenditureForm.purpose,
          personnel_name: expenditureForm.personnel.trim(),
          expenditure_date: expenditureForm.date,
          remarks: expenditureForm.remarks,
          recorded_by: getCurrentUserId(),
        },
      });
      await loadData();
      setExpenditureForm({ assetId: "", asset: "", type: "", quantity: "", base: "", purpose: "", personnel: "", date: "", remarks: "" });
      setShowExpenditureModal(false);
      showSuccess("Expenditure recorded successfully.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const showSuccess = (message) => {
    setSuccess(message);

    setTimeout(() => {
      setSuccess("");
    }, 3000);
  };

  /* =========================
     RETURN ASSIGNMENT
  ========================= */

  const returnAssignment = async (id) => {
    setError("");
    try {
      await apiRequest(`/api/v1/assignments/${id}/return`, { method: "PATCH" });
      await loadData();
      showSuccess("Asset marked as returned.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const openDetails = (record, type) => {
    setSelectedRecord({
      ...record,
      recordType: type,
    });

    setShowDetailsModal(true);
  };

  return (
    <Layout
      title="Assignments & Expenditures"
      subtitle="Manage issued assets and track asset expenditure."
    >
      <Container fluid className="py-4 px-3 px-md-4">
      {/* ==================================================
          HEADER
      =================================================== */}

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <Button
          variant={
            activeTab === "assignments"
              ? "primary"
              : "danger"
          }
          onClick={() =>
            activeTab === "assignments"
              ? setShowAssignmentModal(true)
              : setShowExpenditureModal(true)
          }
        >
          <i className="bi bi-plus-lg me-2"></i>

          {activeTab === "assignments"
            ? "New Assignment"
            : "Record Expenditure"}
        </Button>
      </div>

      {success && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setSuccess("")}
        >
          <i className="bi bi-check-circle-fill me-2"></i>
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* ==================================================
          SUMMARY
      =================================================== */}

      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <small className="text-muted">
                Active Assignments
              </small>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <h2 className="fw-bold text-success mb-0">
                  {activeAssignments.length}
                </h2>

                <i className="bi bi-person-check-fill text-success fs-2"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <small className="text-muted">
                Assigned Assets
              </small>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <h2 className="fw-bold text-warning mb-0">
                  {assignedQuantity}
                </h2>

                <i className="bi bi-box-seam-fill text-warning fs-2"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <small className="text-muted">
                Total Expended
              </small>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <h2 className="fw-bold text-danger mb-0">
                  {expenditureQuantity}
                </h2>

                <i className="bi bi-box-arrow-down-fill text-danger fs-2"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <small className="text-muted">
                Ammunition Expended
              </small>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <h2 className="fw-bold text-danger mb-0">
                  {ammunitionExpended}
                </h2>

                <i className="bi bi-crosshair text-danger fs-2"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ==================================================
          TABS
      =================================================== */}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-2">
          <Row className="g-2">
            <Col xs={12} md={6}>
              <Button
                variant={
                  activeTab === "assignments"
                    ? "primary"
                    : "light"
                }
                className="w-100 py-3"
                onClick={() =>
                  setActiveTab("assignments")
                }
              >
                <i className="bi bi-person-badge-fill me-2"></i>
                Assignments
                <Badge
                  bg={
                    activeTab === "assignments"
                      ? "light"
                      : "primary"
                  }
                  text={
                    activeTab === "assignments"
                      ? "primary"
                      : "white"
                  }
                  className="ms-2"
                >
                  {assignments.length}
                </Badge>
              </Button>
            </Col>

            <Col xs={12} md={6}>
              <Button
                variant={
                  activeTab === "expenditures"
                    ? "danger"
                    : "light"
                }
                className="w-100 py-3"
                onClick={() =>
                  setActiveTab("expenditures")
                }
              >
                <i className="bi bi-box-arrow-down-fill me-2"></i>
                Expenditures
                <Badge
                  bg={
                    activeTab === "expenditures"
                      ? "light"
                      : "danger"
                  }
                  text={
                    activeTab === "expenditures"
                      ? "danger"
                      : "white"
                  }
                  className="ms-2"
                >
                  {expenditures.length}
                </Badge>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ==================================================
          FILTERS
      =================================================== */}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col xs={12} lg={6}>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>

                <Form.Control
                  placeholder={
                    activeTab === "assignments"
                      ? "Search assignment, asset, personnel or base..."
                      : "Search expenditure, asset, personnel or purpose..."
                  }
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />
              </InputGroup>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Form.Select
                value={baseFilter}
                onChange={(e) =>
                  setBaseFilter(e.target.value)
                }
              >
                <option>All Bases</option>

                {bases.map((base) => (
                  <option key={base.id}>
                    {base.base_name}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Form.Select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value)
                }
              >
                <option>All Equipment</option>

                {equipmentTypes.map((type) => (
                  <option key={type.id}>
                    {type.type_name}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ==================================================
          ASSIGNMENTS TAB
      =================================================== */}

      {activeTab === "assignments" && (
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white py-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-0">
                  Asset Assignments
                </h5>

                <small className="text-muted">
                  Assets currently issued to personnel
                </small>
              </div>

              <Badge bg="light" text="dark">
                {filteredAssignments.length} Records
              </Badge>
            </div>
          </Card.Header>

          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table
                hover
                responsive
                className="align-middle mb-0"
              >
                <thead className="table-light">
                  <tr>
                    <th className="px-3">
                      Assignment ID
                    </th>
                    <th>Asset</th>
                    <th>Personnel</th>
                    <th>Base</th>
                    <th>Qty</th>
                    <th>Assigned Date</th>
                    <th>Return Date</th>
                    <th>Status</th>
                    <th className="text-end px-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAssignments.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="text-center py-5 text-muted"
                      >
                        No assignment records found.
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 fw-semibold">
                          {item.id}
                        </td>

                        <td>
                          <div className="fw-semibold">
                            {item.asset}
                          </div>

                          <small className="text-muted">
                            {item.assetId} • {item.type}
                          </small>
                        </td>

                        <td>
                          <div className="fw-semibold">
                            {item.personnel}
                          </div>

                          <small className="text-muted">
                            {item.rank}
                          </small>
                        </td>

                        <td>{item.base}</td>

                        <td>{item.quantity}</td>

                        <td>{item.date}</td>

                        <td>{item.returnDate}</td>

                        <td>
                          <AssignmentStatus
                            status={item.status}
                          />
                        </td>

                        <td className="text-end px-3">
                          <div className="d-flex justify-content-end gap-1">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() =>
                                openDetails(
                                  item,
                                  "Assignment"
                                )
                              }
                            >
                              <i className="bi bi-eye"></i>
                            </Button>

                            {item.status ===
                              "Active" && (
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() =>
                                  returnAssignment(
                                    item.dbId
                                  )
                                }
                                title="Return Asset"
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
            </div>
          </Card.Body>
        </Card>
      )}

      {/* ==================================================
          EXPENDITURES TAB
      =================================================== */}

      {activeTab === "expenditures" && (
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white py-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-0">
                  Expenditure History
                </h5>

                <small className="text-muted">
                  Assets consumed or expended during operations
                </small>
              </div>

              <Badge bg="light" text="dark">
                {filteredExpenditures.length} Records
              </Badge>
            </div>
          </Card.Header>

          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table
                hover
                responsive
                className="align-middle mb-0"
              >
                <thead className="table-light">
                  <tr>
                    <th className="px-3">
                      Expenditure ID
                    </th>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Base</th>
                    <th>Purpose</th>
                    <th>Personnel</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-end px-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredExpenditures.length === 0 ? (
                    <tr>
                      <td
                        colSpan="10"
                        className="text-center py-5 text-muted"
                      >
                        No expenditure records found.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenditures.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 fw-semibold">
                          {item.id}
                        </td>

                        <td>
                          <div className="fw-semibold">
                            {item.asset}
                          </div>

                          <small className="text-muted">
                            {item.assetId}
                          </small>
                        </td>

                        <td>
                          <Badge
                            bg="light"
                            text="dark"
                          >
                            {item.type}
                          </Badge>
                        </td>

                        <td className="fw-bold">
                          {item.quantity}
                        </td>

                        <td>{item.base}</td>

                        <td>{item.purpose}</td>

                        <td>{item.personnel}</td>

                        <td>{item.date}</td>

                        <td>
                          <ExpenditureStatus
                            status={item.status}
                          />
                        </td>

                        <td className="text-end px-3">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() =>
                              openDetails(
                                item,
                                "Expenditure"
                              )
                            }
                          >
                            <i className="bi bi-eye"></i>
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
      )}

      {/* ==================================================
          ASSIGNMENT MODAL
      =================================================== */}

      <Modal
        show={showAssignmentModal}
        onHide={() =>
          setShowAssignmentModal(false)
        }
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            <i className="bi bi-person-plus-fill text-primary me-2"></i>
            New Asset Assignment
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={createAssignment}>
          <Modal.Body>
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Label>
                  Asset ID
                </Form.Label>

                <Form.Select
                  name="assetId"
                  value={assignmentForm.assetId}
                  onChange={handleAssignmentChange}
                  required
                >
                  <option value="">Select available asset</option>
                  {assets.filter((asset) => asset.quantity > 0).map((asset) => (
                    <option key={asset.id} value={asset.id}>{asset.asset_code} - {asset.asset_name} ({asset.quantity} available)</option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={12} md={6}>
                <Form.Label>
                  Asset / Equipment
                </Form.Label>

                <Form.Control
                  name="asset"
                  value={assignmentForm.asset}
                  readOnly
                />
              </Col>

              <Col xs={12} md={6}>
                <Form.Label>
                  Equipment Type
                </Form.Label>

                <Form.Select
                  value={assignmentForm.type}
                  disabled
                >
                  {equipmentTypes.map((type) => (
                    <option key={type.id} value={type.type_name}>{type.type_name}</option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={12} md={6}>
                <Form.Label>
                  Personnel
                </Form.Label>

                <Form.Control
                  name="personnel"
                  value={assignmentForm.personnel}
                  onChange={handleAssignmentChange}
                  placeholder="Enter personnel name"
                  required
                />
              </Col>

              <Col xs={12} md={6}>
                <Form.Label>
                  Rank
                </Form.Label>

                <Form.Control
                  name="rank"
                  value={assignmentForm.rank}
                  onChange={handleAssignmentChange}
                  placeholder="Service ID (optional)"
                />
              </Col>

              <Col xs={12} md={6}>
                <Form.Label>
                  Base
                </Form.Label>

                <Form.Select
                  name="base"
                  value={assignmentForm.base}
                  disabled
                >
                  {bases.map((base) => (
                    <option key={base.id} value={base.id}>{base.base_name}</option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={12} md={4}>
                <Form.Label>
                  Quantity
                </Form.Label>

                <Form.Control
                  type="number"
                  min="1"
                  name="quantity"
                  value={assignmentForm.quantity}
                  onChange={handleAssignmentChange}
                  required
                />
              </Col>

              <Col xs={12} md={4}>
                <Form.Label>
                  Assignment Date
                </Form.Label>

                <Form.Control
                  type="date"
                  name="date"
                  value={assignmentForm.date}
                  onChange={handleAssignmentChange}
                  required
                />
              </Col>

              <Col xs={12} md={4}>
                <Form.Label>
                  Expected Return
                </Form.Label>

                <Form.Control
                  type="date"
                  name="returnDate"
                  value={
                    assignmentForm.returnDate
                  }
                  onChange={handleAssignmentChange}
                />
              </Col>

              <Col xs={12}>
                <Form.Label>
                  Remarks
                </Form.Label>

                <Form.Control
                  as="textarea"
                  rows={3}
                  name="remarks"
                  value={assignmentForm.remarks}
                  onChange={handleAssignmentChange}
                  placeholder="Enter assignment reason or remarks..."
                />
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() =>
                setShowAssignmentModal(false)
              }
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              type="submit"
            >
              <i className="bi bi-check-lg me-2"></i>
              Assign Asset
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ==================================================
          EXPENDITURE MODAL
      =================================================== */}

      <Modal
        show={showExpenditureModal}
        onHide={() =>
          setShowExpenditureModal(false)
        }
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            <i className="bi bi-box-arrow-down-fill text-danger me-2"></i>
            Record Expenditure
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={createExpenditure}>
          <Modal.Body>
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Label>
                  Asset ID
                </Form.Label>

                <Form.Select
                  name="assetId"
                  value={expenditureForm.assetId}
                  onChange={handleExpenditureChange}
                  required
                >
                  <option value="">Select available asset</option>
                  {assets.filter((asset) => asset.quantity > 0).map((asset) => (
                    <option key={asset.id} value={asset.id}>{asset.asset_code} - {asset.asset_name} ({asset.quantity} available)</option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={12} md={6}>
                <Form.Label>
                  Asset / Item
                </Form.Label>

                <Form.Control
                  name="asset"
                  value={expenditureForm.asset}
                  readOnly
                />
              </Col>

              <Col xs={12} md={6}>
                <Form.Label>
                  Equipment Type
                </Form.Label>

                <Form.Select
                  value={expenditureForm.type}
                  disabled
                >
                  {equipmentTypes.map((type) => (
                    <option key={type.id} value={type.type_name}>{type.type_name}</option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={12} md={6}>
                <Form.Label>
                  Quantity Expended
                </Form.Label>

                <Form.Control
                  type="number"
                  min="1"
                  name="quantity"
                  value={
                    expenditureForm.quantity
                  }
                  onChange={handleExpenditureChange}
                  required
                  placeholder="Enter quantity"
                />
              </Col>

              <Col xs={12} md={6}>
                <Form.Label>
                  Base
                </Form.Label>

                <Form.Select
                  name="base"
                  value={expenditureForm.base}
                  disabled
                >
                  {bases.map((base) => (
                    <option
                      key={base.id}
                      value={base.id}
                    >
                      {base.base_name}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={12} md={6}>
                <Form.Label>
                  Expenditure Date
                </Form.Label>

                <Form.Control
                  type="date"
                  name="date"
                  value={expenditureForm.date}
                  onChange={handleExpenditureChange}
                  required
                />
              </Col>

              <Col xs={12} md={6}>
                <Form.Label>
                  Purpose
                </Form.Label>

                <Form.Select
                  name="purpose"
                  value={
                    expenditureForm.purpose
                  }
                  onChange={handleExpenditureChange}
                  required
                >
                  <option value="">
                    Select purpose
                  </option>

                  <option>
                    Training Exercise
                  </option>

                  <option>
                    Field Operation
                  </option>

                  <option>
                    Vehicle Operation
                  </option>

                  <option>
                    Maintenance
                  </option>

                  <option>
                    Emergency
                  </option>

                  <option>
                    Other
                  </option>
                </Form.Select>
              </Col>

              <Col xs={12} md={6}>
                <Form.Label>
                  Personnel
                </Form.Label>

                <Form.Control
                  name="personnel"
                  value={expenditureForm.personnel}
                  onChange={handleExpenditureChange}
                  placeholder="Enter personnel name"
                  required
                />
              </Col>

              <Col xs={12}>
                <Form.Label>
                  Remarks
                </Form.Label>

                <Form.Control
                  as="textarea"
                  rows={3}
                  name="remarks"
                  value={
                    expenditureForm.remarks
                  }
                  onChange={handleExpenditureChange}
                  placeholder="Enter reason or additional details..."
                />
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() =>
                setShowExpenditureModal(false)
              }
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              type="submit"
            >
              <i className="bi bi-check-lg me-2"></i>
              Record Expenditure
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ==================================================
          DETAILS MODAL
      =================================================== */}

      <Modal
        show={showDetailsModal}
        onHide={() =>
          setShowDetailsModal(false)
        }
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            {selectedRecord?.recordType} Details
          </Modal.Title>
        </Modal.Header>

        {selectedRecord && (
          <Modal.Body>
            <div className="bg-light rounded p-3 mb-4">
              <small className="text-muted">
                Record ID
              </small>

              <h5 className="fw-bold mb-0">
                {selectedRecord.id}
              </h5>
            </div>

            <Row className="g-3">
              <Col xs={6}>
                <small className="text-muted">
                  Asset
                </small>

                <div className="fw-semibold">
                  {selectedRecord.asset}
                </div>
              </Col>

              <Col xs={6}>
                <small className="text-muted">
                  Asset ID
                </small>

                <div>
                  {selectedRecord.assetId}
                </div>
              </Col>

              <Col xs={6}>
                <small className="text-muted">
                  Equipment Type
                </small>

                <div>
                  {selectedRecord.type}
                </div>
              </Col>

              <Col xs={6}>
                <small className="text-muted">
                  Quantity
                </small>

                <div className="fw-bold">
                  {selectedRecord.quantity}
                </div>
              </Col>

              <Col xs={6}>
                <small className="text-muted">
                  Personnel
                </small>

                <div>
                  {selectedRecord.personnel}
                </div>
              </Col>

              <Col xs={6}>
                <small className="text-muted">
                  Base
                </small>

                <div>
                  {selectedRecord.base}
                </div>
              </Col>

              <Col xs={6}>
                <small className="text-muted">
                  Date
                </small>

                <div>
                  {selectedRecord.date}
                </div>
              </Col>

              {selectedRecord.recordType ===
                "Assignment" && (
                <Col xs={6}>
                  <small className="text-muted">
                    Return Date
                  </small>

                  <div>
                    {selectedRecord.returnDate ||
                      "-"}
                  </div>
                </Col>
              )}

              {selectedRecord.recordType ===
                "Expenditure" && (
                <Col xs={6}>
                  <small className="text-muted">
                    Purpose
                  </small>

                  <div>
                    {selectedRecord.purpose}
                  </div>
                </Col>
              )}

              <Col xs={12}>
                <small className="text-muted">
                  Status
                </small>

                <div className="mt-1">
                  {selectedRecord.recordType ===
                  "Assignment" ? (
                    <AssignmentStatus
                      status={
                        selectedRecord.status
                      }
                    />
                  ) : (
                    <ExpenditureStatus
                      status={
                        selectedRecord.status
                      }
                    />
                  )}
                </div>
              </Col>

              <Col xs={12}>
                <small className="text-muted">
                  Remarks
                </small>

                <div>
                  {selectedRecord.remarks ||
                    "-"}
                </div>
              </Col>
            </Row>
          </Modal.Body>
        )}

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() =>
              setShowDetailsModal(false)
            }
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      </Container>
    </Layout>
  );
}