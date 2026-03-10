import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        user: {
            roles?: string[];
        } & DefaultSession["user"];
    }

    interface User {
        role?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        roles?: string[];
    }
}
