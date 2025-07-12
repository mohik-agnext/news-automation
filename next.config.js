/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['redis']
  },
  async headers() {
    return [
      {
        source: '/api/sse',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache'
          },
          {
            key: 'Connection',
            value: 'keep-alive'
          },
          {
            key: 'Content-Type',
            value: 'text/event-stream'
          }
        ]
      }
    ]
  }
}

export default nextConfig; 