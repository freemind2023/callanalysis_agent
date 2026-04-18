/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase body size limit for audio uploads (applies to local dev)
  // Vercel Hobby: 4.5 MB limit; Pro/Enterprise: higher. See README for details.
  experimental: {},
}

module.exports = nextConfig
