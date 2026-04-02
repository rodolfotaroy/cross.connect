import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produce a self-contained Node.js server in .next/standalone/.
  // Required for the Docker multi-stage build runner stage.
  // On Windows dev machines, symlink creation requires Developer Mode, so we
  // only enable standalone output in CI / Docker (set STANDALONE_BUILD=1).
  ...(process.env.STANDALONE_BUILD === '1' && { output: 'standalone' }),

  // Transpile monorepo workspace packages
  transpilePackages: ['@xc/types'],

  // Strict mode for catching potential issues early
  reactStrictMode: true,

  webpack(config, { dev }) {
    if (dev) {
      // Suppress Watchpack "EINVAL: invalid argument, lstat" errors caused by
      // locked Windows system files at the root of C:\
      config.watchOptions = {
        ...config.watchOptions,
        ignored:
          /[/\\](\.(git|next)|node_modules)[/\\]|(DumpStack\.log\.tmp|hiberfil\.sys|pagefile\.sys|swapfile\.sys)$/i,
      };
    }
    return config;
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
