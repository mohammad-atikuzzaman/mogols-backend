const Product = require("../models/Product");
const Order = require("../models/Order");
const Fuse = require('fuse.js');

const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes


// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    try {
        const keyword = req.query.keyword || '';
        const category = req.query.category || '';

        // Optimization: If simple category filter without search, use DB index
        if (!keyword && category) {
            const products = await Product.find({ category: { $regex: category, $options: 'i' } });
            return res.json(products);
        }

        // Optimization: If no search and no category, return all (cached)
        if (!keyword && !category) {
            const cacheKey = 'products_all';
            const cachedProducts = cache.get(cacheKey);
            if (cachedProducts) return res.json(cachedProducts);

            const products = await Product.find({});
            cache.set(cacheKey, products);
            return res.json(products);
        }

        // If fuzzy search is needed (keyword is present)
        // We fetch all products (or a wide subset) and use Fuse.js
        // For a small catalog (<10k items), this is fine.
        let products = await Product.find({}).lean();

        if (keyword) {
            const fuse = new Fuse(products, {
                keys: ['name', 'brand', 'category', 'description'],
                threshold: 0.3, // 0.0 = perfect match, 1.0 = match anything. 0.3 allows small typos ("heney")
                includeScore: true
            });

            const result = fuse.search(keyword);
            products = result.map(r => r.item);
        }

        // Apply category filter in-memory if both keyword and category are present
        if (category) {
            products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }

        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate("reviews.user", "name email");

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: "Product not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            await product.deleteOne(); // Use deleteOne instead of remove in recent Mongoose
            // Invalidate cache
            cache.del('products_all');
            res.json({ message: "Product removed" });
        } else {
            res.status(404).json({ message: "Product not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
    try {
        const { name, price, image, brand, category, countInStock, description } = req.body;

        const product = new Product({
            name: name || "Sample name",
            price: price || 0,
            user: req.user._id,
            image: image || "/images/sample.jpg",
            brand: brand || "Sample brand",
            category: category || "Sample category",
            countInStock: countInStock || 0,
            numReviews: 0,
            description: description || "Sample description",
        });

        const createdProduct = await product.save();
        cache.del('products_all');
        res.status(201).json(createdProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
    try {
        const {
            name,
            price,
            description,
            image,
            brand,
            category,
            countInStock,
        } = req.body;

        const product = await Product.findById(req.params.id);

        if (product) {
            product.name = name || product.name;
            product.price = price || product.price;
            product.description = description || product.description;
            product.image = image || product.image;
            product.brand = brand || product.brand;
            product.category = category || product.category;
            product.countInStock = countInStock || product.countInStock;

            const updatedProduct = await product.save();
            cache.del('products_all');
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: "Product not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const product = await Product.findById(req.params.id);

        if (product) {
            const alreadyReviewed = product.reviews.find(
                (r) => r.user.toString() === req.user._id.toString()
            );

            if (alreadyReviewed) {
                res.status(400).json({ message: "Product already reviewed" });
                return;
            }

            // Check if user has purchased the product
            const orders = await Order.find({ user: req.user._id, isPaid: true });

            const hasPurchased = orders.some(order =>
                order.orderItems.some(item =>
                    item.product.toString() === req.params.id
                )
            );

            if (!hasPurchased) {
                res.status(400).json({ message: "You can only review products you have purchased" });
                return;
            }

            const review = {
                name: req.user.name,
                rating: Number(rating),
                comment,
                user: req.user._id,
            };

            product.reviews.push(review);
            product.numReviews = product.reviews.length;
            product.rating =
                product.reviews.reduce((acc, item) => item.rating + acc, 0) /
                product.reviews.length;

            await product.save();
            res.status(201).json({ message: "Review added" });
        } else {
            res.status(404).json({ message: "Product not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Get related products
// @route   GET /api/products/:id/related
// @access  Public
const getRelatedProducts = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            const related = await Product.find({
                _id: { $ne: product._id },
                category: product.category
            }).limit(4);

            res.json(related);
        } else {
            res.status(404).json({ message: "Product not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getProducts,
    getProductById,
    deleteProduct,
    createProduct,
    updateProduct,
    createProductReview,
    getRelatedProducts,
};
