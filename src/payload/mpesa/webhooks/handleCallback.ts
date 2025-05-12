import { PayloadHandler } from 'payload/config';
import { PaymentBase, MpesaPaymentFields, PaymentRecord } from '../../types/mpesa';
import { Config } from 'payload/config';

/**
 * This webhook handler processes callbacks from the M-Pesa API
 * after an STK Push transaction is completed.
 * 
 * It updates the order status based on the transaction result.
 */
export const handleMpesaCallback: PayloadHandler = async (req, res): Promise<void> => {
  const { payload } = req;
  
  try {
    // Extract the callback data from the request body
    const callbackData = req.body;
    
    // Log the callback for debugging
    payload.logger.info('Received M-Pesa callback:', callbackData);
    
    // Extract the Body section which contains the actual transaction details
    const { Body } = callbackData;
    
    if (!Body || !Body.stkCallback) {
      throw new Error('Invalid callback format');
    }
    
    const { ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;
    const isSuccessful = ResultCode === 0;
    
    // If transaction was successful, extract transaction details
    if (isSuccessful && CallbackMetadata && CallbackMetadata.Item) {
      // Extract transaction details from the callback metadata
      const metadata = CallbackMetadata.Item.reduce((acc, item) => {
        if (item.Name && item.Value !== undefined) {
          acc[item.Name] = item.Value;
        }
        return acc;
      }, {});
      
      const { MpesaReceiptNumber, TransactionDate, PhoneNumber } = metadata;
      const merchantRequestID = Body.stkCallback.MerchantRequestID;
      
      // Look up the order using the merchantRequestID stored in mpesaRequestID
      const orders = await payload.find({
        collection: 'orders',
        where: {
          mpesaRequestID: {
            equals: merchantRequestID,
          },
        },
      });
      
      if (orders.docs.length === 0) {
        throw new Error(`No order found with mpesaRequestID: ${merchantRequestID}`);
      }
      
      const order = orders.docs[0];
      
      // Update the order with the payment details - using underscore prefix for field names
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: {
          _mpesaReceiptNumber: MpesaReceiptNumber,
          _mpesaTransactionDate: TransactionDate,
          _mpesaPhoneNumber: PhoneNumber,
          _paymentStatus: 'paid',
        } as any,
      });
      
      // Check if the payments collection exists in the Payload config
      const hasPaymentsCollection = (payload.config as Config).collections.some(
        collection => collection.slug === 'payments'
      );
      
      // Store the transaction in a dedicated payments collection if it exists
      if (hasPaymentsCollection) {
        // Create the payment data
        const paymentData: Partial<PaymentBase & MpesaPaymentFields> = {
          type: 'mpesa',
          amount: order.total,
          status: 'paid',
          mpesaReceiptNumber: MpesaReceiptNumber,
          mpesaTransactionDate: TransactionDate,
          mpesaPhoneNumber: PhoneNumber,
          order: order.id,
        };
        
        // Use 'as any' to bypass strict type checking since we know 'payments' is a valid collection
        await payload.create({
          collection: 'payments' as any,
          data: paymentData,
        });
      }
      
      payload.logger.info(`Successfully processed M-Pesa payment for order ${order.id}`);
    } else {
      // If transaction failed, log the error
      payload.logger.error(`M-Pesa transaction failed: ${ResultDesc}`);
      
      const merchantRequestID = Body.stkCallback.MerchantRequestID;
      
      // Look up the order using the merchantRequestID
      const orders = await payload.find({
        collection: 'orders',
        where: {
          mpesaRequestID: {
            equals: merchantRequestID,
          },
        },
      });
      
      if (orders.docs.length > 0) {
        const order = orders.docs[0];
        
        // Update the order with the failed status - using underscore prefix for field names
        await payload.update({
          collection: 'orders',
          id: order.id,
          data: {
            _paymentStatus: 'failed',
            _mpesaResultDesc: ResultDesc,
          } as any,
        });
        
        payload.logger.info(`Updated order ${order.id} with failed payment status`);
      }
    }
    
    // Send acknowledgment response to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    payload.logger.error(`Error processing M-Pesa callback: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
}; 