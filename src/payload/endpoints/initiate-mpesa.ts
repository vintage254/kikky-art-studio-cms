import { PayloadHandler } from 'payload/config';
import { initiateSTKPush } from '../mpesa';

// This endpoint initiates an M-Pesa STK Push to the user's phone
// It takes the phone number and amount as input
// It creates a pending order and initiates the payment
export const initiateMpesa: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req;

  if (!user) {
    res.status(401).send('Unauthorized');
    return;
  }

  const { phoneNumber, items } = req.body;

  if (!phoneNumber) {
    res.status(400).json({ error: 'Phone number is required' });
    return;
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Cart items are required' });
    return;
  }

  try {
    const fullUser = await payload.findByID({
      collection: 'users',
      id: user?.id,
    });

    if (!fullUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Calculate total from items
    let total = 0;
    const orderItems = await Promise.all(
      items.map(async (item) => {
        const { product: productId, quantity } = item;
        
        if (!quantity) {
          return null;
        }

        const product = await payload.findByID({
          collection: 'products',
          id: productId,
        });

        if (!product) {
          throw new Error(`Product not found: ${productId}`);
        }

        // Extract price from product
        // In Stripe integration, the price is stored in priceJSON field as parsed JSON
        let price = 0;
        try {
          // Try to parse the priceJSON if it exists
          if (product.priceJSON) {
            const priceData = JSON.parse(product.priceJSON as string);
            // Get unit_amount from the parsed price data
            price = priceData.unit_amount / 100; // Convert from cents to currency units
          }
        } catch (error) {
          payload.logger.error(`Error parsing price for product ${productId}: ${error}`);
          price = 0;
        }

        total += price * Number(quantity);

        return {
          product: productId,
          price: Number(price),
          quantity: Number(quantity),
        };
      })
    );

    // Filter out null items
    const validOrderItems = orderItems.filter(Boolean);

    if (validOrderItems.length === 0) {
      throw new Error('No valid items in cart');
    }

    // Create order data with TypeScript compatible structure
    const orderData = {
      orderedBy: user.id,
      total,
      items: validOrderItems as any, // Cast to any to bypass TypeScript checks
    };

    // Add M-Pesa specific fields that will be applied by Payload
    (orderData as any).paymentMethod = 'mpesa';
    (orderData as any).paymentStatus = 'pending';

    // Create a pending order first
    const order = await payload.create({
      collection: 'orders',
      data: orderData,
    });

    // Initiate STK Push
    const stkPushResult = await initiateSTKPush({
      phoneNumber,
      amount: total,
      accountReference: `Order #${order.id}`,
      transactionDesc: 'Payment for online purchase',
    });

    if (!stkPushResult.success) {
      // If STK Push failed, update the order status
      // Use any type to bypass TypeScript checks
      const updateData = {} as any;
      updateData.paymentStatus = 'failed';
      updateData.mpesaResultDesc = JSON.stringify(stkPushResult.error);

      await payload.update({
        collection: 'orders',
        id: order.id,
        data: updateData,
      });

      res.status(400).json({ error: 'Failed to initiate M-Pesa payment', details: stkPushResult.error });
      return;
    }

    // Update the order with M-Pesa request details
    // Use any type to bypass TypeScript checks
    const updateData = {} as any;
    updateData.mpesaRequestID = stkPushResult.data.MerchantRequestID;
    updateData.mpesaCheckoutRequestID = stkPushResult.data.CheckoutRequestID;

    await payload.update({
      collection: 'orders',
      id: order.id,
      data: updateData,
    });

    res.json({
      success: true,
      message: 'M-Pesa payment initiated. Please check your phone to complete the payment.',
      orderId: order.id,
      requestId: stkPushResult.data.MerchantRequestID,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    payload.logger.error(message);
    res.status(500).json({ error: message });
  }
}; 