import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
  // Silence workspace root inference warning by explicitly setting the tracing root
  // to the monorepo root (one level up where another lockfile exists).
  outputFileTracingRoot: path.join(__dirname, '..'),
}

export default nextConfig