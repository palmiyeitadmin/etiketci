import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { buildApiUrl } from "@/lib/api-base-url";

function getHttpErrorCode(status: number): string {
  return `AUTH_BACKEND_HTTP_${status}`;
}

async function parseJsonBody(response: Response): Promise<any | null> {
  const rawBody = await response.text();
  if (!rawBody) return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Local Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(buildApiUrl("/api/auth/login"), {
            method: "POST",
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
            headers: { "Content-Type": "application/json" },
          });

          const result = await parseJsonBody(res);

          if (res.status === 401) {
            return null;
          }

          if (!res.ok) {
            throw new Error(getHttpErrorCode(res.status));
          }

          if (!result || result.success !== true || !result.data?.user || !result.data?.token) {
            throw new Error("AUTH_BACKEND_INVALID_RESPONSE");
          }

          return {
            id: result.data.user.id,
            name: result.data.user.fullName,
            email: result.data.user.email,
            roles: result.data.user.roles,
            permissions: result.data.user.permissions,
            mustChangePassword: result.data.user.mustChangePassword,
            accessToken: result.data.token,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "";
          if (
            errorMessage === "AUTH_BACKEND_UNREACHABLE" ||
            errorMessage === "AUTH_BACKEND_INVALID_RESPONSE" ||
            errorMessage.startsWith("AUTH_BACKEND_HTTP_")
          ) {
            throw error;
          }

          console.error("Auth error", error);
          throw new Error("AUTH_BACKEND_UNREACHABLE");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = (user as any).roles;
        token.permissions = (user as any).permissions;
        token.mustChangePassword = (user as any).mustChangePassword;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).roles = token.roles;
        (session.user as any).permissions = token.permissions;
        (session.user as any).mustChangePassword = token.mustChangePassword;
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
};
