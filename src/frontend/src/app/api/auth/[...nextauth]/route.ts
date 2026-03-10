import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const authOptions: NextAuthOptions = {
    providers: [
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID || "",
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "local_dev_secret",
            tenantId: process.env.AZURE_AD_TENANT_ID || "common",
        }),
    ],
    callbacks: {
        async jwt({ token, account, user }) {
            if (account) {
                token.accessToken = account.access_token;
                // Map Entra ID Roles if available
                token.roles = user?.role ? [user.role] : ["Viewer"]; // Default safe fallback
            }
            return token;
        },
        async session({ session, token }) {
            // Pass the access token to the client so the API Client can use it
            session.accessToken = token.accessToken as string;
            session.user.roles = token.roles as string[];
            return session;
        },
    },
    session: {
        strategy: "jwt",
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
