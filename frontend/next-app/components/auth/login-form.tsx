'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { authenticate } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function LoginForm() {
    const [errorMessage, dispatch] = useFormState(authenticate, undefined);

    return (
        <div className="flex justify-center items-center min-h-screen bg-slate-50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">HR-IMS Login</CardTitle>
                    <CardDescription className="text-center">
                        Enter your credentials to access the system
                    </CardDescription>
                </CardHeader>
                <form action={dispatch}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                placeholder="admin@example.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                required
                                minLength={6}
                            />
                        </div>
                        {errorMessage && (
                            <div
                                className="flex items-center space-x-2 text-sm text-red-500 bg-red-50 p-3 rounded-md"
                                aria-live="polite"
                            >
                                <AlertCircle className="h-4 w-4" />
                                <p>{errorMessage}</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <LoginButton />
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <Button className="w-full" aria-disabled={pending} disabled={pending}>
            {pending ? 'Logging in...' : 'Sign in'}
        </Button>
    );
}
