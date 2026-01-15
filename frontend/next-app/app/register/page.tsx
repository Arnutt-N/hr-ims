'use client';

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerUser } from '@/lib/actions/register';
import { motion } from 'framer-motion';
import { Package, User, Mail, Lock, ArrowLeft, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const router = useRouter();
    const [errorMessage, dispatch] = useActionState(registerUser, undefined);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (errorMessage?.success) {
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        }
    }, [errorMessage, router]);

    return (
        <div className="flex h-screen bg-[#0f172a] font-['Noto_Sans_Thai'] relative overflow-hidden items-center justify-center p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#1e1b4b] to-[#172554] opacity-100 z-0 pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 z-0 pointer-events-none mix-blend-overlay"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl max-w-md w-full"
            >
                <div className="mx-auto mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl w-16 h-16 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Package size={32} className="text-white" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2 text-center">Create Account</h1>
                <p className="text-blue-200 mb-6 text-center text-sm">
                    {errorMessage?.success ? "Account created successfully!" : "Join IMS.Pro to manage inventory"}
                </p>

                {errorMessage?.success ? (
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <CheckCircle className="text-green-400" size={48} />
                        </div>
                        <p className="text-blue-200 text-sm">Redirecting to login...</p>
                    </div>
                ) : (
                    <form action={dispatch} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-100 ml-1" htmlFor="name">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300" size={18} />
                                <input
                                    id="name"
                                    type="text"
                                    name="name"
                                    placeholder="John Doe"
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-100 ml-1" htmlFor="email">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300" size={18} />
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="john@example.com"
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-100 ml-1" htmlFor="password">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300" size={18} />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    className="w-full pl-11 pr-12 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-300"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-100 ml-1" htmlFor="confirmPassword">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300" size={18} />
                                <input
                                    id="confirmPassword"
                                    type={showConfirm ? 'text' : 'password'}
                                    name="confirmPassword"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    className="w-full pl-11 pr-12 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-300"
                                >
                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {errorMessage?.error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center space-x-2 text-sm text-red-200 bg-red-900/30 border border-red-500/30 p-3 rounded-xl"
                            >
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <p>{errorMessage.error}</p>
                            </motion.div>
                        )}

                        <div className="pt-4">
                            <RegisterButton />
                        </div>

                        <div className="text-center text-sm">
                            <span className="text-slate-400">Already have an account? </span>
                            <Link href="/login" className="text-blue-300 hover:text-blue-200 transition-colors font-medium">
                                Sign In
                            </Link>
                        </div>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Back to Login
                    </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 text-xs text-slate-400 text-center">
                    <p>System Version 4.0.0 (Next.js Edition)</p>
                </div>
            </motion.div>
        </div>
    );
}

function RegisterButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-70"
        >
            {pending ? 'Creating Account...' : 'Create Account'}
        </button>
    );
}
