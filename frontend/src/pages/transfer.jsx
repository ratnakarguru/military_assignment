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

const mapTransfer = (transfer, assets, bases, equipmentTypes) => {
  const asset = assets.find((item) => item.id === transfer.asset_id);
  return {
    id: transfer.transfer_number,
    dbId: transfer.id,
    asset: asset?.asset_name || "Unknown asset",
    equipmentType: equipmentTypes.find((type) => type.id === asset?.equipment_type_id)?.type_name || "Unknown",
    quantity: transfer.quantity,
    fromBase: bases.find((base) => base.id === transfer.from_base_id)?.base_name || "Unknown",
    toBase: bases.find((base) => base.id === transfer.to_base_id)?.base_name || "Unknown",
    transferDate: transfer.transfer_date,
    timestamp: transfer.created_at,
    requestedBy: transfer.requested_by,
    priority: transfer.priority,
    status: transfer.status,
    reason: transfer.reason || "",
  };
};

const Transfer = () => {
  const [transfers, setTransfers] = useState([]);
  const [bases, setBases] = useState([]);
  const [assets, setAssets] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [error, setError] = useState("");
  const currentUser = (() => {
  try {
    return JSON.parse(localStorage.getItem("mams_user") || "null") || null;
  } catch {
    return null;
  }
  })();

  const role = String(currentUser?.user_role || "");
  const userBaseId = Number(currentUser?.base || 0);

  const isAdmin = role === "1";
  const isBaseCommander = role === "BC001";
  const isLogisticsOfficer = role === "LO001";

  const visibleFromBases = isAdmin
  ? bases
  : bases.filter((base) => Number(base.id) === userBaseId);

const visibleToBases = isAdmin
  ? bases
  : bases.filter((base) => Number(base.id) !== userBaseId);

  useEffect(() => {
    Promise.all([
      apiRequest("/api/v1/transfers/"),
      apiRequest("/api/v1/bases/"),
      apiRequest("/api/v1/assets/"),
      apiRequest("/api/v1/equipment-types/"),
    ])
      .then(([transferRows, baseRows, assetRows, typeRows]) => {
        setBases(baseRows);
        setAssets(assetRows);
        setEquipmentTypes(typeRows);
        setTransfers(transferRows.map((transfer) => mapTransfer(transfer, assetRows, baseRows, typeRows)));
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [equipmentFilter, setEquipmentFilter] = useState("All");

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [selectedTransfer, setSelectedTransfer] = useState(null);

  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
  fromBase: !isAdmin && userBaseId ? String(userBaseId) : "",
  toBase: "",
  equipmentType: "",
  asset: "",
  quantity: "",
  transferDate: "",
  priority: "Medium",
  reason: "",
});

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "fromBase" || name === "equipmentType" ? { asset: "" } : {}),
      ...(name === "fromBase" ? { equipmentType: "" } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (formData.fromBase === formData.toBase) {
      return;
    }

    setError("");
    try {
      const transfer = await apiRequest("/api/v1/transfers/", {
        method: "POST",
        body: {
          asset_id: Number(formData.asset),
          from_base_id: Number(formData.fromBase),
          to_base_id: Number(formData.toBase),
          quantity: Number(formData.quantity),
          transfer_date: formData.transferDate,
          priority: formData.priority,
          reason: formData.reason,
          requested_by: getCurrentUserId(),
        },
      });
      const newTransfer = mapTransfer(transfer, assets, bases, equipmentTypes);
      setTransfers((previous) => [newTransfer, ...previous]);
      setFormData({
        fromBase: "",
        toBase: "",
        equipmentType: "",
        asset: "",
        quantity: "",
        transferDate: "",
        priority: "Medium",
        reason: "",
      });
      setShowTransferModal(false);
      setSuccessMessage(`Transfer request ${newTransfer.id} created successfully.`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const filteredTransfers = useMemo(() => {
    return transfers.filter((transfer) => {
      const searchText = `
        ${transfer.id}
        ${transfer.asset}
        ${transfer.fromBase}
        ${transfer.toBase}
        ${transfer.equipmentType}
      `.toLowerCase();

      const matchesSearch = searchText.includes(
        search.toLowerCase()
      );

      const matchesStatus =
        statusFilter === "All" ||
        transfer.status === statusFilter;

      const matchesEquipment =
        equipmentFilter === "All" ||
        transfer.equipmentType === equipmentFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesEquipment
      );
    });
  }, [
    transfers,
    search,
    statusFilter,
    equipmentFilter,
  ]);

  const pendingCount = transfers.filter(
    (item) => item.status === "Pending"
  ).length;

  const inTransitCount = transfers.filter(
    (item) => item.status === "In Transit"
  ).length;

  const completedCount = transfers.filter(
    (item) => item.status === "Completed"
  ).length;

  const totalTransferred = transfers.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const getStatusVariant = (status) => {
    switch (status) {
      case "Completed":
        return "success";

      case "In Transit":
        return "primary";

      case "Approved":
        return "info";

      case "Pending":
        return "warning";

      case "Rejected":
        return "danger";

      default:
        return "secondary";
    }
  };

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case "Critical":
        return "danger";

      case "High":
        return "warning";

      default:
        return "secondary";
    }
  };

  const openDetails = (transfer) => {
    setSelectedTransfer(transfer);
    setShowDetailsModal(true);
  };

  return (
    <Layout
      title="Asset Transfers"
      subtitle="Transfer and track assets between military bases"
    >
      <Container fluid className="bg-light min-vh-100 py-4">

        {/* HEADER */}
        <Row className="mb-4 align-items-center">

        <Col>
          <div className="d-flex align-items-center gap-3">

            <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-3">
              <i className="bi bi-arrow-left-right fs-3"></i>
            </div>

            <div>
              <h3 className="fw-bold mb-1">
                Asset Transfers
              </h3>

              <p className="text-muted mb-0">
                Transfer and track assets between military bases
              </p>
            </div>

          </div>
        </Col>

        <Col xs="auto">
          <Button
            variant="primary"
            className="px-4"
            onClick={() => setShowTransferModal(true)}
          >
            <i className="bi bi-plus-lg me-2"></i>
            New Transfer
          </Button>
        </Col>

      </Row>

      {/* SUCCESS MESSAGE */}
      {successMessage && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setSuccessMessage("")}
        >
          <i className="bi bi-check-circle me-2"></i>
          {successMessage}
        </Alert>
      )}
      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}

      {/* SUMMARY CARDS */}
      <Row className="g-3 mb-4">

        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>

              <div className="d-flex justify-content-between">

                <div>
                  <small className="text-muted">
                    Total Transfers
                  </small>

                  <h3 className="fw-bold mt-2 mb-0">
                    {transfers.length}
                  </h3>
                </div>

                <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-3">
                  <i className="bi bi-arrow-left-right fs-4"></i>
                </div>

              </div>

            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>

              <div className="d-flex justify-content-between">

                <div>
                  <small className="text-muted">
                    Pending
                  </small>

                  <h3 className="fw-bold mt-2 mb-0">
                    {pendingCount}
                  </h3>
                </div>

                <div className="bg-warning bg-opacity-10 text-warning rounded-3 p-3">
                  <i className="bi bi-hourglass-split fs-4"></i>
                </div>

              </div>

            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>

              <div className="d-flex justify-content-between">

                <div>
                  <small className="text-muted">
                    In Transit
                  </small>

                  <h3 className="fw-bold mt-2 mb-0">
                    {inTransitCount}
                  </h3>
                </div>

                <div className="bg-info bg-opacity-10 text-info rounded-3 p-3">
                  <i className="bi bi-truck fs-4"></i>
                </div>

              </div>

            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>

              <div className="d-flex justify-content-between">

                <div>
                  <small className="text-muted">
                    Assets Transferred
                  </small>

                  <h3 className="fw-bold mt-2 mb-0">
                    {totalTransferred.toLocaleString("en-IN")}
                  </h3>
                </div>

                <div className="bg-success bg-opacity-10 text-success rounded-3 p-3">
                  <i className="bi bi-box-seam fs-4"></i>
                </div>

              </div>

            </Card.Body>
          </Card>
        </Col>

      </Row>

      {/* TRANSFER HISTORY */}
      <Card className="border-0 shadow-sm">

        <Card.Header className="bg-white border-0 pt-4 px-4">

          <Row className="g-3 align-items-center">

            <Col lg={4}>
              <h5 className="fw-bold mb-1">
                Transfer History
              </h5>

              <small className="text-muted">
                Complete record of asset movements
              </small>
            </Col>

            <Col lg={8}>

              <Row className="g-2">

                <Col md={5}>
                  <InputGroup>
                    <InputGroup.Text>
                      <i className="bi bi-search"></i>
                    </InputGroup.Text>

                    <Form.Control
                      placeholder="Search transfers..."
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                    />
                  </InputGroup>
                </Col>

                <Col md={3}>
                  <Form.Select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value)
                    }
                  >
                    <option value="All">
                      All Status
                    </option>

                    <option value="Pending">
                      Pending
                    </option>

                    <option value="Approved">
                      Approved
                    </option>

                    <option value="In Transit">
                      In Transit
                    </option>

                    <option value="Completed">
                      Completed
                    </option>

                    <option value="Cancelled">
                      Cancelled
                    </option>
                    <option value="Cancelled">Cancelled</option>
                  </Form.Select>
                </Col>

                <Col md={4}>
                  <Form.Select
                    value={equipmentFilter}
                    onChange={(event) =>
                      setEquipmentFilter(event.target.value)
                    }
                  >
                    <option value="All">
                      All Equipment
                    </option>

                    {equipmentTypes.map((type) => (
                      <option key={type.id} value={type.type_name}>{type.type_name}</option>
                    ))}
                  </Form.Select>
                </Col>

              </Row>

            </Col>

          </Row>

        </Card.Header>

        <Card.Body className="px-4">

          <div className="table-responsive">

            <Table
              hover
              responsive
              className="align-middle mb-0"
            >

              <thead className="table-light">

                <tr>
                  <th>Transfer ID</th>
                  <th>Asset</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>From Base</th>
                  <th>To Base</th>
                  <th>Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>

              </thead>

              <tbody>

                {filteredTransfers.map((transfer) => (

                  <tr key={transfer.id}>

                    <td>
                      <span className="fw-semibold text-primary">
                        {transfer.id}
                      </span>
                    </td>

                    <td>
                      <span className="fw-semibold">
                        {transfer.asset}
                      </span>
                    </td>

                    <td>
                      <small className="text-muted">
                        {transfer.equipmentType}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {transfer.quantity}
                      </strong>
                    </td>

                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-geo-alt text-danger"></i>
                        {transfer.fromBase}
                      </div>
                    </td>

                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-geo-alt text-success"></i>
                        {transfer.toBase}
                      </div>
                    </td>

                    <td>
                      {transfer.transferDate}
                    </td>

                    <td>
                      <Badge
                        bg={getPriorityVariant(
                          transfer.priority
                        )}
                      >
                        {transfer.priority}
                      </Badge>
                    </td>

                    <td>
                      <Badge
                        bg={getStatusVariant(
                          transfer.status
                        )}
                        className="px-2 py-2"
                      >
                        {transfer.status}
                      </Badge>
                    </td>

                    <td>
                      <Button
                        variant="light"
                        size="sm"
                        title="View transfer details"
                        onClick={() =>
                          openDetails(transfer)
                        }
                      >
                        <i className="bi bi-eye"></i>
                      </Button>
                    </td>

                  </tr>

                ))}

                {filteredTransfers.length === 0 && (

                  <tr>
                    <td
                      colSpan="10"
                      className="text-center py-5"
                    >

                      <i className="bi bi-search fs-1 text-muted"></i>

                      <p className="text-muted mt-3 mb-0">
                        No transfer records found.
                      </p>

                    </td>
                  </tr>

                )}

              </tbody>

            </Table>

          </div>

        </Card.Body>

      </Card>

      {/* NEW TRANSFER MODAL */}
      <Modal
        show={showTransferModal}
        onHide={() => setShowTransferModal(false)}
        size="lg"
        centered
      >

        <Modal.Header closeButton>

          <Modal.Title className="fw-bold">

            <i className="bi bi-arrow-left-right text-primary me-2"></i>

            New Asset Transfer

          </Modal.Title>

        </Modal.Header>

        <Form onSubmit={handleSubmit}>

          <Modal.Body>

            <Alert variant="info">

              <i className="bi bi-info-circle me-2"></i>

              Select the source and destination bases carefully.
              This transaction will be recorded in the transfer history.

            </Alert>

            <Row className="g-3">

              {/* FROM BASE */}
              <Col md={6}>

                <Form.Group>

                  <Form.Label className="fw-semibold">
                    From Base
                  </Form.Label>

                  <Form.Select
                    name="fromBase"
                    value={formData.fromBase}
                    onChange={handleChange}
                    required
                  >

                    <option value="">
                      Select source base
                    </option>

                    {visibleFromBases.map((base) => (
  <option key={base.id} value={base.id}>
    {base.base_name}
  </option>
))}

                  </Form.Select>

                </Form.Group>

              </Col>

              {/* TO BASE */}
              <Col md={6}>

                <Form.Group>

                  <Form.Label className="fw-semibold">
                    To Base
                  </Form.Label>

                  <Form.Select
                    name="toBase"
                    value={formData.toBase}
                    onChange={handleChange}
                    required
                  >

                    <option value="">
                      Select destination base
                    </option>

                    {bases.map((base) => <option key={base.id} value={base.id}>{base.base_name}</option>)}

                  </Form.Select>

                </Form.Group>

              </Col>

              {/* EQUIPMENT TYPE */}
              <Col md={6}>

                <Form.Group>

                  <Form.Label className="fw-semibold">
                    Equipment Type
                  </Form.Label>

                  <Form.Select
                    name="equipmentType"
                    value={formData.equipmentType}
                    onChange={handleChange}
                    required
                  >

                    <option value="">
                      Select equipment type
                    </option>

                    {equipmentTypes.map((type) => <option key={type.id} value={type.type_name}>{type.type_name}</option>)}

                  </Form.Select>

                </Form.Group>

              </Col>

              {/* ASSET */}
              <Col md={6}>

                <Form.Group>

                  <Form.Label className="fw-semibold">
                    Asset / Item
                  </Form.Label>

                  <Form.Select
                    name="asset"
                    value={formData.asset}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select asset</option>
                    {assets.filter((asset) => asset.base_id === Number(formData.fromBase) && asset.quantity > 0 && equipmentTypes.find((type) => type.id === asset.equipment_type_id)?.type_name === formData.equipmentType).map((asset) => (
                      <option key={asset.id} value={asset.id}>{asset.asset_name} ({asset.asset_code})</option>
                    ))}
                  </Form.Select>

                </Form.Group>

              </Col>

              {/* QUANTITY */}
              <Col md={4}>

                <Form.Group>

                  <Form.Label className="fw-semibold">
                    Quantity
                  </Form.Label>

                  <Form.Control
                    type="number"
                    min="1"
                    name="quantity"
                    placeholder="Enter quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                  />

                </Form.Group>

              </Col>

              {/* DATE */}
              <Col md={4}>

                <Form.Group>

                  <Form.Label className="fw-semibold">
                    Transfer Date
                  </Form.Label>

                  <Form.Control
                    type="date"
                    name="transferDate"
                    value={formData.transferDate}
                    onChange={handleChange}
                    required
                  />

                </Form.Group>

              </Col>

              {/* PRIORITY */}
              <Col md={4}>

                <Form.Group>

                  <Form.Label className="fw-semibold">
                    Priority
                  </Form.Label>

                  <Form.Select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                  >

                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>

                    <option value="High">
                      High
                    </option>

                    <option value="Critical">
                      Critical
                    </option>

                  </Form.Select>

                </Form.Group>

              </Col>

              {/* REASON */}
              <Col md={12}>

                <Form.Group>

                  <Form.Label className="fw-semibold">
                    Transfer Reason
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="reason"
                    placeholder="Enter reason for this transfer..."
                    value={formData.reason}
                    onChange={handleChange}
                    required
                  />

                </Form.Group>

              </Col>

            </Row>

          </Modal.Body>

          <Modal.Footer>

            <Button
              variant="light"
              onClick={() =>
                setShowTransferModal(false)
              }
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              type="submit"
              disabled={
                formData.fromBase &&
                formData.toBase &&
                formData.fromBase === formData.toBase
              }
            >
              <i className="bi bi-send me-2"></i>
              Submit Transfer
            </Button>

          </Modal.Footer>

        </Form>

      </Modal>

      {/* TRANSFER DETAILS MODAL */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        centered
      >

        <Modal.Header closeButton>

          <Modal.Title className="fw-bold">
            Transfer Details
          </Modal.Title>

        </Modal.Header>

        {selectedTransfer && (

          <Modal.Body>

            <div className="text-center mb-4">

              <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex p-3 mb-2">
                <i className="bi bi-arrow-left-right fs-3"></i>
              </div>

              <h5 className="fw-bold">
                {selectedTransfer.id}
              </h5>

              <Badge
                bg={getStatusVariant(
                  selectedTransfer.status
                )}
              >
                {selectedTransfer.status}
              </Badge>

            </div>

            <Row className="g-3">

              <Col xs={6}>
                <small className="text-muted">
                  Asset
                </small>

                <div className="fw-semibold">
                  {selectedTransfer.asset}
                </div>
              </Col>

              <Col xs={6}>
                <small className="text-muted">
                  Equipment Type
                </small>

                <div className="fw-semibold">
                  {selectedTransfer.equipmentType}
                </div>
              </Col>

              <Col xs={6}>
                <small className="text-muted">
                  Quantity
                </small>

                <div className="fw-semibold">
                  {selectedTransfer.quantity}
                </div>
              </Col>

              <Col xs={6}>
                <small className="text-muted">
                  Priority
                </small>

                <div>
                  <Badge
                    bg={getPriorityVariant(
                      selectedTransfer.priority
                    )}
                  >
                    {selectedTransfer.priority}
                  </Badge>
                </div>
              </Col>

              <Col xs={12}>

                <Card className="border-0 bg-light">

                  <Card.Body>

                    <div className="d-flex align-items-center">

                      <div className="text-center">
                        <i className="bi bi-geo-alt-fill text-danger fs-4"></i>

                        <div className="small fw-semibold">
                          {selectedTransfer.fromBase}
                        </div>
                      </div>

                      <div className="flex-grow-1 text-center px-3">

                        <div className="border-top border-primary border-2 position-relative">

                          <i className="bi bi-truck position-absolute top-50 start-50 translate-middle bg-light px-2 text-primary"></i>

                        </div>

                      </div>

                      <div className="text-center">

                        <i className="bi bi-geo-alt-fill text-success fs-4"></i>

                        <div className="small fw-semibold">
                          {selectedTransfer.toBase}
                        </div>

                      </div>

                    </div>

                  </Card.Body>

                </Card>

              </Col>

              <Col xs={12}>
                <small className="text-muted">
                  Transfer Date
                </small>

                <div className="fw-semibold">
                  {selectedTransfer.transferDate}
                </div>
              </Col>

              <Col xs={12}>
                <small className="text-muted">
                  Timestamp
                </small>

                <div className="fw-semibold">
                  {selectedTransfer.timestamp}
                </div>
              </Col>

              <Col xs={12}>
                <small className="text-muted">
                  Requested By
                </small>

                <div className="fw-semibold">
                  {selectedTransfer.requestedBy}
                </div>
              </Col>

              <Col xs={12}>
                <small className="text-muted">
                  Reason
                </small>

                <div>
                  {selectedTransfer.reason}
                </div>
              </Col>

            </Row>

          </Modal.Body>

        )}

        <Modal.Footer>

          <Button
            variant="secondary"
            onClick={() => setShowDetailsModal(false)}
          >
            Close
          </Button>

        </Modal.Footer>

      </Modal>

      </Container>
    </Layout>
  );
};

export default Transfer;