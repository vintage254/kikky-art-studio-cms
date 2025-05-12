import axios from 'axios';
import { MpesaSTKPushResponse } from '../types/mpesa';

// M-Pesa Daraja API constants
export const MPESA_CONSTANTS = {
  ENVIRONMENT: process.env.MPESA_ENVIRONMENT || 'sandbox',
  BASE_URL: process.env.MPESA_ENVIRONMENT === 'production' 
    ? 'https://api.safaricom.co.ke' 
    : 'https://sandbox.safaricom.co.ke',
  SHORTCODE: process.env.MPESA_SHORTCODE,
  PASSKEY: process.env.MPESA_PASSKEY,
  CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY,
  CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET,
};

const MPESA_AUTH_URL = `${MPESA_CONSTANTS.BASE_URL}/oauth/v1/generate?grant_type=client_credentials`;
const MPESA_STK_PUSH_URL = `${MPESA_CONSTANTS.BASE_URL}/mpesa/stkpush/v1/processrequest`;

interface TokenResponse {
  access_token: string;
  expires_in: string;
}

// Helper to get OAuth token
export const getMpesaToken = async (): Promise<string> => {
  try {
    if (!MPESA_CONSTANTS.CONSUMER_KEY || !MPESA_CONSTANTS.CONSUMER_SECRET) {
      throw new Error('Missing M-Pesa credentials');
    }

    // Create auth string (base64 encoded)
    const auth = Buffer.from(`${MPESA_CONSTANTS.CONSUMER_KEY}:${MPESA_CONSTANTS.CONSUMER_SECRET}`).toString('base64');
    
    const response = await axios.get<TokenResponse>(MPESA_AUTH_URL, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting M-Pesa token:', error);
    throw error;
  }
};

// Create timestamp and password for STK Push
export const generateMpesaPassword = (timestamp: string): string => {
  if (!MPESA_CONSTANTS.SHORTCODE || !MPESA_CONSTANTS.PASSKEY) {
    throw new Error('Missing M-Pesa configuration');
  }
  
  return Buffer.from(`${MPESA_CONSTANTS.SHORTCODE}${MPESA_CONSTANTS.PASSKEY}${timestamp}`).toString('base64');
};

// Generate timestamp in format YYYYMMDDHHmmss
export const generateTimestamp = (): string => {
  return new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
};

// Format phone number (remove leading 0 or +254 and add 254)
export const formatPhoneNumber = (phoneNumber: string): string => {
  return phoneNumber.replace(/^(0|\+254)/, '254');
};

interface STKPushParams {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

interface STKPushResult {
  success: boolean;
  data?: MpesaSTKPushResponse;
  error?: any;
}

// Determine the correct callback URL based on environment
const getCallbackURL = () => {
  // For Vercel, use the VERCEL_URL environment variable if available
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/webhooks/mpesa`;
  }
  
  // For local development or if PAYLOAD_PUBLIC_SERVER_URL is set
  if (process.env.PAYLOAD_PUBLIC_SERVER_URL) {
    return `${process.env.PAYLOAD_PUBLIC_SERVER_URL}/api/webhooks/mpesa`;
  }
  
  // Fallback - this should not happen in production
  return 'https://kikky-art-studio.vercel.app/api/webhooks/mpesa';
};

// Initiate STK Push
export const initiateSTKPush = async ({
  phoneNumber,
  amount,
  accountReference,
  transactionDesc,
}: STKPushParams): Promise<STKPushResult> => {
  try {
    const token = await getMpesaToken();
    const timestamp = generateTimestamp();
    const password = generateMpesaPassword(timestamp);
    
    if (!MPESA_CONSTANTS.SHORTCODE) {
      throw new Error('Missing M-Pesa shortcode configuration');
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Get the appropriate callback URL
    const callbackURL = getCallbackURL();
    
    console.log(`Using M-Pesa callback URL: ${callbackURL}`);

    // Create STK Push request
    const response = await axios.post<MpesaSTKPushResponse>(
      MPESA_STK_PUSH_URL,
      {
        BusinessShortCode: MPESA_CONSTANTS.SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: MPESA_CONSTANTS.SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackURL,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error initiating STK Push:', error);
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}; 