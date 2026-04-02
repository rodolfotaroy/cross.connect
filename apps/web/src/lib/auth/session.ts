import { LoginSchema } from '@xc/types/api';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

// In Docker, next-auth callbacks run inside the web container where
// localhost:3100 is unreachable. API_INTERNAL_URL resolves to the api
// container via Docker's internal network (http://api:3001).
// In local dev, API_INTERNAL_URL is unset and NEXT_PUBLIC_API_URL is used.
const API_URL =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100';

// Attempt to refresh the NestJS access token using the stored refresh token.
// Returns the new token pair on success, or null if the refresh token is expired/invalid.
async function refreshAccessToken(refreshToken: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { accessToken: data.accessToken as string, refreshToken: data.refreshToken as string };
  } catch {
    return null;
  }
}

// Decode the expiry from a JWT without verifying the signature.
function jwtExpiry(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return (payload.exp ?? 0) * 1000; // convert to ms
  } catch {
    return 0;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const res = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed.data),
          });

          if (!res.ok) return null;

          const data = await res.json();
          return {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
            orgId: data.user.orgId,
            orgName: data.user.orgName,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, store both tokens and the access token expiry
      if (user) {
        token.role = (user as any).role;
        token.orgId = (user as any).orgId;
        token.orgName = (user as any).orgName;
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
        token.accessTokenExpiry = jwtExpiry((user as any).accessToken);
        return token;
      }

      // Access token still valid — nothing to do
      const expiry = (token.accessTokenExpiry as number) ?? 0;
      if (Date.now() < expiry - 60_000) return token; // 60s buffer

      // Access token expired — try to refresh
      const refreshed = await refreshAccessToken(token.refreshToken as string);
      if (!refreshed) {
        // Refresh token also expired: force re-login by clearing the token
        return { ...token, accessToken: null, error: 'RefreshTokenExpired' };
      }

      return {
        ...token,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        accessTokenExpiry: jwtExpiry(refreshed.accessToken),
        error: undefined,
      };
    },
    session({ session, token }) {
      (session.user as any).role = token.role;
      (session.user as any).orgId = token.orgId;
      (session.user as any).orgName = token.orgName;
      (session.user as any).accessToken = token.accessToken;
      (session as any).error = token.error;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: false,
});
