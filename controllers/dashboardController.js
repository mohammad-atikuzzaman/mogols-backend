const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get dashboard metrics
// @route   GET /api/dashboard/summary
// @access  Private/Admin
const getDashboardSummary = asyncHandler(async (req, res) => {
    // 1. Total Sales (Aggregation for performance)
    const salesAggregation = await Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalSales = salesAggregation.length > 0 ? salesAggregation[0].total : 0;

    // 2. Counts
    const activeOrders = await Order.countDocuments({ isDelivered: false });
    const totalOrders = await Order.countDocuments({});
    const totalUsers = await User.countDocuments({});
    const totalProducts = await Product.countDocuments({});

    // 3. Sales Chart Data (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const salesData = await Order.aggregate([
        {
            $match: {
                isPaid: true,
                createdAt: { $gte: sevenDaysAgo }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                sales: { $sum: "$totalPrice" }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Fill in missing days to ensure continuous chart data
    const formattedSalesData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toISOString().split('T')[0];

        const found = salesData.find(item => item._id === dateString);
        formattedSalesData.push({
            name: `${d.getMonth() + 1}/${d.getDate()}`,
            date: dateString,
            sales: found ? found.sales : 0
        });
    }

    // 4. Order Status Distribution (Detailed statuses)
    const statusData = await Order.aggregate([
        {
            $group: {
                _id: {
                    isPaid: "$isPaid",
                    isDelivered: "$isDelivered"
                },
                count: { $sum: 1 }
            }
        }
    ]);

    let deliveredCount = 0;
    let paidPendingCount = 0;
    let unpaidCount = 0;

    statusData.forEach(item => {
        if (item._id.isDelivered) {
            deliveredCount += item.count;
        } else if (item._id.isPaid) {
            paidPendingCount += item.count;
        } else {
            unpaidCount += item.count;
        }
    });

    const orderStatusData = [
        { name: 'Delivered', value: deliveredCount },
        { name: 'Paid (Pending)', value: paidPendingCount },
        { name: 'Unpaid', value: unpaidCount }
    ];

    // 5. Recent Orders (Lean query)
    const recentOrders = await Order.find({})
        .select('_id user totalPrice isPaid isDelivered createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email')
        .lean();

    res.json({
        totalSales,
        activeOrders,
        totalOrders,
        totalCustomers: totalUsers,
        totalProducts,
        salesData: formattedSalesData,
        orderStatusData,
        recentOrders
    });
});

module.exports = {
    getDashboardSummary
};
