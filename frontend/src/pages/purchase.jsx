import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Form,
  Table,
  Badge,
  InputGroup,
  Modal,
  Alert,
} from "react-bootstrap";

import Layout from "../components/layout";
import { apiRequest, getCurrentUserId } from "../api";

const mapPurchase = (purchase, bases, equipmentTypes) => ({
  id: purchase.purchase_number,
  baseId: Number(purchase.base_id),
  asset: purchase.asset_name,
  category: equipmentTypes.find((type) => type.id === purchase.equipment_type_id)?.type_name || "Unknown",
  quantity: purchase.quantity,
  unitPrice: Number(purchase.unit_price),
  supplier: purchase.supplier || "",
  priority: purchase.priority,
  remarks: purchase.remarks || "",
  requestDate: purchase.purchase_date,
  status: purchase.status,
  base: bases.find((base) => base.id === purchase.base_id)?.base_name || "Unknown",
});

function Purchase() {
  const [purchases, setPurchases] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const currentUser = (() => {
  try {
    return JSON.parse(
      localStorage.getItem("mams_user") || "null"
    ) || null;
  } catch {
    return null;
  }
})();

  const role = String(currentUser?.user_role || "");
  const serviceId = currentUser?.service_id || "";
  const userBaseId = Number(currentUser?.base || 0);
  const isAdmin = role === "1";
  const isBaseCommander = role === "BC001";
  const isLogisticsOfficer = role === "LO001";
  const visibleBases = bases.filter((base) => {
  if (isAdmin) return true;

  return Number(base.id) === userBaseId;
});

  const visiblePurchases = purchases.filter((purchase) => {
  if (isAdmin) return true;

  return Number(purchase.baseId) === userBaseId;
});

  const [formData, setFormData] = useState({
    asset: "",
    category: "",
    baseId: "",
    quantity: "",
    unitPrice: "",
    supplier: "",
    priority: "Medium",
    remarks: "",
  });

  useEffect(() => {
    Promise.all([
      apiRequest("/api/v1/purchases/"),
      apiRequest("/api/v1/bases/"),
      apiRequest("/api/v1/equipment-types/"),
    ])
      .then(([purchaseRows, baseRows, typeRows]) => {
        setBases(baseRows);
        setEquipmentTypes(typeRows);
        const mappedPurchases = purchaseRows.map((purchase) => mapPurchase(purchase, baseRows, typeRows));
        setPurchases(mappedPurchases);

        if (userBaseId && !isAdmin) {
          const defaultBase = baseRows.find((base) => Number(base.id) === userBaseId);
          if (defaultBase) {
            setFormData((prev) => ({
              ...prev,
              baseId: String(defaultBase.id),
            }));
          }
        }
      })
      .catch((requestError) => setError(requestError.message));
  }, [isAdmin, userBaseId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.baseId) {
      setError("Please select a base for this purchase request.");
      return;
    }

    const allowedBaseIds = new Set(visibleBases.map((base) => Number(base.id)));
    if (!allowedBaseIds.has(Number(formData.baseId))) {
      setError("You are not allowed to create a purchase request for this base.");
      return;
    }

    try {
      const purchase = await apiRequest("/api/v1/purchases/", {
        method: "POST",
        body: {
          base_id: Number(formData.baseId),
          equipment_type_id: Number(formData.category),
          asset_name: formData.asset.trim(),
          quantity: Number(formData.quantity),
          unit_price: Number(formData.unitPrice),
          supplier: formData.supplier.trim(),
          purchase_date: new Date().toISOString().slice(0, 10),
          priority: formData.priority,
          remarks: formData.remarks,
          created_by: getCurrentUserId(),
        },
      });

      const mappedPurchase = mapPurchase(purchase, bases, equipmentTypes);
      setPurchases((previous) => [mappedPurchase, ...previous]);
      setFormData({
        asset: "",
        category: "",
        baseId: userBaseId && !isAdmin ? String(userBaseId) : "",
        quantity: "",
        unitPrice: "",
        supplier: "",
        priority: "Medium",
        remarks: "",
      });
      setShowModal(false);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const filteredPurchases = visiblePurchases.filter((purchase) =>
    `${purchase.id} ${purchase.asset} ${purchase.category} ${purchase.supplier}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalRequests = visiblePurchases.length;

  const pendingRequests = visiblePurchases.filter(
    (item) => item.status === "Pending"
  ).length;

  const approvedRequests = visiblePurchases.filter(
    (item) => item.status === "Approved"
  ).length;

  const totalValue = visiblePurchases.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0
  );

  const getStatusVariant = (status) => {
    switch (status) {
      case "Approved":
        return "success";
      case "Ordered":
        return "primary";
      case "Pending":
        return "warning";
      case "Rejected":
        return "danger";
      default:
        return "secondary";
    }
  };

  return (
    <Layout
      title="Purchase Management"
      subtitle="Manage asset procurement requests and purchase orders"
    >
      <div className="purchase-page">

        {/* PAGE HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="fw-bold mb-1">
              <i className="bi bi-cart-check me-2"></i>
              Purchase Management
            </h3>

            <p className="text-muted mb-0">
              Manage asset procurement requests and purchase orders
            </p>
          </div>

          <Button
            variant="primary"
            className="px-4"
            onClick={() => setShowModal(true)}
          >
            <i className="bi bi-plus-lg me-2"></i>
            New Purchase Request
          </Button>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}

        {/* SUMMARY CARDS */}
        <Row className="g-3 mb-4">

        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <small className="text-muted">
                    Total Requests
                  </small>

                  <h3 className="fw-bold mt-2 mb-0">
                    {totalRequests}
                  </h3>
                </div>

                <div className="purchase-stat-icon bg-primary-subtle text-primary">
                  <i className="bi bi-file-earmark-text"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <small className="text-muted">
                    Pending
                  </small>

                  <h3 className="fw-bold mt-2 mb-0">
                    {pendingRequests}
                  </h3>
                </div>

                <div className="purchase-stat-icon bg-warning-subtle text-warning">
                  <i className="bi bi-hourglass-split"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <small className="text-muted">
                    Approved
                  </small>

                  <h3 className="fw-bold mt-2 mb-0">
                    {approvedRequests}
                  </h3>
                </div>

                <div className="purchase-stat-icon bg-success-subtle text-success">
                  <i className="bi bi-check-circle"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <small className="text-muted">
                    Procurement Value
                  </small>

                  <h3 className="fw-bold mt-2 mb-0">
                    ₹{totalValue.toLocaleString("en-IN")}
                  </h3>
                </div>

                <div className="purchase-stat-icon bg-info-subtle text-info">
                  <i className="bi bi-currency-rupee"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

      </Row>

      {/* PURCHASE TABLE */}
      <Card className="border-0 shadow-sm">

        <Card.Body>

          <div className="d-flex justify-content-between align-items-center mb-3">

            <div>
              <h5 className="fw-bold mb-1">
                Purchase Requests
              </h5>

              <small className="text-muted">
                Procurement request history
              </small>
            </div>

            <InputGroup style={{ width: "300px" }}>
              <InputGroup.Text>
                <i className="bi bi-search"></i>
              </InputGroup.Text>

              <Form.Control
                placeholder="Search requests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>

          </div>

          <div className="table-responsive">

            <Table hover className="align-middle mb-0">

              <thead className="table-light">
                <tr>
                  <th>Request ID</th>
                  <th>Asset</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Supplier</th>
                  <th>Total Value</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {filteredPurchases.map((purchase) => {

                  const total =
                    purchase.quantity *
                    purchase.unitPrice;

                  return (
                    <tr key={purchase.id}>

                      <td>
                        <span className="fw-semibold">
                          {purchase.id}
                        </span>
                      </td>

                      <td>
                        <div className="fw-semibold">
                          {purchase.asset}
                        </div>
                      </td>

                      <td>
                        <span className="text-muted">
                          {purchase.category}
                        </span>
                      </td>

                      <td>
                        {purchase.quantity}
                      </td>

                      <td>
                        {purchase.supplier}
                      </td>

                      <td>
                        <strong>
                          ₹{total.toLocaleString("en-IN")}
                        </strong>
                      </td>

                      <td>
                        {purchase.requestDate}
                      </td>

                      <td>
                        <Badge
                          bg={getStatusVariant(
                            purchase.status
                          )}
                          className="px-3 py-2"
                        >
                          {purchase.status}
                        </Badge>
                      </td>

                      <td>
                        <Button
                          variant="light"
                          size="sm"
                          title="View details"
                        >
                          <i className="bi bi-eye"></i>
                        </Button>
                      </td>

                    </tr>
                  );
                })}

                {filteredPurchases.length === 0 && (
                  <tr>
                    <td
                      colSpan="9"
                      className="text-center py-5 text-muted"
                    >
                      No purchase requests found.
                    </td>
                  </tr>
                )}

              </tbody>

            </Table>

          </div>

        </Card.Body>
      </Card>

      {/* NEW PURCHASE MODAL */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        centered
      >

        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            <i className="bi bi-cart-plus me-2"></i>
            New Purchase Request
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmit}>

          <Modal.Body>

            <Row className="g-3">

              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    Asset Name
                  </Form.Label>

                  <Form.Control
                    type="text"
                    name="asset"
                    placeholder="Enter asset name"
                    value={formData.asset}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    Category
                  </Form.Label>

                  <Form.Select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select category</option>
                    {equipmentTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.type_name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Base</Form.Label>
                  <Form.Select name="baseId" value={formData.baseId} onChange={handleChange} required>
                    <option value="">Select base</option>
                    {visibleBases.map((base) => <option key={base.id} value={base.id}>{base.base_name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    Quantity
                  </Form.Label>

                  <Form.Control
                    type="number"
                    min="1"
                    name="quantity"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    Unit Price
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>
                      ₹
                    </InputGroup.Text>

                    <Form.Control
                      type="number"
                      min="0"
                      name="unitPrice"
                      placeholder="0"
                      value={formData.unitPrice}
                      onChange={handleChange}
                      required
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    Priority
                  </Form.Label>

                  <Form.Select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    Supplier
                  </Form.Label>

                  <Form.Control
                    type="text"
                    name="supplier"
                    placeholder="Enter supplier name"
                    value={formData.supplier}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    Remarks
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="remarks"
                    placeholder="Enter additional information..."
                    value={formData.remarks}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>

            </Row>

          </Modal.Body>

          <Modal.Footer>

            <Button
              variant="light"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              type="submit"
            >
              <i className="bi bi-send me-2"></i>
              Submit Request
            </Button>

          </Modal.Footer>

        </Form>

      </Modal>

      </div>
    </Layout>
  );
}

export default Purchase;