import { Order, User } from '../payload-types';

// Payment method types
export type PaymentMethod = 'stripe' | 'mpesa' | 'cash_on_delivery';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// M-Pesa specific fields to add to Order
export interface MpesaOrderFields {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  mpesaRequestID?: string;
  mpesaCheckoutRequestID?: string;
  mpesaReceiptNumber?: string;
  mpesaTransactionDate?: string;
  mpesaPhoneNumber?: string;
  mpesaResultDesc?: string;
}

// Extended Order type with M-Pesa fields
export type MpesaOrder = Order & MpesaOrderFields;

// Verify response from Payload's verify method
export interface VerifyResponse {
  user: User;
  token: string;
  exp: number;
}

// Type for M-Pesa STK Push response
export interface MpesaSTKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

// Type for M-Pesa callback data
export interface MpesaCallbackData {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value?: any;
        }>;
      };
    };
  };
}

// Payment collection base fields
export interface PaymentBase {
  id?: string;
  type: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  order: string | Order;
  createdAt?: string;
  updatedAt?: string;
}

// M-Pesa specific payment fields
export interface MpesaPaymentFields {
  mpesaReceiptNumber?: string;
  mpesaTransactionDate?: string;
  mpesaPhoneNumber?: string;
}

// Stripe specific payment fields
export interface StripePaymentFields {
  stripePaymentIntentID?: string;
}

// Complete payment record type
export type PaymentRecord = PaymentBase & MpesaPaymentFields & StripePaymentFields; 