const express = require("express");
const router = express.Router();
const {
    addOrderItems,
    getOrderById,
    updateOrderToPaid,
    updateOrderToDelivered,
    getMyOrders,
    getOrders,
    checkOrderPurchase,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/authMiddleware");

// /api/orders
router
    .route("/")
    .post(protect, addOrderItems)
    .get(protect, authorize("admin"), getOrders);

router.route("/myorders").get(protect, getMyOrders);
router.route("/check-purchase/:productId").get(protect, checkOrderPurchase);

router.route("/:id").get(protect, getOrderById);

router.route("/:id/pay").put(protect, updateOrderToPaid);

router
    .route("/:id/deliver")
    .put(protect, authorize("admin"), updateOrderToDelivered);

module.exports = router;
