import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Alert,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Table,
} from "react-bootstrap";

import Layout from "../components/layout";
import { apiRequest } from "../api";

const emptyDashboardData = {
  openingBalance: 0,
  purchases: 0,
  transferIn: 0,
  transferOut: 0,
  netMovement: 0,
  assigned: 0,
  expended: 0,
  closingBalance: 0,
};
function summarizeMovements(groupBy, labels, data) {
  const assetById = new Map(data.assets.map((asset) => [asset.id, asset]));
  const rows = new Map(labels.map((item) => [item.id, {
    label: item.label,
    opening: 0,
    purchases: 0,
    transferIn: 0,
    transferOut: 0,
    assigned: 0,
    expended: 0,
  }]));
  const keyForAsset = (asset) => groupBy === "base" ? asset?.base_id : asset?.equipment_type_id;
  const add = (key, field, quantity) => {
    const row = rows.get(key);
    if (row) row[field] += Number(quantity || 0);
  };

  data.assets.forEach((asset) => add(keyForAsset(asset), "opening", asset.quantity));
  data.purchases.filter((item) => item.status === "Received").forEach((item) => {
    add(groupBy === "base" ? item.base_id : item.equipment_type_id, "purchases", item.quantity);
  });
  data.transfers.filter((item) => item.status === "Completed").forEach((item) => {
    const asset = assetById.get(item.asset_id);
    const key = groupBy === "base" ? item.to_base_id : keyForAsset(asset);
    const fromKey = groupBy === "base" ? item.from_base_id : keyForAsset(asset);
    add(key, "transferIn", item.quantity);
    add(fromKey, "transferOut", item.quantity);
  });
  data.assignments.filter((item) => item.status === "Active").forEach((item) => {
    add(groupBy === "base" ? item.base_id : keyForAsset(assetById.get(item.asset_id)), "assigned", item.quantity);
  });
  data.expenditures.filter((item) => item.status === "Recorded").forEach((item) => {
    add(groupBy === "base" ? item.base_id : keyForAsset(assetById.get(item.asset_id)), "expended", item.quantity);
  });

  return [...rows.entries()].map(([id, row]) => ({
    ...row,
    [groupBy]: row.label,
    id,
  }));
}

function MovementBadge({ type }) {
  if (type === "Purchase") {
    return (
      <Badge bg="success">
        <i className="bi bi-cart-check me-1"></i>
        Purchase
      </Badge>
    );
  }

  if (type === "Transfer In") {
    return (
      <Badge bg="primary">
        <i className="bi bi-arrow-down-left me-1"></i>
        Transfer In
      </Badge>
    );
  }

  if (type === "Transfer Out") {
    return (
      <Badge bg="warning" text="dark">
        <i className="bi bi-arrow-up-right me-1"></i>
        Transfer Out
      </Badge>
    );
  }

  if (type === "Assignment") {
    return (
      <Badge bg="info">
        <i className="bi bi-person-badge me-1"></i>
        Assignment
      </Badge>
    );
  }

  return (
    <Badge bg="danger">
      <i className="bi bi-box-arrow-down me-1"></i>
      Expenditure
    </Badge>
  );
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(emptyDashboardData);
  const [recentMovements, setRecentMovements] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [equipmentSummary, setEquipmentSummary] = useState([]);
  const [baseSummary, setBaseSummary] = useState([]);
  const [error, setError] = useState("");
  const [selectedBase, setSelectedBase] = useState("All Bases");
  const [selectedEquipment, setSelectedEquipment] =
    useState("All Equipment");
  const [selectedDate, setSelectedDate] = useState("");

  // Logged-in user / role
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mams_user")) || null;
    } catch {
      return null;
    }
  });

  const role = Number(currentUser?.user_role ?? currentUser?.role_id);
  const userBaseId = Number(currentUser?.base_id);

  const isAdmin = role === 1;
  const isBaseCommander = role === 2;
  const isLogisticsOfficer = role === 3;

  const [showMovementModal, setShowMovementModal] =
    useState(false);

  const [showBalanceDetails, setShowBalanceDetails] =
    useState(false);

  const [showAssignedDetails, setShowAssignedDetails] =
    useState(false);

  const [showExpendedDetails, setShowExpendedDetails] =
    useState(false);

  const [movementType, setMovementType] = useState("All");

