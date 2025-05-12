# Payload CMS Production Deployment for Render

This directory contains the production-ready Payload CMS configuration for deployment to Render.

## Purpose

This is a standalone deployment package for Payload CMS that:
- Is configured specifically for Render hosting
- Has its own dependencies and configuration
- Contains health check endpoints for Render's monitoring
- Includes optimizations for database connections

## Deployment

This directory is deployed to Render as a standalone service, separate from the Next.js frontend which is deployed to Vercel.

## Key Files

- `payload.config.ts` - The main configuration file for Payload CMS
- `src/server.ts` - The Express server that hosts Payload CMS
- `Dockerfile` - Container configuration for Render

## Making Changes

When making changes to Payload CMS:
1. Make and test changes in the main project's `src/payload` directory for local development
2. After testing, copy the relevant changes to the corresponding files in this directory
3. Push changes to deploy to production via Render

## Health Check

The deployment includes a health check endpoint at `/health` that returns a 200 OK response when the service is functioning correctly. Render uses this to monitor the health of the service. 