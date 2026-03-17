import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        user: {
            roles?: string[];
            permissions?: string[];
            mustChangePassword?: boolean;
        } & DefaultSession["user"];
    }

    interface User {
        roles?: string[];
        permissions?: string[];
        accessToken?: string;
        mustChangePassword?: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        roles?: string[];
        permissions?: string[];
        mustChangePassword?: boolean;
    }
}
