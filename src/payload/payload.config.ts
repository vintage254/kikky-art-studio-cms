import { webpackBundler } from '@payloadcms/bundler-webpack' // bundler-import
import { mongooseAdapter } from '@payloadcms/db-mongodb' // database-adapter-import
import { payloadCloud } from '@payloadcms/plugin-cloud'
// import formBuilder from '@payloadcms/plugin-form-builder'
import nestedDocs from '@payloadcms/plugin-nested-docs'
import redirects from '@payloadcms/plugin-redirects'
import seo from '@payloadcms/plugin-seo'
import type { GenerateTitle } from '@payloadcms/plugin-seo/types'
import stripePlugin from '@payloadcms/plugin-stripe'
import { slateEditor } from '@payloadcms/richtext-slate' // editor-import
import dotenv from 'dotenv'
import path from 'path'
import { buildConfig } from 'payload/config'
import { mongooseAdapter as newMongooseAdapter } from 'payload/dist/database/adapters/mongoose'
import { Express } from 'express'

import Categories from './collections/Categories'
import { Media } from './collections/Media'
import { Orders } from './collections/Orders'
import { Pages } from './collections/Pages'
import Products from './collections/Products'
import Users from './collections/Users'
import { Payments } from './collections/Payments'
import BeforeDashboard from './components/BeforeDashboard'
import BeforeLogin from './components/BeforeLogin'
import { Logo, Icon } from './components/CustomLogo'
import { createPaymentIntent } from './endpoints/create-payment-intent'
import { customersProxy } from './endpoints/customers'
import { productsProxy } from './endpoints/products'
import { seed } from './endpoints/seed'
import { initiateMpesa } from './endpoints/initiate-mpesa'
import { Footer } from './globals/Footer'
import { Header } from './globals/Header'
import { Settings } from './globals/Settings'
import { priceUpdated } from './stripe/webhooks/priceUpdated'
import { productUpdated } from './stripe/webhooks/productUpdated'
import { handleMpesaCallback } from './mpesa/webhooks/handleCallback'

const generateTitle: GenerateTitle = () => {
  return 'My Store'
}

const mockModulePath = path.resolve(__dirname, './emptyModuleMock.js')

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
})

export default buildConfig({
  admin: {
    user: Users.slug,
    bundler: webpackBundler(), // bundler-config
    meta: {
      favicon: '/logo-kikky-4.png',
      titleSuffix: '- Kikky Art Studio'
    },
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeLogin` statement on line 15.
      beforeLogin: [BeforeLogin],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeDashboard` statement on line 15.
      beforeDashboard: [BeforeDashboard],
      graphics: {
        Logo,
        Icon,
      },
    },
    webpack: config => {
      return {
        ...config,
        resolve: {
          ...config.resolve,
          alias: {
            ...config.resolve?.alias,
            dotenv: path.resolve(__dirname, './dotenv.js'),
            [path.resolve(__dirname, 'collections/Products/hooks/beforeChange')]: mockModulePath,
            [path.resolve(__dirname, 'collections/Users/hooks/createStripeCustomer')]:
              mockModulePath,
            [path.resolve(__dirname, 'collections/Users/endpoints/customer')]: mockModulePath,
            [path.resolve(__dirname, 'endpoints/create-payment-intent')]: mockModulePath,
            [path.resolve(__dirname, 'endpoints/customers')]: mockModulePath,
            [path.resolve(__dirname, 'endpoints/products')]: mockModulePath,
            [path.resolve(__dirname, 'endpoints/seed')]: mockModulePath,
            stripe: mockModulePath,
            express: mockModulePath,
          },
        },
      }
    },
  },
  editor: slateEditor({}), // editor-config
  // database-adapter-config-start
  db: process.env.NEXT_PUBLIC_SKIP_DB_CONNECTION === 'true'
    ? // Use a minimal mock adapter during Vercel builds to avoid DB connection
      mongooseAdapter({
        url: 'mongodb://mock:27017/mock',
        connectOptions: {
          // These options prevent actual connection attempts
          serverSelectionTimeoutMS: 100,
          socketTimeoutMS: 100,
        },
      })
    : newMongooseAdapter({
        url: process.env.DATABASE_URI || '',
        connectOptions: {
          // Enable SSL
          ssl: true,
          tls: true,
          
          // Connection resilience
          retryWrites: true,
          retryReads: true,
          w: 'majority',
          
          // Connection pool config
          maxPoolSize: 10,
          minPoolSize: 3,
          maxIdleTimeMS: 30000,
          
          // Timeouts
          socketTimeoutMS: 30000,
          connectTimeoutMS: 30000,
          serverSelectionTimeoutMS: 15000,
        },
  }),
  // database-adapter-config-end
  express: (app: Express) => {
    app.get('/health', (_, res) => {
      res.status(200).send('OK')
    })
  },
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
  collections: [Pages, Products, Orders, Media, Categories, Users, Payments],
  globals: [Settings, Header, Footer],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  cors: [
    'https://checkout.stripe.com',
    process.env.PAYLOAD_PUBLIC_SERVER_URL || '',
    // Allow Safaricom's servers to access the webhook endpoint
    'https://sandbox.safaricom.co.ke',
    'https://api.safaricom.co.ke',
  ].filter(Boolean),
  csrf: [
    'https://checkout.stripe.com',
    process.env.PAYLOAD_PUBLIC_SERVER_URL || '',
    // Allow Safaricom's servers to access the webhook endpoint
    'https://sandbox.safaricom.co.ke',
    'https://api.safaricom.co.ke',
  ].filter(Boolean),
  endpoints: [
    {
      path: '/create-payment-intent',
      method: 'post',
      handler: createPaymentIntent,
    },
    {
      path: '/stripe/customers',
      method: 'get',
      handler: customersProxy,
    },
    {
      path: '/stripe/products',
      method: 'get',
      handler: productsProxy,
    },
    // M-Pesa endpoints
    {
      path: '/checkout/mpesa',
      method: 'post',
      handler: initiateMpesa,
    },
    {
      path: '/webhooks/mpesa',
      method: 'post',
      handler: handleMpesaCallback,
    },
    // The seed endpoint is used to populate the database with some example data
    // You should delete this endpoint before deploying your site to production
    {
      path: '/seed',
      method: 'get',
      handler: seed,
    },
  ],
  plugins: [
    // formBuilder({}),
    stripePlugin({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
      isTestKey: Boolean(process.env.PAYLOAD_PUBLIC_STRIPE_IS_TEST_KEY),
      stripeWebhooksEndpointSecret: process.env.STRIPE_WEBHOOKS_SIGNING_SECRET,
      rest: false,
      webhooks: {
        'product.created': productUpdated,
        'product.updated': productUpdated,
        'price.updated': priceUpdated,
      },
    }),
    redirects({
      collections: ['pages', 'products'],
    }),
    nestedDocs({
      collections: ['categories'],
    }),
    seo({
      collections: ['pages', 'products'],
      generateTitle,
      uploadsCollection: 'media',
    }),
    payloadCloud(),
  ],
})