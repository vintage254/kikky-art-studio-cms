import type { CollectionConfig } from 'payload/types'

import { admins } from '../../access/admins'
import { adminsOrLoggedIn } from '../../access/adminsOrLoggedIn'
import { adminsOrOrderedBy } from './access/adminsOrOrderedBy'
import { clearUserCart } from './hooks/clearUserCart'
import { populateOrderedBy } from './hooks/populateOrderedBy'
import { updateUserPurchases } from './hooks/updateUserPurchases'
import { LinkToPaymentIntent } from './ui/LinkToPaymentIntent'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'createdAt',
    defaultColumns: ['createdAt', 'orderedBy', 'paymentMethod', 'paymentStatus'],
    preview: doc => `${process.env.PAYLOAD_PUBLIC_SERVER_URL}/orders/${doc.id}`,
  },
  hooks: {
    afterChange: [updateUserPurchases, clearUserCart],
  },
  access: {
    read: adminsOrOrderedBy,
    update: admins,
    create: adminsOrLoggedIn,
    delete: admins,
  },
  fields: [
    {
      name: 'orderedBy',
      type: 'relationship',
      relationTo: 'users',
      hooks: {
        beforeChange: [populateOrderedBy],
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      defaultValue: 'stripe',
      options: [
        {
          label: 'Stripe (Card)',
          value: 'stripe',
        },
        {
          label: 'M-Pesa',
          value: 'mpesa',
        },
        {
          label: 'Cash on Delivery',
          value: 'cash_on_delivery',
        },
      ],
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        {
          label: 'Pending',
          value: 'pending',
        },
        {
          label: 'Paid',
          value: 'paid',
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
      name: 'stripePaymentIntentID',
      label: 'Stripe Payment Intent ID',
      type: 'text',
      admin: {
        position: 'sidebar',
        condition: (data) => data.paymentMethod === 'stripe',
        components: {
          Field: LinkToPaymentIntent,
        },
      },
    },
    {
      name: 'mpesaRequestID',
      label: 'M-Pesa Request ID',
      type: 'text',
      admin: {
        position: 'sidebar',
        condition: (data) => data.paymentMethod === 'mpesa',
      },
    },
    {
      name: 'mpesaCheckoutRequestID',
      label: 'M-Pesa Checkout Request ID',
      type: 'text',
      admin: {
        position: 'sidebar',
        condition: (data) => data.paymentMethod === 'mpesa',
      },
    },
    {
      name: 'mpesaReceiptNumber',
      label: 'M-Pesa Receipt Number',
      type: 'text',
      admin: {
        position: 'sidebar',
        condition: (data) => data.paymentMethod === 'mpesa',
      },
    },
    {
      name: 'mpesaTransactionDate',
      label: 'M-Pesa Transaction Date',
      type: 'text',
      admin: {
        position: 'sidebar',
        condition: (data) => data.paymentMethod === 'mpesa',
      },
    },
    {
      name: 'mpesaPhoneNumber',
      label: 'M-Pesa Phone Number',
      type: 'text',
      admin: {
        position: 'sidebar',
        condition: (data) => data.paymentMethod === 'mpesa',
      },
    },
    {
      name: 'mpesaResultDesc',
      label: 'M-Pesa Result Description',
      type: 'text',
      admin: {
        position: 'sidebar',
        condition: (data) => data.paymentMethod === 'mpesa' && data.paymentStatus === 'failed',
      },
    },
    {
      name: 'deliveryNotes',
      label: 'Delivery Notes',
      type: 'textarea',
      admin: {
        position: 'sidebar',
        condition: (data) => data.paymentMethod === 'cash_on_delivery',
      },
    },
    {
      name: 'total',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'price',
          type: 'number',
          min: 0,
        },
        {
          name: 'quantity',
          type: 'number',
          min: 0,
        },
      ],
    },
  ],
}