useEffect(() => {
  const loadDashboard = async () => {
    try {
      setError("");

      const [
        purchaseRows,
        transferRows,
        assignmentRows,
        expenditureRows,
        assetRows,
        baseRows,
        typeRows,
      ] = await Promise.all([
        apiRequest("/api/v1/purchases/"),
        apiRequest("/api/v1/transfers/"),
        apiRequest("/api/v1/assignments/"),
        apiRequest("/api/v1/expenditures/"),
        apiRequest("/api/v1/assets/"),
        apiRequest("/api/v1/bases/"),
        apiRequest("/api/v1/equipment-types/"),
      ]);

      /*
       * ---------------------------------------------------------
       * ROLE BASED VISIBILITY
       * ---------------------------------------------------------
       */

      let visiblePurchases = [...purchaseRows];
      let visibleTransfers = [...transferRows];
      let visibleAssignments = [...assignmentRows];
      let visibleExpenditures = [...expenditureRows];
      let visibleAssets = [...assetRows];
      let visibleBases = [...baseRows];

      if (isBaseCommander) {
        visibleBases = baseRows.filter(
          (base) => Number(base.id) === userBaseId
        );

        visiblePurchases = purchaseRows.filter(
          (item) => Number(item.base_id) === userBaseId
        );

        visibleTransfers = transferRows.filter(
          (item) =>
            Number(item.from_base_id) === userBaseId ||
            Number(item.to_base_id) === userBaseId
        );

        visibleAssignments = assignmentRows.filter(
          (item) => Number(item.base_id) === userBaseId
        );

        visibleExpenditures = expenditureRows.filter(
          (item) => Number(item.base_id) === userBaseId
        );

        visibleAssets = assetRows.filter(
          (item) => Number(item.base_id) === userBaseId
        );
      }

      if (isLogisticsOfficer) {
        visibleAssignments = [];
        visibleExpenditures = [];
      }

      /*
       * ---------------------------------------------------------
       * SET BASIC DATA
       * ---------------------------------------------------------
       */

      setBases(visibleBases);
      setEquipmentTypes(typeRows);

      /*
       * ---------------------------------------------------------
       * FILTER DATA FOR DASHBOARD
       * ---------------------------------------------------------
       *
       * These filters now affect the actual numbers.
       */

      const selectedBaseId =
        selectedBase !== "All Bases"
          ? visibleBases.find(
              (base) => base.base_name === selectedBase
            )?.id
          : null;

      const selectedEquipmentId =
        selectedEquipment !== "All Equipment"
          ? typeRows.find(
              (type) => type.type_name === selectedEquipment
            )?.id
          : null;

      const dateMatch = (date) => {
        if (!selectedDate) return true;
        return String(date || "").slice(0, 10) === selectedDate;
      };

      /*
       * Assets
       */

      let filteredAssets = visibleAssets;

      if (selectedBaseId) {
        filteredAssets = filteredAssets.filter(
          (asset) => Number(asset.base_id) === Number(selectedBaseId)
        );
      }

      if (selectedEquipmentId) {
        filteredAssets = filteredAssets.filter(
          (asset) =>
            Number(asset.equipment_type_id) ===
            Number(selectedEquipmentId)
        );
      }

      /*
       * Purchases
       */

      let filteredPurchases = visiblePurchases.filter(
        (item) =>
          item.status === "Received" &&
          dateMatch(item.purchase_date)
      );

      if (selectedBaseId) {
        filteredPurchases = filteredPurchases.filter(
          (item) =>
            Number(item.base_id) === Number(selectedBaseId)
        );
      }

      if (selectedEquipmentId) {
        filteredPurchases = filteredPurchases.filter(
          (item) =>
            Number(item.equipment_type_id) ===
            Number(selectedEquipmentId)
        );
      }

      /*
       * Transfers
       */

      let filteredTransfers = visibleTransfers.filter(
        (item) =>
          item.status === "Completed" &&
          dateMatch(item.transfer_date)
      );

      if (selectedBaseId) {
        filteredTransfers = filteredTransfers.filter(
          (item) =>
            Number(item.from_base_id) === Number(selectedBaseId) ||
            Number(item.to_base_id) === Number(selectedBaseId)
        );
      }

      /*
       * Assignments
       */

      let filteredAssignments = visibleAssignments.filter(
        (item) =>
          item.status === "Active" &&
          dateMatch(item.assigned_date)
      );

      if (selectedBaseId) {
        filteredAssignments = filteredAssignments.filter(
          (item) =>
            Number(item.base_id) === Number(selectedBaseId)
        );
      }

      /*
       * Expenditures
       */

      let filteredExpenditures = visibleExpenditures.filter(
        (item) =>
          item.status === "Recorded" &&
          dateMatch(item.expenditure_date)
      );

      if (selectedBaseId) {
        filteredExpenditures = filteredExpenditures.filter(
          (item) =>
            Number(item.base_id) === Number(selectedBaseId)
        );
      }

      /*
       * ---------------------------------------------------------
       * ACTUAL CURRENT BALANCE
       * ---------------------------------------------------------
       *
       * assets.quantity is treated as the current inventory.
       */

      const closingBalance = filteredAssets.reduce(
        (sum, asset) =>
          sum + Number(asset.quantity || 0),
        0
      );

      /*
       * ---------------------------------------------------------
       * PURCHASES
       * ---------------------------------------------------------
       */

      const purchaseTotal = filteredPurchases.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0),
        0
      );

      /*
       * ---------------------------------------------------------
       * TRANSFERS
       * ---------------------------------------------------------
       */

      let transferIn = 0;
      let transferOut = 0;

      filteredTransfers.forEach((item) => {
        const fromBase = Number(item.from_base_id);
        const toBase = Number(item.to_base_id);

        /*
         * Admin:
         * Count both sides.
         *
         * Base Commander:
         * Only count movements involving own base.
         *
         * Logistics:
         * Count both sides.
         */

        if (isBaseCommander) {
          if (toBase === userBaseId) {
            transferIn += Number(item.quantity || 0);
          }

          if (fromBase === userBaseId) {
            transferOut += Number(item.quantity || 0);
          }
        } else {
          transferIn += Number(item.quantity || 0);
          transferOut += Number(item.quantity || 0);
        }
      });

      /*
       * ---------------------------------------------------------
       * ASSIGNMENTS
       * ---------------------------------------------------------
       */

      const assignedTotal = filteredAssignments.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0),
        0
      );

      /*
       * ---------------------------------------------------------
       * EXPENDITURES
       * ---------------------------------------------------------
       */

      const expendedTotal = filteredExpenditures.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0),
        0
      );

      /*
       * ---------------------------------------------------------
       * NET MOVEMENT
       * ---------------------------------------------------------
       */

      const netMovement =
        purchaseTotal +
        transferIn -
        transferOut;

      /*
       * ---------------------------------------------------------
       * OPENING BALANCE
       * ---------------------------------------------------------
       *
       * Based on your required formula:
       *
       * Closing =
       * Opening
       * + Purchases
       * + Transfer In
       * - Transfer Out
       * - Assigned
       * - Expended
       *
       * Therefore:
       *
       * Opening =
       * Closing
       * - Purchases
       * - Transfer In
       * + Transfer Out
       * + Assigned
       * + Expended
       */

      const openingBalance =
        closingBalance -
        purchaseTotal -
        transferIn +
        transferOut +
        assignedTotal +
        expendedTotal;

      setDashboardData({
        openingBalance: Math.max(0, openingBalance),
        purchases: purchaseTotal,
        transferIn,
        transferOut,
        netMovement,
        assigned: assignedTotal,
        expended: expendedTotal,
        closingBalance: Math.max(0, closingBalance),
      });

      /*
       * ---------------------------------------------------------
       * SUMMARY TABLES
       * ---------------------------------------------------------
       */

      const movementData = {
        assets: filteredAssets,
        purchases: filteredPurchases,
        transfers: filteredTransfers,
        assignments: filteredAssignments,
        expenditures: filteredExpenditures,
      };

      setEquipmentSummary(
        summarizeMovements(
          "type",
          typeRows
            .filter((type) => {
              if (!selectedEquipmentId) return true;
              return Number(type.id) === Number(selectedEquipmentId);
            })
            .map((item) => ({
              id: item.id,
              label: item.type_name,
            })),
          movementData
        )
      );

      setBaseSummary(
        summarizeMovements(
          "base",
          visibleBases
            .filter((base) => {
              if (!selectedBaseId) return true;
              return Number(base.id) === Number(selectedBaseId);
            })
            .map((item) => ({
              id: item.id,
              label: item.base_name,
            })),
          movementData
        )
      );

      /*
       * ---------------------------------------------------------
       * RECENT MOVEMENTS
       * ---------------------------------------------------------
       */

      const assetById = new Map(
        visibleAssets.map((asset) => [
          Number(asset.id),
          asset,
        ])
      );

      const baseName = (id) =>
        visibleBases.find(
          (base) => Number(base.id) === Number(id)
        )?.base_name || "Unknown";

      const typeName = (assetId) => {
        const asset = assetById.get(Number(assetId));

        return (
          typeRows.find(
            (type) =>
              Number(type.id) ===
              Number(asset?.equipment_type_id)
          )?.type_name || "Unknown"
        );
      };

      const movementRows = [
        ...visiblePurchases.map((record) => ({
          id: record.purchase_number,
          date: record.purchase_date,
          type: "Purchase",
          asset: record.asset_name,
          equipmentType:
            typeRows.find(
              (type) =>
                Number(type.id) ===
                Number(record.equipment_type_id)
            )?.type_name || "Unknown",
          quantity: Number(record.quantity || 0),
          base: baseName(record.base_id),
          status: record.status,
        })),

        ...visibleTransfers.flatMap((record) => {
          const asset = assetById.get(
            Number(record.asset_id)
          );

          const shared = {
            date: record.transfer_date,
            asset:
              asset?.asset_name ||
              "Unknown asset",
            equipmentType: typeName(record.asset_id),
            quantity: Number(record.quantity || 0),
            status: record.status,
          };

          const rows = [];

          if (
            !isBaseCommander ||
            Number(record.from_base_id) === userBaseId
          ) {
            rows.push({
              ...shared,
              id: `${record.transfer_number}-OUT`,
              type: "Transfer Out",
              base: baseName(record.from_base_id),
            });
          }

          if (
            !isBaseCommander ||
            Number(record.to_base_id) === userBaseId
          ) {
            rows.push({
              ...shared,
              id: `${record.transfer_number}-IN`,
              type: "Transfer In",
              base: baseName(record.to_base_id),
            });
          }

          return rows;
        }),

        ...visibleAssignments.map((record) => ({
          id: record.assignment_number,
          date: record.assigned_date,
          type: "Assignment",
          asset:
            assetById.get(
              Number(record.asset_id)
            )?.asset_name || "Unknown asset",
          equipmentType: typeName(record.asset_id),
          quantity: Number(record.quantity || 0),
          base: baseName(record.base_id),
          status: record.status,
        })),

        ...visibleExpenditures.map((record) => ({
          id: record.expenditure_number,
          date: record.expenditure_date,
          type: "Expenditure",
          asset:
            assetById.get(
              Number(record.asset_id)
            )?.asset_name || "Unknown asset",
          equipmentType: typeName(record.asset_id),
          quantity: Number(record.quantity || 0),
          base: baseName(record.base_id),
          status: record.status,
        })),
      ];

      setRecentMovements(
        movementRows.sort((a, b) =>
          String(b.date || "").localeCompare(
            String(a.date || "")
          )
        )
      );
    } catch (requestError) {
      console.error("Dashboard loading error:", requestError);
      setError(
        requestError?.message ||
          "Unable to load dashboard data."
      );
    }
  };

  loadDashboard();
}, [
  isBaseCommander,
  isLogisticsOfficer,
  userBaseId,
  selectedBase,
  selectedEquipment,
  selectedDate,
]);

  /*
   * Net Movement
   *
   * Purchases + Transfer In - Transfer Out
   */
  const netMovement = dashboardData.netMovement;

  /*
   * Closing Balance
   *
   * Opening Balance
   * + Purchases
   * + Transfer In
   * - Transfer Out
   * - Assigned
   * - Expended
   */
  const closingBalance = dashboardData.closingBalance;

  const filteredMovements = useMemo(() => {
    return recentMovements.filter((item) => {
      const baseMatch =
        selectedBase === "All Bases" ||
        item.base === selectedBase;

      const equipmentMatch =
        selectedEquipment === "All Equipment" ||
        item.equipmentType === selectedEquipment;

      const dateMatch =
        !selectedDate || item.date === selectedDate;

      const typeMatch =
        movementType === "All" ||
        item.type === movementType;

      return (
        baseMatch &&
        equipmentMatch &&
        dateMatch &&
        typeMatch
      );
    });
  }, [
    recentMovements,
    selectedBase,
    selectedEquipment,
    selectedDate,
    movementType,
  ]);

  const clearFilters = () => {
    setSelectedBase(
      isBaseCommander
        ? currentUser?.base_name || "All Bases"
        : "All Bases"
    );
    setSelectedEquipment("All Equipment");
    setSelectedDate("");
    setMovementType("All");
  };

  useEffect(() => {
    if (isBaseCommander && currentUser?.base_name) {
      setSelectedBase(currentUser.base_name);
    }
  }, [isBaseCommander, currentUser?.base_name]);

  return (
    <Layout
      title="Command Dashboard"
      subtitle="Military Asset Management System overview"
    >
      <Container fluid className="pb-4">
      {/* =====================================================
          HEADER
      ====================================================== */}
      <div className="d-flex justify-content-end align-items-center gap-2 mb-4">
          <Badge
            bg="success"
            className="px-3 py-2"
          >
            <i className="bi bi-circle-fill me-2"></i>
            System Operational
          </Badge>

          <Badge
            bg={isAdmin ? "dark" : isBaseCommander ? "primary" : "secondary"}
            className="px-3 py-2"
          >
            <i className="bi bi-person-badge me-2"></i>
            {isAdmin
              ? "Administrator"
              : isBaseCommander
              ? `Base Commander${currentUser?.base_name ? ` · ${currentUser.base_name}` : ""}`
              : isLogisticsOfficer
              ? "Logistics Officer"
              : "User"}
          </Badge>

          <Button
            variant="outline-primary"
            onClick={() => window.location.reload()}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </Button>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}

      {/* =====================================================
          FILTERS
      ====================================================== */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
            <div>
              <h6 className="fw-bold mb-1">
                Dashboard Filters
              </h6>

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
            <Col xs={12} md={4}>
              <Form.Label className="small fw-semibold">
                Date
              </Form.Label>

              <Form.Control
                type="date"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(e.target.value)
                }
              />
            </Col>

            <Col xs={12} md={4}>
              <Form.Label className="small fw-semibold">
                Base
              </Form.Label>

              <Form.Select
                value={selectedBase}
                onChange={(e) =>
                  setSelectedBase(e.target.value)
                }
                disabled={isBaseCommander}
              >
                {!isBaseCommander && <option>All Bases</option>}
                {bases.map((base) => (
                  <option key={base.id}>
                    {base.base_name}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col xs={12} md={4}>
              <Form.Label className="small fw-semibold">
                Equipment Type
              </Form.Label>

              <Form.Select
                value={selectedEquipment}
                onChange={(e) =>
                  setSelectedEquipment(e.target.value)
                }
              >
                <option>All Equipment</option>
                {equipmentTypes.map((type) => <option key={type.id}>{type.type_name}</option>)}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* =====================================================
          KEY METRICS
      ====================================================== */}
      <Row className="g-3 mb-4">
        {/* Opening */}
        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <small className="text-muted">
                    Opening Balance
                  </small>

                  <h2 className="fw-bold mt-2 mb-1">
                    {dashboardData.openingBalance.toLocaleString()}
                  </h2>

                  <small className="text-muted">
                    Beginning of selected period
                  </small>
                </div>

                <div className="fs-1 text-secondary">
                  <i className="bi bi-box-seam"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Closing */}
        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <small className="text-muted">
                    Closing Balance
                  </small>

                  <h2 className="fw-bold text-success mt-2 mb-1">
                    {closingBalance.toLocaleString()}
                  </h2>

                  <small className="text-success">
                    Current available balance
                  </small>
                </div>

                <div className="fs-1 text-success">
                  <i className="bi bi-boxes"></i>
                </div>
              </div>

              <Button
                variant="link"
                className="px-0 mt-2 text-decoration-none"
                onClick={() => setShowBalanceDetails(true)}
              >
                View calculation
                <i className="bi bi-arrow-right ms-1"></i>
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Net Movement */}
        <Col xs={12} sm={6} xl={3}>
          <Card
            className="border-0 shadow-sm h-100"
            role="button"
            onClick={() => setShowMovementModal(true)}
          >
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <small className="text-muted">
                    Net Movement
                  </small>

                  <h2 className="fw-bold text-primary mt-2 mb-1">
                    +{netMovement.toLocaleString()}
                  </h2>

                  <small className="text-primary">
                    Purchases + In − Out
                  </small>
                </div>

                <div className="fs-1 text-primary">
                  <i className="bi bi-arrow-left-right"></i>
                </div>
              </div>

              <div className="mt-3">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMovementModal(true);
                  }}
                >
                  View movement
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {!isLogisticsOfficer && (
          <>
            {/* Assigned */}
            <Col xs={12} sm={6} xl={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between">
                    <div>
                      <small className="text-muted">
                        Assigned
                      </small>

                      <h2 className="fw-bold text-warning mt-2 mb-1">
                        {dashboardData.assigned.toLocaleString()}
                      </h2>

                      <small className="text-muted">
                        Currently assigned
                      </small>
                    </div>

                    <div className="fs-1 text-warning">
                      <i className="bi bi-person-badge"></i>
                    </div>
                  </div>

                  <Button
                    variant="link"
                    className="px-0 mt-2 text-decoration-none text-warning"
                    onClick={() => setShowAssignedDetails(true)}
                  >
                    View assignments
                    <i className="bi bi-arrow-right ms-1"></i>
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </>
        )}
      </Row>

      {!isLogisticsOfficer && (
        <>
          {/* =====================================================
              EXPENDED CARD
          ====================================================== */}
          <Row className="g-3 mb-4">
            <Col xs={12}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <Row className="align-items-center">
                    <Col xs={12} md={8}>
                      <div className="d-flex align-items-center">
                        <div className="rounded-circle bg-danger bg-opacity-10 text-danger p-3 me-3">
                          <i className="bi bi-box-arrow-down fs-4"></i>
                        </div>

                        <div>
                          <small className="text-muted">
                            Total Expended
                          </small>

                          <h3 className="fw-bold mb-0">
                            {dashboardData.expended.toLocaleString()}
                          </h3>

                          <small className="text-muted">
                            Assets consumed / expended during operations
                          </small>
                        </div>
                      </div>
                    </Col>

                    <Col
                      xs={12}
                      md={4}
                      className="text-md-end mt-3 mt-md-0"
                    >
                      <Button
                        variant="outline-danger"
                        onClick={() => setShowExpendedDetails(true)}
                      >
                        View Expenditures
                        <i className="bi bi-arrow-right ms-2"></i>
                      </Button>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* =====================================================
          MOVEMENT BREAKDOWN
      ====================================================== */}
      <Row className="g-3 mb-4">
        <Col xs={12} lg={5}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3">
              <h5 className="fw-bold mb-0">
                Movement Breakdown
              </h5>

              <small className="text-muted">
                Components of net movement
              </small>
            </Card.Header>

            <Card.Body>
              <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
                <div>
                  <i className="bi bi-cart-check-fill text-success me-2"></i>
                  Purchases
                </div>

                <span className="fw-bold text-success">
                  +{dashboardData.purchases.toLocaleString()}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
                <div>
                  <i className="bi bi-arrow-down-left text-primary me-2"></i>
                  Transfer In
                </div>

                <span className="fw-bold text-primary">
                  +{dashboardData.transferIn.toLocaleString()}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
                <div>
                  <i className="bi bi-arrow-up-right text-warning me-2"></i>
                  Transfer Out
                </div>

                <span className="fw-bold text-warning">
                  -{dashboardData.transferOut.toLocaleString()}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center pt-4">
                <span className="fw-bold">
                  Net Movement
                </span>

                <span className="fw-bold fs-5 text-primary">
                  +{netMovement.toLocaleString()}
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {!isLogisticsOfficer && (
          <>
            {/* Balance Calculation */}
            <Col xs={12} lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white py-3">
                  <h5 className="fw-bold mb-0">
                    Balance Position
                  </h5>

                  <small className="text-muted">
                    Current asset position
                  </small>
                </Card.Header>

                <Card.Body>
                  <div className="table-responsive">
                    <Table className="align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Component</th>
                          <th className="text-end">
                            Quantity
                          </th>
                          <th className="text-end">
                            Effect
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr>
                          <td>Opening Balance</td>

                          <td className="text-end">
                            {dashboardData.openingBalance.toLocaleString()}
                          </td>

                          <td className="text-end">
                            <Badge bg="secondary">Base</Badge>
                          </td>
                        </tr>

                        <tr>
                          <td>Purchases</td>

                          <td className="text-end">
                            {dashboardData.purchases.toLocaleString()}
                          </td>

                          <td className="text-end text-success">
                            + Increase
                          </td>
                        </tr>

                        <tr>
                          <td>Transfer In</td>

                          <td className="text-end">
                            {dashboardData.transferIn.toLocaleString()}
                          </td>

                          <td className="text-end text-success">
                            + Increase
                          </td>
                        </tr>

                        <tr>
                          <td>Transfer Out</td>

                          <td className="text-end">
                            {dashboardData.transferOut.toLocaleString()}
                          </td>

                          <td className="text-end text-danger">
                            − Decrease
                          </td>
                        </tr>

                        <tr>
                          <td>Assigned</td>

                          <td className="text-end">
                            {dashboardData.assigned.toLocaleString()}
                          </td>

                          <td className="text-end text-warning">
                            − Allocated
                          </td>
                        </tr>

                        <tr>
                          <td>Expended</td>

                          <td className="text-end">
                            {dashboardData.expended.toLocaleString()}
                          </td>

                          <td className="text-end text-danger">
                            − Consumed
                          </td>
                        </tr>

                        <tr className="table-success fw-bold">
                          <td>Closing Balance</td>

                          <td className="text-end">
                            {closingBalance.toLocaleString()}
                          </td>

                          <td className="text-end">
                            Available
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </>
        )}
      </Row>

      {!isLogisticsOfficer && (
        <>
          {/* =====================================================
              EQUIPMENT SUMMARY
          ====================================================== */}
          <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3">
          <h5 className="fw-bold mb-0">
            Equipment Position
          </h5>

          <small className="text-muted">
            Balance and movement by equipment type
          </small>
        </Card.Header>

        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-3">
                    Equipment Type
                  </th>

                  <th>Opening</th>
                  <th>Purchases</th>
                  <th>Transfer In</th>
                  <th>Transfer Out</th>
                  <th>Assigned</th>
                  <th>Expended</th>
                  <th>Closing</th>
                </tr>
              </thead>

              <tbody>
                {equipmentSummary.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      No equipment data available.
                    </td>
                  </tr>
                ) : equipmentSummary.map((item) => {
                  const closing =
                    item.opening +
                    item.purchases +
                    item.transferIn -
                    item.transferOut -
                    item.assigned -
                    item.expended;

                  return (
                    <tr key={item.type}>
                      <td className="px-3 fw-semibold">
                        {item.type}
                      </td>

                      <td>
                        {item.opening.toLocaleString()}
                      </td>

                      <td className="text-success">
                        +{item.purchases.toLocaleString()}
                      </td>

                      <td className="text-primary">
                        +{item.transferIn.toLocaleString()}
                      </td>

                      <td className="text-warning">
                        -{item.transferOut.toLocaleString()}
                      </td>

                      <td className="text-warning">
                        {item.assigned.toLocaleString()}
                      </td>

                      <td className="text-danger">
                        {item.expended.toLocaleString()}
                      </td>

                      <td className="fw-bold text-success">
                        {closing.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

          {/* =====================================================
              BASE SUMMARY
          ====================================================== */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white py-3">
              <h5 className="fw-bold mb-0">
                Base-wise Asset Position
              </h5>

              <small className="text-muted">
                Overview across operational bases
              </small>
            </Card.Header>

            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="px-3">Base</th>
                      <th>Opening</th>
                      <th>Purchases</th>
                      <th>Transfer In</th>
                      <th>Transfer Out</th>
                      <th>Assigned</th>
                      <th>Expended</th>
                      <th>Closing</th>
                    </tr>
                  </thead>

                  <tbody>
                    {baseSummary.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4 text-muted">
                          No base data available.
                        </td>
                      </tr>
                    ) : baseSummary.map((item) => {
                      const closing =
                        item.opening +
                        item.purchases +
                        item.transferIn -
                        item.transferOut -
                        item.assigned -
                        item.expended;

                      return (
                        <tr key={item.base}>
                          <td className="px-3 fw-semibold">
                            <i className="bi bi-building me-2 text-primary"></i>
                            {item.base}
                          </td>

                          <td>
                            {item.opening.toLocaleString()}
                          </td>

                          <td className="text-success">
                            +{item.purchases.toLocaleString()}
                          </td>

                          <td className="text-primary">
                            +{item.transferIn.toLocaleString()}
                          </td>

                          <td className="text-warning">
                            -{item.transferOut.toLocaleString()}
                          </td>

                          <td>
                            {item.assigned.toLocaleString()}
                          </td>

                          <td className="text-danger">
                            {item.expended.toLocaleString()}
                          </td>

                          <td className="fw-bold text-success">
                            {closing.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      {/* =====================================================
          RECENT MOVEMENTS
      ====================================================== */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white py-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
            <div>
              <h5 className="fw-bold mb-0">
                Recent Asset Movements
              </h5>

              <small className="text-muted">
                {isLogisticsOfficer
                  ? "Latest purchases and transfers"
                  : "Latest purchases, transfers, assignments and expenditures"}
              </small>
            </div>

            <Form.Select
              size="sm"
              style={{ maxWidth: "180px" }}
              value={movementType}
              onChange={(e) =>
                setMovementType(e.target.value)
              }
            >
              <option value="All">
                All Movements
              </option>

              <option value="Purchase">
                Purchases
              </option>

              <option value="Transfer In">
                Transfer In
              </option>

              <option value="Transfer Out">
                Transfer Out
              </option>

              {!isLogisticsOfficer && (
                <>
                  <option value="Assignment">
                    Assignments
                  </option>

                  <option value="Expenditure">
                    Expenditures
                  </option>
                </>
              )}
            </Form.Select>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-3">
                    Movement ID
                  </th>

                  <th>Date</th>
                  <th>Movement</th>
                  <th>Asset</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Base</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-5 text-muted"
                    >
                      No movements found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 fw-semibold">
                        {item.id}
                      </td>

                      <td>{item.date}</td>

                      <td>
                        <MovementBadge type={item.type} />
                      </td>

                      <td>
                        <div className="fw-semibold">
                          {item.asset}
                        </div>
                      </td>

                      <td>{item.equipmentType}</td>

                      <td className="fw-semibold">
                        {item.quantity.toLocaleString()}
                      </td>

                      <td>{item.base}</td>

                      <td>
                        <Badge
                          bg={
                            item.status === "Completed"
                              ? "success"
                              : item.status === "Active"
                              ? "info"
                              : "secondary"
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* =====================================================
          NET MOVEMENT MODAL
      ====================================================== */}
      <Modal
        show={showMovementModal}
        onHide={() => setShowMovementModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            Net Movement Details
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p className="text-muted">
            Net Movement is calculated using:
          </p>

          <div className="bg-light rounded p-3 mb-4 text-center fw-bold">
            Purchases + Transfer In − Transfer Out
          </div>

          <div className="d-flex justify-content-between py-3 border-bottom">
            <span>
              <i className="bi bi-cart-check text-success me-2"></i>
              Purchases
            </span>

            <strong className="text-success">
              +{dashboardData.purchases.toLocaleString()}
            </strong>
          </div>

          <div className="d-flex justify-content-between py-3 border-bottom">
            <span>
              <i className="bi bi-arrow-down-left text-primary me-2"></i>
              Transfer In
            </span>

            <strong className="text-primary">
              +{dashboardData.transferIn.toLocaleString()}
            </strong>
          </div>

          <div className="d-flex justify-content-between py-3 border-bottom">
            <span>
              <i className="bi bi-arrow-up-right text-warning me-2"></i>
              Transfer Out
            </span>

            <strong className="text-warning">
              -{dashboardData.transferOut.toLocaleString()}
            </strong>
          </div>

          <div className="d-flex justify-content-between pt-4">
            <span className="fw-bold">
              Net Movement
            </span>

            <strong className="text-primary fs-4">
              +{netMovement.toLocaleString()}
            </strong>
          </div>
        </Modal.Body>
      </Modal>

      {/* =====================================================
          BALANCE MODAL
      ====================================================== */}
      <Modal
        show={showBalanceDetails}
        onHide={() => setShowBalanceDetails(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            Closing Balance Calculation
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="d-flex justify-content-between mb-3">
            <span>Opening Balance</span>
            <strong>
              {dashboardData.openingBalance.toLocaleString()}
            </strong>
          </div>

          <div className="d-flex justify-content-between mb-3 text-success">
            <span>+ Purchases</span>
            <strong>
              +{dashboardData.purchases.toLocaleString()}
            </strong>
          </div>

          <div className="d-flex justify-content-between mb-3 text-primary">
            <span>+ Transfer In</span>
            <strong>
              +{dashboardData.transferIn.toLocaleString()}
            </strong>
          </div>

          <div className="d-flex justify-content-between mb-3 text-warning">
            <span>− Transfer Out</span>
            <strong>
              -{dashboardData.transferOut.toLocaleString()}
            </strong>
          </div>

          <div className="d-flex justify-content-between mb-3 text-warning">
            <span>− Assigned</span>
            <strong>
              -{dashboardData.assigned.toLocaleString()}
            </strong>
          </div>

          <div className="d-flex justify-content-between mb-4 text-danger">
            <span>− Expended</span>
            <strong>
              -{dashboardData.expended.toLocaleString()}
            </strong>
          </div>

          <div className="bg-success bg-opacity-10 rounded p-3 d-flex justify-content-between">
            <strong>Closing Balance</strong>

            <strong className="text-success fs-5">
              {closingBalance.toLocaleString()}
            </strong>
          </div>
        </Modal.Body>
      </Modal>

      {/* =====================================================
          ASSIGNED MODAL
      ====================================================== */}
      <Modal
        show={showAssignedDetails}
        onHide={() => setShowAssignedDetails(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            Assigned Assets
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="text-center py-3">
            <i className="bi bi-person-badge text-warning fs-1"></i>

            <h2 className="fw-bold mt-3">
              {dashboardData.assigned.toLocaleString()}
            </h2>

            <p className="text-muted mb-0">
              Assets currently assigned to personnel
            </p>
          </div>

          <hr />

          <div className="text-center text-muted">
            No assignment records are available.
          </div>
        </Modal.Body>
      </Modal>

      {/* =====================================================
          EXPENDED MODAL
      ====================================================== */}
      <Modal
        show={showExpendedDetails}
        onHide={() => setShowExpendedDetails(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            Expenditure Summary
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="text-center py-3">
            <i className="bi bi-box-arrow-down text-danger fs-1"></i>

            <h2 className="fw-bold mt-3">
              {dashboardData.expended.toLocaleString()}
            </h2>

            <p className="text-muted mb-0">
              Total assets expended
            </p>
          </div>

          <hr />

          <div className="text-center text-muted">
            No expenditure records are available.
          </div>
        </Modal.Body>
      </Modal>
      </Container>
    </Layout>
  );
}