import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: string // Deprecated but kept
            roles: string[] // New!
            permissions: string[]
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        role: string
        tokenVersion?: number
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: string
        roles: string[] // New!
        permissions: string[]
        tokenVersion: number
    }
}
