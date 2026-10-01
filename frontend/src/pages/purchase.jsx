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
import { apiRequest } from "../api";

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (baseId = "") => ({
  asset: "",
  category: "",
  baseId,
  quantity: "",
  unitPrice: "",
  supplier: "",
  priority: "Medium",
  purchaseDate: today(),
  remarks: "",
});

const mapPurchase = (purchase, bases, equipmentTypes) => ({
  dbId: purchase.id,
  id: purchase.purchase_number,
  baseId: Number(purchase.base_id),
  asset: purchase.asset_name,
  category:
    equipmentTypes.find((type) => type.id === purchase.equipment_type_id)
      ?.type_name || "Unknown",
  quantity: purchase.quantity,
  unitPrice: Number(purchase.unit_price),
  supplier: purchase.supplier || "",
  priority: purchase.priority,
  remarks: purchase.remarks || "",
  requestDate: purchase.purchase_date,
  status: purchase.status,
  base:
    bases.find((base) => base.id === purchase.base_id)?.base_name || "Unknown",
});

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

function Purchase() {
  const [purchases, setPurchases] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    equipmentTypeId: "",
    from: "",
    to: "",
  });
  const [formData, setFormData] = useState(emptyForm());

  // ---- current user (UI only; the backend enforces the real rules) ----
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("mams_user") || "null") || null;
    } catch {
      return null;
    }
  })();

  const role = String(currentUser?.user_role ?? currentUser?.role_id ?? "")
    .trim()
    .toUpperCase();
  const userBaseId = Number(currentUser?.base ?? currentUser?.base_id ?? 0);
  const isAdmin = role === "1" || role === "ADMIN";
  const isBaseCommander =
    role === "2" || role === "BC001" || role === "BASE COMMANDER";
  const isLogisticsOfficer =
    role === "3" || role === "LO001" || role === "LOGISTICS OFFICER";
  const canApprove = isAdmin || isBaseCommander;

  const visibleBases = bases.filter((base) => {
    if (isAdmin || isLogisticsOfficer) return true;
    if (!isBaseCommander) return false;
    return Number(base.id) === userBaseId;
  });

  const visiblePurchases = purchases.filter((purchase) => {
    if (isAdmin || isLogisticsOfficer) return true;
    if (!isBaseCommander) return false;
    return Number(purchase.baseId) === userBaseId;
  });

  // ---- load data (re-runs when filters change) ----
  useEffect(() => {
    const qs = new URLSearchParams();
    if (filters.equipmentTypeId)
      qs.set("equipment_type_id", filters.equipmentTypeId);
    if (filters.from) qs.set("date_from", filters.from);
    if (filters.to) qs.set("date_to", filters.to);

    Promise.all([
      apiRequest(`/api/v1/purchases/?${qs.toString()}`),
      apiRequest("/api/v1/bases/"),
      apiRequest("/api/v1/equipment-types/"),
    ])
      .then(([purchaseRows, baseRows, typeRows]) => {
        setBases(baseRows);
        setEquipmentTypes(typeRows);
        setPurchases(
          purchaseRows.map((p) => mapPurchase(p, baseRows, typeRows))
        );

        if (userBaseId && !isAdmin) {
          const defaultBase = baseRows.find(
            (b) => Number(b.id) === userBaseId
          );
          if (defaultBase) {
            setFormData((prev) => ({
              ...prev,
              baseId: String(defaultBase.id),
            }));
          }
        }
      })
      .catch((requestError) => setError(requestError.message));
  }, [isAdmin, userBaseId, filters]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.baseId) {
      setError("Please select a base for this purchase request.");
      return;
    }

    const allowedBaseIds = new Set(visibleBases.map((b) => Number(b.id)));
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
          purchase_date: formData.purchaseDate || today(),
          priority: formData.priority,
          remarks: formData.remarks,
          // created_by is NOT sent: the server takes it from the token
        },
      });

      const mapped = mapPurchase(purchase, bases, equipmentTypes);
      setPurchases((previous) => [mapped, ...previous]);
      setFormData(emptyForm(userBaseId && !isAdmin ? String(userBaseId) : ""));
      setShowModal(false);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateStatus = async (purchase, status) => {
    setError("");
    try {
      const updated = await apiRequest(
        `/api/v1/purchases/${purchase.dbId}/status`,
        { method: "PATCH", body: { status } }
      );
      setPurchases((previous) =>
        previous.map((p) =>
          p.dbId === purchase.dbId ? { ...p, status: updated.status } : p
        )
      );
      setSelected((current) =>
        current && current.dbId === purchase.dbId
          ? { ...current, status: updated.status }
          : current
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const filteredPurchases = visiblePurchases.filter((purchase) =>
    `${purchase.id} ${purchase.asset} ${purchase.category} ${purchase.supplier}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Only Approved / Ordered purchases should add to stock, so value is shown for all
  // but the dashboard must count only those statuses.
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

  const summaryCards = [
    {
      label: "Total Requests",
      value: totalRequests,
      icon: "bi-file-earmark-text",
      tone: "bg-primary-subtle text-primary",
    },
    {
      label: "Pending",
      value: pendingRequests,
      icon: "bi-hourglass-split",
      tone: "bg-warning-subtle text-warning",
    },
    {
      label: "Approved",
      value: approvedRequests,
      icon: "bi-check-circle",
      tone: "bg-success-subtle text-success",
    },
    {
      label: "Procurement Value",
      value: `₹${totalValue.toLocaleString("en-IN")}`,
      icon: "bi-currency-rupee",
      tone: "bg-info-subtle text-info",
    },
  ];

  return (
    <Layout
      title="Purchase Management"
      subtitle="Manage asset procurement requests and purchase orders"
    >
      <div className="purchase-page">
        {/* PAGE HEADER */}
        <div className="purchase-page-header d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
          <div>
            <h3 className="purchase-page-title fw-bold mb-1">
              <i className="bi bi-cart-check me-2" aria-hidden="true"></i>
              Purchase Management
            </h3>
            <p className="text-muted mb-0">
              Manage asset procurement requests and purchase orders
            </p>
          </div>

          <Button
            variant="primary"
            className="purchase-primary-action px-4"
            onClick={() => setShowModal(true)}
          >
            <i className="bi bi-plus-lg me-2" aria-hidden="true"></i>
            New Purchase Request
          </Button>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* SUMMARY CARDS */}
        <Row className="purchase-summary g-3 mb-4">
          {summaryCards.map((card) => (
            <Col xs={12} sm={6} xl={3} key={card.label}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="purchase-stat d-flex justify-content-between align-items-center">
                    <div className="purchase-stat-content">
                      <small className="text-muted">{card.label}</small>
                      <h3 className="fw-bold mt-2 mb-0">{card.value}</h3>
                    </div>
                    <div className={`purchase-stat-icon ${card.tone}`}>
                      <i className={`bi ${card.icon}`}></i>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* PURCHASE TABLE */}
        <Card className="purchase-list-card border-0 shadow-sm">
          <Card.Body>
            <div className="purchase-table-toolbar d-flex justify-content-between align-items-center gap-3 mb-3">
              <div>
                <h5 className="fw-bold mb-1">Purchase Requests</h5>
                <small className="text-muted">Procurement request history</small>
              </div>

              <InputGroup className="purchase-search">
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

            {/* FILTER BAR */}
            <Row className="g-2 mb-3">
              <Col md={4}>
                <Form.Select
                  value={filters.equipmentTypeId}
                  onChange={(e) =>
                    setFilters({ ...filters, equipmentTypeId: e.target.value })
                  }
                >
                  <option value="">All equipment types</option>
                  {equipmentTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.type_name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Control
                  type="date"
                  title="From date"
                  value={filters.from}
                  onChange={(e) =>
                    setFilters({ ...filters, from: e.target.value })
                  }
                />
              </Col>
              <Col md={3}>
                <Form.Control
                  type="date"
                  title="To date"
                  value={filters.to}
                  onChange={(e) =>
                    setFilters({ ...filters, to: e.target.value })
                  }
                />
              </Col>
              <Col md={2}>
                <Button
                  variant="light"
                  className="w-100"
                  onClick={() =>
                    setFilters({ equipmentTypeId: "", from: "", to: "" })
                  }
                >
                  Clear
                </Button>
              </Col>
            </Row>

            <div className="table-responsive">
              <Table hover className="purchase-table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Request ID</th>
                    <th>Asset</th>
                    <th>Category</th>
                    <th>Base</th>
                    <th>Qty</th>
                    <th>Supplier</th>
                    <th>Total Value</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPurchases.map((purchase) => {
                    const total = purchase.quantity * purchase.unitPrice;

                    return (
                      <tr key={purchase.dbId}>
                        <td>
                          <span className="fw-semibold">{purchase.id}</span>
                        </td>
                        <td>
                          <div className="fw-semibold">{purchase.asset}</div>
                        </td>
                        <td>
                          <span className="text-muted">{purchase.category}</span>
                        </td>
                        <td>{purchase.base}</td>
                        <td>{purchase.quantity}</td>
                        <td>{purchase.supplier}</td>
                        <td>
                          <strong>₹{total.toLocaleString("en-IN")}</strong>
                        </td>
                        <td>{purchase.requestDate}</td>
                        <td>
                          <Badge
                            bg={getStatusVariant(purchase.status)}
                            className="px-3 py-2"
                          >
                            {purchase.status}
                          </Badge>
                        </td>
                        <td className="text-center text-nowrap">
                          <Button
                            variant="light"
                            size="sm"
                            className="purchase-view-button me-1"
                            title="View details"
                            aria-label={`View purchase ${purchase.id}`}
                            onClick={() => setSelected(purchase)}
                          >
                            <i className="bi bi-eye"></i>
                          </Button>

                          {canApprove && purchase.status === "Pending" && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                className="me-1"
                                title="Approve"
                                onClick={() => updateStatus(purchase, "Approved")}
                              >
                                <i className="bi bi-check-lg"></i>
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                title="Reject"
                                onClick={() => updateStatus(purchase, "Rejected")}
                              >
                                <i className="bi bi-x-lg"></i>
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td colSpan="10" className="text-center py-5 text-muted">
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
          dialogClassName="purchase-modal-dialog"
        >
          <Modal.Header closeButton>
            <Modal.Title className="purchase-modal-title fw-bold">
              <i className="bi bi-cart-plus me-2" aria-hidden="true"></i>
              New Purchase Request
            </Modal.Title>
          </Modal.Header>

          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Asset Name</Form.Label>
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
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select category</option>
                      {equipmentTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.type_name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Base</Form.Label>
                    <Form.Select
                      name="baseId"
                      value={formData.baseId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select base</option>
                      {visibleBases.map((base) => (
                        <option key={base.id} value={base.id}>
                          {base.base_name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Purchase Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="purchaseDate"
                      max={today()}
                      value={formData.purchaseDate}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Quantity</Form.Label>
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
                    <Form.Label>Unit Price</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>₹</InputGroup.Text>
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
                    <Form.Label>Priority</Form.Label>
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
                    <Form.Label>Supplier</Form.Label>
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
                    <Form.Label>Remarks</Form.Label>
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

            <Modal.Footer className="purchase-modal-footer">
              <Button variant="light" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                <i className="bi bi-send me-2"></i>
                Submit Request
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* DETAILS MODAL */}
        <Modal show={!!selected} onHide={() => setSelected(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold">
              {selected?.id} details
            </Modal.Title>
          </Modal.Header>
          {selected && (
            <Modal.Body>
              <Table borderless size="sm" className="purchase-details-table mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted">Asset</td>
                    <td>{selected.asset}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Category</td>
                    <td>{selected.category}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Base</td>
                    <td>{selected.base}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Quantity</td>
                    <td>{selected.quantity}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Unit price</td>
                    <td>₹{selected.unitPrice.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Total</td>
                    <td>
                      ₹
                      {(selected.quantity * selected.unitPrice).toLocaleString(
                        "en-IN"
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">Supplier</td>
                    <td>{selected.supplier}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Priority</td>
                    <td>{selected.priority}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Date</td>
                    <td>{selected.requestDate}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Status</td>
                    <td>
                      <Badge bg={getStatusVariant(selected.status)}>
                        {selected.status}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">Remarks</td>
                    <td>{selected.remarks || "-"}</td>
                  </tr>
                </tbody>
              </Table>
            </Modal.Body>
          )}
          <Modal.Footer className="purchase-modal-footer">
            <Button variant="light" onClick={() => setSelected(null)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </Layout>
  );
}

export default Purchase;