
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false, // Enable PWA in development for testing
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    ASAAS_API_KEY: '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmY4MTQzY2Q3LTExNDgtNGIwYi1iOTA5LTgzZmZhZDZlM2FkZjo6JGFhY2hfOWU3Y2E4NzktNmJlMS00YjgwLTgwYmEtNmM4NDYyMTkyMmMw',
    ASAAS_BASE_URL: 'https://api-sandbox.asaas.com/v3',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default withPWA(nextConfig);
