import { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: string // Deprecated but kept
            roles: string[] // New!
            permissions: string[]
            tokenVersion: number
        } & DefaultSession["user"]
    }

    interface User extends DefaultUser {
        id: string
        role: string
        roles?: string[]
        permissions?: string[]
        tokenVersion?: number
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string
        role?: string
        roles?: string[] // New!
        permissions?: string[]
        tokenVersion?: number
    }
}
