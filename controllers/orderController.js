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
      deliveryAddressId,
      deliveryAddressType,
      measurementAddress,
      measurementAddressId,
      measurementAddressType
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
          measurementSlot: (item.measurementSlot && item.measurementSlot.time) ? item.measurementSlot.time : (item.measurementSlot || null),
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

    // Helper function to handle address creation/mapping
    const handleAddress = async (addressId, addressObject, addressType, addressName) => {
      let finalAddressId = null;
      
      if (addressId) {
        // Use existing address - create mapping entry
        console.log(`📋 Using existing ${addressName} address ID:`, addressId);
        finalAddressId = typeof addressId === 'string' ? parseInt(addressId) : addressId;
        
        const mappingData = {
          orderId,
          deliveryAddressId: finalAddressId,
          deliveryAddressType: addressType || null
        };
        
        await databaseService.db.InsertOrderDeliveryAddressMapping(mappingData);
        
      } else if (addressObject) {
        // Create new address (without orderId, as it's now in mapping table)
        console.log(`📋 Creating new ${addressName} address`);
        const addressData = {
          userId: customerId,
          fullName: addressObject.fullName,
          phoneNumber: addressObject.phoneNumber,
          alternatePhone: addressObject.alternatePhone || null,
          addressLine1: addressObject.addressLine1,
          addressLine2: addressObject.addressLine2 || null,
          landmark: addressObject.landmark || null,
          city: addressObject.city,
          state: addressObject.state,
          pincode: addressObject.pincode,
          addressType: addressObject.addressType || 'Home',
          deliveryInstructions: addressObject.deliveryInstructions || null,
          googleMapLink: addressObject.googleMapLink || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Validate required fields
        if (!addressData.fullName || !addressData.phoneNumber || !addressData.addressLine1 || 
            !addressData.city || !addressData.state || !addressData.pincode) {
          throw new Error(`${addressName} address requires: fullName, phoneNumber, addressLine1, city, state, pincode`);
        }

        // Insert address (without orderId)
        const addressResult = await databaseService.db.InsertDeliveryAddress(addressData);
        finalAddressId = addressResult.deliveryAddressId;
        
        // Create mapping entry
        const mappingData = {
          orderId,
          deliveryAddressId: finalAddressId,
          deliveryAddressType: addressType || null
        };
        
        await databaseService.db.InsertOrderDeliveryAddressMapping(mappingData);
      }
      
      return finalAddressId;
    };

    // Handle delivery address
    try {
      await handleAddress(
        deliveryAddressId,
        deliveryAddress,
        deliveryAddressType,
        'delivery'
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Handle measurement address
    try {
      await handleAddress(
        measurementAddressId,
        measurementAddress,
        measurementAddressType,
        'measurement'
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Get all addresses for this order
    const deliveryAddressData = await databaseService.db.GetDeliveryAddressByOrderId(orderId);

    // Get the created order with items
    const createdOrder = await databaseService.db.GetOrderById(orderId);
    const orderItemsList = await databaseService.db.GetOrderItemsByOrderId(orderId);

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: createdOrder,
        orderItems: orderItemsList,
        deliveryAddresses: deliveryAddressData
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
    
    // Get delivery addresses (array)
    const deliveryAddresses = await databaseService.db.GetDeliveryAddressByOrderId(orderId);

    return res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: {
        order,
        orderItems,
        deliveryAddresses
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
        const deliveryAddresses = await databaseService.db.GetDeliveryAddressByOrderId(order.orderId);
        return {
          ...order,
          orderItems,
          deliveryAddresses
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

// Get all delivery addresses for the current logged-in user (customer)
router.get('/my-delivery-addresses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🔄 Get delivery addresses for current user:', userId);

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

// Get existing delivery addresses for a user (by userId parameter)
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

    const deliveryAddresses = await databaseService.db.GetDeliveryAddressByOrderId(orderId);

    if (!deliveryAddresses || deliveryAddresses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Delivery address not found for this order'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Delivery addresses retrieved successfully',
      count: deliveryAddresses.length,
      data: deliveryAddresses
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
      googleMapLink,
      deliveryAddressType
    } = req.body;

    console.log('🔄 Create delivery address request received for order:', orderId);

    // Validate required fields
    if (!fullName || !phoneNumber || !addressLine1 || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: fullName, phoneNumber, addressLine1, city, state, pincode'
      });
    }

    // Create delivery address (without orderId, as it's now in mapping table)
    const addressData = {
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

    // Insert delivery address
    const result = await databaseService.db.InsertDeliveryAddress(addressData);
    const newDeliveryAddressId = result.deliveryAddressId;
    
    // Create mapping entry
    const mappingData = {
      orderId,
      deliveryAddressId: newDeliveryAddressId,
      deliveryAddressType: deliveryAddressType || null
    };
    
    await databaseService.db.InsertOrderDeliveryAddressMapping(mappingData);
    const deliveryAddresses = await databaseService.db.GetDeliveryAddressByOrderId(orderId);

    return res.status(201).json({
      success: true,
      message: 'Delivery address created successfully',
      data: deliveryAddresses
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
      // Get the delivery addresses for the user to find which orders use this address
      const addresses = await databaseService.db.GetDeliveryAddressesByUserId(req.user.userId);
      const updatedAddress = addresses.find(addr => addr.deliveryAddressId === parseInt(deliveryAddressId));
      
      return res.status(200).json({
        success: true,
        message: 'Delivery address updated successfully',
        data: updatedAddress || null
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

// ==================== Orders Per Day Routes ====================

// Get orders based on logged-in user's role (Tailor or Seller)
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.query; // Optional: filter by date
    
    console.log('🔄 Get my orders request received for user:', userId);

    // Get user roles
    const userRoles = await databaseService.db.GetUserRoles(userId);
    
    if (!userRoles || userRoles.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User has no roles assigned'
      });
    }

    // Check if user has Tailor or Seller role
    const roleNames = userRoles.map(role => role.role_name);
    const isTailor = roleNames.includes('Tailor') ;
    const isSeller = roleNames.includes('Seller') ;

    if (!isTailor && !isSeller) {
      return res.status(403).json({
        success: false,
        message: 'User must have Tailor or Seller role to access orders'
      });
    }

    // Get business information for the user
    const business = await databaseService.db.GetBusinessByUserId({ UserId: userId });
    
    if (!business || !business.businessId) {
      return res.status(404).json({
        success: false,
        message: 'Business information not found for this user'
      });
    }

    // Fetch orders based on role
    let ordersData = [];
    if (isTailor) {
      const parameters = {};
      if (date) {
        parameters.date = date;
      }
      ordersData = await databaseService.db.GetOrdersByTailorId(business.businessId, parameters);
    }

    if (isSeller) {
      console.log('📋 Fetching orders for Seller, businessId:', business.businessId);
      const parameters = {};
      if (date) {
        parameters.date = date;
      }
      const sellerOrdersData = await databaseService.db.GetOrdersByShopId(business.businessId, parameters);
      
      // If user is both Tailor and Seller, merge orders (remove duplicates)
      if (isTailor) {
        const orderIds = new Set(ordersData.map(o => o.orderId));
        sellerOrdersData.forEach(order => {
          if (!orderIds.has(order.orderId)) {
            ordersData.push(order);
            orderIds.add(order.orderId);
          }
        });
      } else {
        ordersData = sellerOrdersData;
      }
    }

    // Remove duplicate orders (since query uses DISTINCT)
    const uniqueOrders = [];
    const seenOrderIds = new Set();
    ordersData.forEach(order => {
      if (!seenOrderIds.has(order.orderId)) {
        uniqueOrders.push(order);
        seenOrderIds.add(order.orderId);
      }
    });

    // Get order items and delivery addresses for each order
    const ordersWithDetails = await Promise.all(
      uniqueOrders.map(async (order) => {
        // Get order items for this order
        const allOrderItems = await databaseService.db.GetOrderItemsByOrderId(order.orderId);
        
        // Filter order items based on user's role
        let filteredOrderItems = allOrderItems;

        
        return {
          ...order,
          orderItems: filteredOrderItems
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
      data: {
        userRoles: roleNames,
        businessId: business.businessId,
        businessName: business.businessName || business.BusinessName,
        totalOrders: ordersWithDetails.length,
        orders: ordersWithDetails
      }
    });

  } catch (error) {
    console.error('❌ Error getting my orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get order details for a specific date and business
router.get('/orders-per-day/:businessId/details', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date } = req.query;

    console.log('🔄 Get order details by date request received:', { businessId, date });

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date query parameter is required (format: YYYY-MM-DD)'
      });
    }

    // Get orders for the specific date
    const orders = await databaseService.db.GetOrdersByDateAndBusinessId(businessId, date);

    // Get order items and delivery addresses for each order
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await databaseService.db.GetOrderItemsByOrderId(order.orderId);
        const deliveryAddresses = await databaseService.db.GetDeliveryAddressByOrderId(order.orderId);
        
        return {
          ...order,
          orderItems,
          deliveryAddresses
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Order details retrieved successfully',
      date: date,
      count: ordersWithDetails.length,
      data: ordersWithDetails
    });

  } catch (error) {
    console.error('❌ Error getting order details by date:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get order details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get orders assigned to measurement boy
router.get('/measurement-boy/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { isOrderMeasurementDone } = req.query;
    
    // Convert query parameter to number or null
    let isOrderMeasurementDoneFilter = null;
    if (isOrderMeasurementDone !== undefined && isOrderMeasurementDone !== null) {
      const parsed = parseInt(isOrderMeasurementDone);
      if (!isNaN(parsed)) {
        isOrderMeasurementDoneFilter = parsed;
      }
    }
    
    console.log('🔄 Get measurement boy orders request received for user:', userId, 'filter:', isOrderMeasurementDoneFilter);

    // Optional: Verify user has MeasurementBoy role
    const userRoles = await databaseService.db.GetUserRoles(userId);
    const roleNames = userRoles.map(role => role.role_name);
    const isMeasurementBoy = roleNames.includes('MeasurementBoy');

    if (!isMeasurementBoy) {
      return res.status(403).json({
        success: false,
        message: 'User must have MeasurementBoy role to access this endpoint'
      });
    }

    // Get orders assigned to this measurement boy
    const orders = await databaseService.db.GetOrdersByMeasurementBoyId(userId, isOrderMeasurementDoneFilter);

    // Parse JSON fields and structure the response
    const ordersWithDetails = orders.map((order) => {
      // Parse orderItems JSON string (or use if already parsed)
      let orderItems = [];
      if (order.orderItems) {
        if (typeof order.orderItems === 'string') {
          try {
            orderItems = JSON.parse(order.orderItems);
          } catch (error) {
            console.error('❌ Error parsing orderItems JSON:', error);
            orderItems = [];
          }
        } else if (Array.isArray(order.orderItems)) {
          // Already parsed as array
          orderItems = order.orderItems;
        }
      }

      // Parse measurementAddress JSON string (or use if already parsed)
      let measurementAddress = null;
      if (order.measurementAddress) {
        if (typeof order.measurementAddress === 'string') {
          try {
            measurementAddress = JSON.parse(order.measurementAddress);
          } catch (error) {
            console.error('❌ Error parsing measurementAddress JSON:', error);
            measurementAddress = null;
          }
        } else if (typeof order.measurementAddress === 'object') {
          // Already parsed as object
          measurementAddress = order.measurementAddress;
        }
      }

      // Parse measurements within each order item
      if (Array.isArray(orderItems)) {
        orderItems = orderItems.map(item => {
          if (item.measurements) {
            // Check if measurements is already an object/array (already parsed)
            if (typeof item.measurements === 'string') {
              try {
                item.measurements = JSON.parse(item.measurements);
              } catch (error) {
                console.error('❌ Error parsing measurements JSON:', error);
                item.measurements = [];
              }
            }
            // If it's already an object/array, keep it as is
            // Ensure it's an array
            if (!Array.isArray(item.measurements)) {
              item.measurements = [];
            }
          } else {
            item.measurements = [];
          }
          return item;
        });
      }
      
      return {
        // Order details
        orderId: order.orderId,
        customerId: order.customerId,
        orderDate: order.orderDate,
        orderType: order.orderType,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        advancePaid: order.advancePaid,
        deliveryDate: order.deliveryDate,
        notes: order.notes,
        createdBy: order.createdBy,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        // Measurement boy assignment details
        orderMeasurementBoyAssignmentId: order.orderMeasurementBoyAssignmentId,
        measurementBoyId: order.measurementBoyId,
        assignmentStatus: order.assignmentStatus,
        assignedAt: order.assignedAt,
        startedAt: order.startedAt,
        completedAt: order.completedAt,
        // Order measurement completion status
        isOrderMeasurementDone: order.isOrderMeasurementDone === 1 || order.isOrderMeasurementDone === true,
        // Measurement address (only Measurement type)
        measurementAddress: measurementAddress,
        // Order items with measurements
        orderItems: orderItems
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Measurement boy orders retrieved successfully',
      data: {
        measurementBoyId: userId,
        totalOrders: ordersWithDetails.length,
        orders: ordersWithDetails
      }
    });

  } catch (error) {
    console.error('❌ Error getting measurement boy orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get measurement boy orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Submit measurements for an order item
router.post('/measurement-boy/submit-measurement', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { measurements } = req.body;

    console.log('🔄 Submit measurement request received for user:', userId);
    console.log('📋 Measurements payload:', measurements);

    // Validate required fields
    if (!measurements) {
      return res.status(400).json({
        success: false,
        message: 'Measurements object is required'
      });
    }

    const { orderId, orderItemId, itemType, notes, ...measurementFields } = measurements;

    if (!orderItemId) {
      return res.status(400).json({
        success: false,
        message: 'orderItemId is required in measurements'
      });
    }

    // Optional: Verify user has MeasurementBoy role
    const userRoles = await databaseService.db.GetUserRoles(userId);
    const roleNames = userRoles.map(role => role.role_name);
    const isMeasurementBoy = roleNames.includes('MeasurementBoy');

    if (!isMeasurementBoy) {
      return res.status(403).json({
        success: false,
        message: 'User must have MeasurementBoy role to submit measurements'
      });
    }

    // Validate that measurement fields exist
    const measurementKeys = Object.keys(measurementFields);
    if (measurementKeys.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one measurement field is required (e.g., chest, leg, etc.)'
      });
    }

    // Insert each measurement field as a separate record
    const insertedMeasurements = [];
    const errors = [];

    for (const [measurementKey, measurementValue] of Object.entries(measurementFields)) {
      // Skip empty values
      if (measurementValue === null || measurementValue === undefined || measurementValue === '') {
        continue;
      }

      try {
        const upperCaseKey = measurementKey.toUpperCase();
        const parsedOrderItemId = parseInt(orderItemId);
        
        // Check if measurement already exists for this orderItemId and measurementKey
        const existingMeasurement = await databaseService.db.GetMeasurementByOrderItemIdAndKey(
          parsedOrderItemId,
          upperCaseKey
        );

        if (existingMeasurement) {
          // Update existing measurement
          console.log(`📝 Updating existing measurement: orderItemId=${parsedOrderItemId}, key=${upperCaseKey}`);
          const updateData = {
            measurementValue: String(measurementValue),
            notes: notes || null
          };
          
          await databaseService.db.UpdateMeasurement(existingMeasurement.measurementId, updateData);
          
          insertedMeasurements.push({
            measurementId: existingMeasurement.measurementId,
            measurementKey: upperCaseKey,
            measurementValue: measurementValue,
            action: 'updated'
          });
        } else {
          // Insert new measurement
          console.log(`➕ Inserting new measurement: orderItemId=${parsedOrderItemId}, key=${upperCaseKey}`);
          const measurementData = {
            orderItemId: parsedOrderItemId,
            measurementKey: upperCaseKey,
            measurementValue: String(measurementValue),
            notes: notes || null
          };

          const result = await databaseService.db.InsertMeasurement(measurementData);
          insertedMeasurements.push({
            measurementId: result.measurementId,
            measurementKey: upperCaseKey,
            measurementValue: measurementValue,
            action: 'inserted'
          });
        }
      } catch (error) {
        console.error(`❌ Error processing measurement ${measurementKey}:`, error);
        errors.push({
          measurementKey: measurementKey,
          error: error.message
        });
      }
    }

    if (insertedMeasurements.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid measurements were saved',
        errors: errors
      });
    }

    // Check if all measurements are done for the order and update order items
    let allMeasurementsDone = false;
    if (orderId) {
      try {
        const parsedOrderId = parseInt(orderId);
        if (!isNaN(parsedOrderId)) {
          // Check if all measurements are done for this order
          allMeasurementsDone = await databaseService.db.CheckAllMeasurementsDone(parsedOrderId);
          
          if (allMeasurementsDone) {
            console.log(`✅ All measurements done for order ${parsedOrderId}, updating order items...`);
            // Update all order items' isMeasurementDone to 1
            await databaseService.db.UpdateOrderItemsMeasurementDone(parsedOrderId);
            console.log(`✅ Updated all order items' isMeasurementDone to 1 for order ${parsedOrderId}`);
          }
        }
      } catch (error) {
        console.error('❌ Error checking/updating order items measurement status:', error);
        // Don't fail the request if this check fails, just log it
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Measurements submitted successfully',
      data: {
        orderId: orderId ? parseInt(orderId) : null,
        orderItemId: parseInt(orderItemId),
        itemType: itemType || null,
        totalMeasurements: insertedMeasurements.length,
        measurements: insertedMeasurements,
        allMeasurementsDone: allMeasurementsDone,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('❌ Error submitting measurements:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit measurements',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

