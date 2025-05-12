import { CollectionConfig } from 'payload/types';
import { admins } from '../../access/admins';

export const Payments: CollectionConfig = {
  slug: 'payments',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'type', 'amount', 'status', 'createdAt'],
  },
  access: {
    read: admins,
    update: admins,
    create: admins,
    delete: admins,
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        {
          label: 'M-Pesa',
          value: 'mpesa',
        },
        {
          label: 'Stripe',
          value: 'stripe',
        },
        {
          label: 'Cash on Delivery',
          value: 'cash_on_delivery',
        },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Pending',
          value: 'pending',
        },
        {
          label: 'Completed',
          value: 'completed',
        },
        {
          label: 'Failed',
          value: 'failed',
        },
        {
          label: 'Refunded',
          value: 'refunded',
        },
      ],
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
    },
    {
      name: 'stripePaymentIntentID',
      label: 'Stripe Payment Intent ID',
      type: 'text',
      admin: {
        condition: (data) => data.type === 'stripe',
      },
    },
    {
      name: 'mpesaReceiptNumber',
      label: 'M-Pesa Receipt Number',
      type: 'text',
      admin: {
        condition: (data) => data.type === 'mpesa',
      },
    },
    {
      name: 'mpesaTransactionDate',
      label: 'M-Pesa Transaction Date',
      type: 'text',
      admin: {
        condition: (data) => data.type === 'mpesa',
      },
    },
    {
      name: 'mpesaPhoneNumber',
      label: 'M-Pesa Phone Number',
      type: 'text',
      admin: {
        condition: (data) => data.type === 'mpesa',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        readOnly: true,
      },
    },
  ],
  timestamps: true,
}; 