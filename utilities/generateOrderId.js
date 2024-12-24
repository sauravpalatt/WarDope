
const crypto = require('crypto');

function generateOrderId(order) {
  if (!order.orderId) {
    const randomPart = crypto.randomBytes(4).toString('hex'); // Generate 8-character alphanumeric string
    order.orderId = `ORD-${Date.now()}-${randomPart}`;
  }
  return order;
}

module.exports = generateOrderId;