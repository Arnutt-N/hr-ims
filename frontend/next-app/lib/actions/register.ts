'use server';

import prisma from '@/lib/prisma';
import { hash } from 'bcrypt';
import { redirect } from 'next/navigation';

export async function registerUser(prevState: any, formData: FormData) {
    try {
        // Check if registration is allowed
        const settings = await prisma.settings.findFirst();

        if (!settings?.allowRegistration) {
            return { error: 'Registration is currently disabled by the administrator.' };
        }

        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        // Validation
        if (!name || !email || !password) {
            return { error: 'All fields are required.' };
        }

        if (password !== confirmPassword) {
            return { error: 'Passwords do not match.' };
        }

        if (password.length < 6) {
            return { error: 'Password must be at least 6 characters.' };
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return { error: 'An account with this email already exists.' };
        }

        // Create user
        const hashedPassword = await hash(password, 10);

        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'user', // Default role
                status: 'active'
            }
        });

        return { success: true };

    } catch (error) {
        console.error('Registration error:', error);
        return { error: 'An error occurred during registration. Please try again.' };
    }
}
