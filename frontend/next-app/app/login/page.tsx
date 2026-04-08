import LoginForm from '@/components/auth/login-form';
import { auth } from '@/auth';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Login | HR-IMS',
};

export default async function LoginPage() {
    const session = await auth();

    if (session?.user) {
        redirect('/dashboard');
    }

    return <LoginForm />;
}
