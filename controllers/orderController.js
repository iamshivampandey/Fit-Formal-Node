const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const databaseService = require('../services/databaseService');
const router = express.Router();

// Create a new order with order items
router.post('/createOrder', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Create order request received');
    const {
      customerId,
      orderDate,
      orderType,
      totalAmount,
      paymentStatus,
      advancePaid,
      deliveryDate,
      notes,
      orderItems,
      deliveryAddress,
      deliveryAddressId
    } = req.body;

    // Validate required fields
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'customerId is required'
      });
    }

    // Calculate totalAmount from orderItems if not provided
    let calculatedTotal = totalAmount || 0;
    if (orderItems && Array.isArray(orderItems) && orderItems.length > 0) {
      calculatedTotal = orderItems.reduce((sum, item) => {
        const itemTotal = item.itemTotal || (item.quantity * item.unitPrice) || 0;
        return sum + itemTotal;
      }, 0);
    }

    // Create order
    const orderData = {
      customerId,
      orderDate: orderDate || new Date().toISOString(),
      orderType: orderType || null,
      totalAmount: calculatedTotal,
      paymentStatus: paymentStatus || 'Pending',
      advancePaid: advancePaid || 0,
      deliveryDate: deliveryDate || null,
      notes: notes || null,
      createdBy: req.user.userId || customerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('📋 Order data:', orderData);
    const orderResult = await databaseService.db.InsertOrder(orderData);
    const orderId = orderResult.orderId;

    // Insert order items if provided
    const insertedOrderItems = [];
    if (orderItems && Array.isArray(orderItems) && orderItems.length > 0) {
      const currentTime = new Date().toISOString();
      for (const item of orderItems) {
        // itemTotal is a computed column in the database, so we don't include it in INSERT
        const orderItemData = {
          orderId,
          itemType: item.itemType || null,
          productCode: item.productCode || null,
          description: item.description || null,
          shopId: item.shopId || null,
          tailorId: item.tailorId || null,
          quantity: item.quantity || 1,
          unit: item.unit || null,
          unitPrice: item.unitPrice || 0,
          status: item.status || 'Pending',
          notes: item.notes || null,
          measurementDate: item.measurementDate || null,
          measurementSlot: item.measurementSlot.time || null,
          stitchingDate: item.stitchingDate || null,
          createdAt: currentTime,
          updatedAt: currentTime
        };

        const itemResult = await databaseService.db.InsertOrderItem(orderItemData);
        insertedOrderItems.push({
          orderItemId: itemResult.orderItemId,
          ...orderItemData
        });
      }
    }

    // Handle delivery address
    let deliveryAddressData = null;
    if (deliveryAddressId) {
      // Use existing address - get it by orderId (will be null initially, but structure is ready)
      // In this case, we'd need to copy from an existing order's address
      // For now, we'll create a new address entry
      console.log('📋 Using existing delivery address ID:', deliveryAddressId);
    } else if (deliveryAddress) {
      // Create new delivery address
      console.log('📋 Creating new delivery address');
      const addressData = {
        orderId,
        userId: customerId,
        fullName: deliveryAddress.fullName,
        phoneNumber: deliveryAddress.phoneNumber,
        alternatePhone: deliveryAddress.alternatePhone || null,
        addressLine1: deliveryAddress.addressLine1,
        addressLine2: deliveryAddress.addressLine2 || null,
        landmark: deliveryAddress.landmark || null,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        pincode: deliveryAddress.pincode,
        addressType: deliveryAddress.addressType || 'Home',
        deliveryInstructions: deliveryAddress.deliveryInstructions || null,
        googleMapLink: deliveryAddress.googleMapLink || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Validate required fields
      if (!addressData.fullName || !addressData.phoneNumber || !addressData.addressLine1 || 
          !addressData.city || !addressData.state || !addressData.pincode) {
        return res.status(400).json({
          success: false,
          message: 'Delivery address requires: fullName, phoneNumber, addressLine1, city, state, pincode'
        });
      }

      const addressResult = await databaseService.db.InsertDeliveryAddress(addressData);
      deliveryAddressData = await databaseService.db.GetDeliveryAddressByOrderId(orderId);
    }

    // Get the created order with items
    const createdOrder = await databaseService.db.GetOrderById(orderId);
    const orderItemsList = await databaseService.db.GetOrderItemsByOrderId(orderId);

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: createdOrder,
        orderItems: orderItemsList,
        deliveryAddress: deliveryAddressData
      }
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get order by ID with order items
router.get('/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('🔄 Get order by ID request received:', orderId);

    const order = await databaseService.db.GetOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get order items
    const orderItems = await databaseService.db.GetOrderItemsByOrderId(orderId);
    
    // Get delivery address
    const deliveryAddress = await databaseService.db.GetDeliveryAddressByOrderId(orderId);

    return res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: {
        order,
        orderItems,
        deliveryAddress
      }
    });

  } catch (error) {
    console.error('❌ Error getting order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all orders
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Get all orders request received');
    
    const { limit, offset, orderBy } = req.query;
    const parameters = {};
    
    if (limit) parameters.limit = parseInt(limit);
    if (offset) parameters.offset = parseInt(offset);
    if (orderBy) parameters.orderBy = orderBy;

    const orders = await databaseService.db.GetAllOrders(parameters);

    return res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
      count: orders.length,
      data: orders
    });

  } catch (error) {
    console.error('❌ Error getting orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get orders by customer ID
router.get('/orders/customer/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    console.log('🔄 Get orders by customer ID request received:', customerId);

    const orders = await databaseService.db.GetOrdersByCustomerId(customerId);

    // Get order items and delivery addresses for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await databaseService.db.GetOrderItemsByOrderId(order.orderId);
        const deliveryAddress = await databaseService.db.GetDeliveryAddressByOrderId(order.orderId);
        return {
          ...order,
          orderItems,
          deliveryAddress
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Customer orders retrieved successfully',
      count: ordersWithItems.length,
      data: ordersWithItems
    });

  } catch (error) {
    console.error('❌ Error getting customer orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get customer orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update order
router.put('/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      customerId,
      orderDate,
      orderType,
      totalAmount,
      paymentStatus,
      advancePaid,
      deliveryDate,
      notes
    } = req.body;

    console.log('🔄 Update order request received:', orderId);

    // Build update object - only include fields that are provided
    const updateData = {};
    if (customerId !== undefined) updateData.customerId = customerId;
    if (orderDate !== undefined) updateData.orderDate = orderDate;
    if (orderType !== undefined) updateData.orderType = orderType;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (advancePaid !== undefined) updateData.advancePaid = advancePaid;
    if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate;
    if (notes !== undefined) updateData.notes = notes;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided to update'
      });
    }

    const result = await databaseService.db.UpdateOrder(orderId, updateData);

    if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
      // Get updated order
      const updatedOrder = await databaseService.db.GetOrderById(orderId);
      const orderItems = await databaseService.db.GetOrderItemsByOrderId(orderId);

      return res.status(200).json({
        success: true,
        message: 'Order updated successfully',
        data: {
          order: updatedOrder,
          orderItems
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

  } catch (error) {
    console.error('❌ Error updating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete order
router.delete('/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('🔄 Delete order request received:', orderId);

    // Note: This will delete the order, but order items should be deleted separately
    // or handled by database cascade delete if configured
    const result = await databaseService.db.DeleteOrder(orderId);

    if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: 'Order deleted successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

  } catch (error) {
    console.error('❌ Error deleting order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== OrderItem Routes ====================

// Create order item
router.post('/orders/:orderId/items', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      itemType,
      productCode,
      description,
      shopId,
      tailorId,
      quantity,
      unit,
      unitPrice,
      status,
      notes,
      measurementDate,
      measurementSlot,
      stitchingDate
    } = req.body;

    console.log('🔄 Create order item request received for order:', orderId);

    // Validate required fields
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'orderId is required'
      });
    }

    // Note: itemTotal is a computed column (quantity * unitPrice) in the database
    // It will be automatically calculated by SQL Server, so we don't include it in INSERT

    const orderItemData = {
      orderId,
      itemType: itemType || null,
      productCode: productCode || null,
      description: description || null,
      shopId: shopId || null,
      tailorId: tailorId || null,
      quantity: quantity || 1,
      unit: unit || null,
      unitPrice: unitPrice || 0,
      status: status || 'Pending',
      notes: notes || null,
      measurementDate: measurementDate || null,
      measurementSlot: measurementSlot || null,
      stitchingDate: stitchingDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await databaseService.db.InsertOrderItem(orderItemData);

    // Get the created order item
    const orderItems = await databaseService.db.GetOrderItemsByOrderId(orderId);
    const createdItem = orderItems.find(item => item.orderItemId === result.orderItemId);

    return res.status(201).json({
      success: true,
      message: 'Order item created successfully',
      data: createdItem
    });

  } catch (error) {
    console.error('❌ Error creating order item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get order items by order ID
router.get('/orders/:orderId/items', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('🔄 Get order items request received for order:', orderId);

    const orderItems = await databaseService.db.GetOrderItemsByOrderId(orderId);

    return res.status(200).json({
      success: true,
      message: 'Order items retrieved successfully',
      count: orderItems.length,
      data: orderItems
    });

  } catch (error) {
    console.error('❌ Error getting order items:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get order items',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update order item
router.put('/orders/:orderId/items/:orderItemId', authenticateToken, async (req, res) => {
  try {
    const { orderId, orderItemId } = req.params;
    const {
      itemType,
      productCode,
      description,
      shopId,
      tailorId,
      quantity,
      unit,
      unitPrice,
      status,
      notes,
      measurementDate,
      measurementSlot,
      stitchingDate
    } = req.body;

    console.log('🔄 Update order item request received:', orderItemId);

    // Build update object - only include fields that are provided
    // Note: itemTotal is a computed column (quantity * unitPrice) in the database
    // It will be automatically recalculated when quantity or unitPrice changes
    const updateData = {};
    if (itemType !== undefined) updateData.itemType = itemType;
    if (productCode !== undefined) updateData.productCode = productCode;
    if (description !== undefined) updateData.description = description;
    if (shopId !== undefined) updateData.shopId = shopId;
    if (tailorId !== undefined) updateData.tailorId = tailorId;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (unit !== undefined) updateData.unit = unit;
    if (unitPrice !== undefined) updateData.unitPrice = unitPrice;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (measurementDate !== undefined) updateData.measurementDate = measurementDate;
    if (measurementSlot !== undefined) updateData.measurementSlot = measurementSlot;
    if (stitchingDate !== undefined) updateData.stitchingDate = stitchingDate;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided to update'
      });
    }

    const result = await databaseService.db.UpdateOrderItem(orderItemId, updateData);

    if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
      // Get updated order item
      const orderItems = await databaseService.db.GetOrderItemsByOrderId(orderId);
      const updatedItem = orderItems.find(item => item.orderItemId === parseInt(orderItemId));

      return res.status(200).json({
        success: true,
        message: 'Order item updated successfully',
        data: updatedItem
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Order item not found'
      });
    }

  } catch (error) {
    console.error('❌ Error updating order item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete order item
router.delete('/orders/:orderId/items/:orderItemId', authenticateToken, async (req, res) => {
  try {
    const { orderItemId } = req.params;
    console.log('🔄 Delete order item request received:', orderItemId);

    const result = await databaseService.db.DeleteOrderItem(orderItemId);

    if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: 'Order item deleted successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Order item not found'
      });
    }

  } catch (error) {
    console.error('❌ Error deleting order item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete order item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== DeliveryAddress Routes ====================

// Get existing delivery addresses for a user
router.get('/delivery-addresses/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔄 Get delivery addresses by user ID request received:', userId);

    const addresses = await databaseService.db.GetDeliveryAddressesByUserId(userId);

    return res.status(200).json({
      success: true,
      message: 'Delivery addresses retrieved successfully',
      count: addresses.length,
      data: addresses
    });

  } catch (error) {
    console.error('❌ Error getting delivery addresses:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get delivery addresses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get delivery address by order ID
router.get('/orders/:orderId/delivery-address', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('🔄 Get delivery address by order ID request received:', orderId);

    const deliveryAddress = await databaseService.db.GetDeliveryAddressByOrderId(orderId);

    if (!deliveryAddress) {
      return res.status(404).json({
        success: false,
        message: 'Delivery address not found for this order'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Delivery address retrieved successfully',
      data: deliveryAddress
    });

  } catch (error) {
    console.error('❌ Error getting delivery address:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get delivery address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create delivery address for an order
router.post('/orders/:orderId/delivery-address', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      userId,
      fullName,
      phoneNumber,
      alternatePhone,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      addressType,
      deliveryInstructions,
      googleMapLink
    } = req.body;

    console.log('🔄 Create delivery address request received for order:', orderId);

    // Validate required fields
    if (!fullName || !phoneNumber || !addressLine1 || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: fullName, phoneNumber, addressLine1, city, state, pincode'
      });
    }

    const addressData = {
      orderId,
      userId: userId || req.user.userId || null,
      fullName,
      phoneNumber,
      alternatePhone: alternatePhone || null,
      addressLine1,
      addressLine2: addressLine2 || null,
      landmark: landmark || null,
      city,
      state,
      pincode,
      addressType: addressType || 'Home',
      deliveryInstructions: deliveryInstructions || null,
      googleMapLink: googleMapLink || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await databaseService.db.InsertDeliveryAddress(addressData);
    const deliveryAddress = await databaseService.db.GetDeliveryAddressByOrderId(orderId);

    return res.status(201).json({
      success: true,
      message: 'Delivery address created successfully',
      data: deliveryAddress
    });

  } catch (error) {
    console.error('❌ Error creating delivery address:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create delivery address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update delivery address
router.put('/delivery-addresses/:deliveryAddressId', authenticateToken, async (req, res) => {
  try {
    const { deliveryAddressId } = req.params;
    const {
      fullName,
      phoneNumber,
      alternatePhone,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      addressType,
      deliveryInstructions,
      googleMapLink
    } = req.body;

    console.log('🔄 Update delivery address request received:', deliveryAddressId);

    // Build update object - only include fields that are provided
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (alternatePhone !== undefined) updateData.alternatePhone = alternatePhone;
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2;
    if (landmark !== undefined) updateData.landmark = landmark;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (addressType !== undefined) updateData.addressType = addressType;
    if (deliveryInstructions !== undefined) updateData.deliveryInstructions = deliveryInstructions;
    if (googleMapLink !== undefined) updateData.googleMapLink = googleMapLink;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided to update'
      });
    }

    const result = await databaseService.db.UpdateDeliveryAddress(deliveryAddressId, updateData);

    if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
      // Get the delivery address to find orderId
      const addresses = await databaseService.db.GetDeliveryAddressesByUserId(req.user.userId);
      const updatedAddress = addresses.find(addr => addr.deliveryAddressId === parseInt(deliveryAddressId));
      
      if (updatedAddress) {
        const finalAddress = await databaseService.db.GetDeliveryAddressByOrderId(updatedAddress.orderId);
        return res.status(200).json({
          success: true,
          message: 'Delivery address updated successfully',
          data: finalAddress
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Delivery address updated successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Delivery address not found'
      });
    }

  } catch (error) {
    console.error('❌ Error updating delivery address:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update delivery address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete delivery address
router.delete('/delivery-addresses/:deliveryAddressId', authenticateToken, async (req, res) => {
  try {
    const { deliveryAddressId } = req.params;
    console.log('🔄 Delete delivery address request received:', deliveryAddressId);

    const result = await databaseService.db.DeleteDeliveryAddress(deliveryAddressId);

    if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: 'Delivery address deleted successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Delivery address not found'
      });
    }

  } catch (error) {
    console.error('❌ Error deleting delivery address:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete delivery address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

