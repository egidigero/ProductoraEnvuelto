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
  // Don't fail build on prerender errors
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

export default nextConfig
