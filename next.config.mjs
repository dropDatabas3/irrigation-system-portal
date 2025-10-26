import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Only treat as Vercel when running on the Vercel platform, where VERCEL is set to "1".
// This avoids local .env values like VERCEL=true from disabling local tracing root tweaks.
const isVercel = process.env.VERCEL === '1'

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow LAN devices to fetch dev assets in development to avoid warnings
  // Adjust or extend this list to your local network origins as needed
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS
    ? process.env.ALLOWED_DEV_ORIGINS.split(',')
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://192.168.0.0/16',
        'http://192.168.100.21:3000',
      ],
  // In local/dev monorepo we may want to widen the tracing root to one level up.
  // On Vercel, setting this can confuse path resolution and lead to doubled `/vercel/path0/path0`.
  // Only apply it when NOT building on Vercel.
  ...(isVercel ? {} : { outputFileTracingRoot: path.join(__dirname, '..') }),
}

export default nextConfig