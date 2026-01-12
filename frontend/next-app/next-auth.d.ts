import NextAuth, { DefaultSession } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"
import { Role } from "@prisma/client"

declare module "next-auth" {
    interface User {
        id?: string
        role?: Role
    }

    interface Session {
        user: {
            id: string
            role: Role
        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id: string
        role: Role
    }
}
