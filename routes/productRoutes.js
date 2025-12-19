const express = require("express");
const router = express.Router();
const {
    getProducts,
    getProductById,
    deleteProduct,
    updateProduct,
    createProduct,
    createProductReview,
} = require("../controllers/productController");
const { protect, authorize } = require("../middleware/authMiddleware");

// /api/products
router
    .route("/")
    .get(getProducts)
    .post(protect, authorize("admin", "seller"), createProduct);

router.route("/:id/reviews").post(protect, createProductReview);

router
    .route("/:id")
    .get(getProductById)
    .delete(protect, authorize("admin", "seller"), deleteProduct)
    .put(protect, authorize("admin", "seller"), updateProduct);

module.exports = router;
