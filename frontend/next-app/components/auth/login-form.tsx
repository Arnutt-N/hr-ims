'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate } from '@/lib/actions/auth';
import { motion } from 'framer-motion';
import { Shield, Package, User, Lock, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import Link from 'next/link';

const DEMO_ACCOUNTS = [
    { role: 'Superadmin', email: 'superadmin@demo.com', password: 'demo123', color: 'from-purple-600 to-pink-600' },
    { role: 'Admin', email: 'admin@demo.com', password: 'demo123', color: 'from-blue-600 to-cyan-600' },
    { role: 'Approver', email: 'approver@demo.com', password: 'demo123', color: 'from-green-600 to-emerald-600' },
    { role: 'Auditor', email: 'auditor@demo.com', password: 'demo123', color: 'from-orange-600 to-amber-600' },
    { role: 'Technician', email: 'tech@demo.com', password: 'demo123', color: 'from-indigo-600 to-blue-600' },
    { role: 'User', email: 'user@demo.com', password: 'demo123', color: 'from-slate-600 to-gray-600' },
];

export default function LoginForm() {
    const [errorMessage, dispatch] = useActionState(authenticate, undefined);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
        setEmail(demoEmail);
        setPassword(demoPassword);
        // Submit form after state updates
        setTimeout(() => {
            const form = document.querySelector('form') as HTMLFormElement;
            form?.requestSubmit();
        }, 100);
    };

    return (
        <div className="flex h-screen bg-[#0f172a] font-['Noto_Sans_Thai'] relative overflow-hidden items-center justify-center p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#1e1b4b] to-[#172554] opacity-100 z-0 pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 z-0 pointer-events-none mix-blend-overlay"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl max-w-2xl w-full text-center"
            >
                <div className="mx-auto mb-8 bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl w-20 h-20 md:w-24 md:h-24 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-4 ring-white/5">
                    <Package size={48} className="text-white hidden md:block" />
                    <Package size={32} className="text-white md:hidden" />
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">IMS.Pro</h1>
                <p className="text-blue-200 mb-8 font-light text-sm md:text-base">Smart Inventory Management System</p>

                <form action={dispatch} className="space-y-4 text-left">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-blue-100 ml-1" htmlFor="email">Email Address</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300" size={18} />
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                required
                                className="w-full pl-11 pr-4 py-3 md:py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-blue-100 ml-1" htmlFor="password">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300" size={18} />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="••••••••"
                                className="w-full pl-11 pr-12 py-3 md:py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-300 transition-colors cursor-pointer"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Remember Me Checkbox */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <input
                                id="remember"
                                type="checkbox"
                                name="remember"
                                className="peer sr-only"
                            />
                            <div className="w-5 h-5 rounded-md border-2 border-slate-600 bg-slate-900/50 peer-checked:bg-gradient-to-br peer-checked:from-blue-500 peer-checked:to-indigo-600 peer-checked:border-transparent transition-all duration-200 group-hover:border-blue-400">
                            </div>
                            <svg
                                className="absolute top-0.5 left-0.5 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <span className="text-sm text-blue-200 group-hover:text-blue-100 transition-colors">
                            จำฉันไว้ (Remember me)
                        </span>
                    </label>

                    {errorMessage && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center space-x-2 text-sm text-red-200 bg-red-900/30 border border-red-500/30 p-3 rounded-xl"
                            aria-live="polite"
                        >
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <p>{errorMessage}</p>
                        </motion.div>
                    )}

                    <div className="pt-4">
                        <LoginButton />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <Link href="/forgot-password" className="text-blue-300 hover:text-blue-200 transition-colors">
                            Forgot Password?
                        </Link>
                        <Link href="/register" className="text-blue-300 hover:text-blue-200 transition-colors">
                            Create Account
                        </Link>
                    </div>
                </form>

                {/* Demo Access Section */}
                <div className="mt-8 pt-6 border-t border-white/10">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Sparkles size={16} className="text-yellow-400" />
                        <h3 className="text-sm font-semibold text-blue-200">Quick Demo Access</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {DEMO_ACCOUNTS.map((account) => (
                            <button
                                key={account.email}
                                type="button"
                                onClick={() => handleDemoLogin(account.email, account.password)}
                                className={`px-3 py-2 rounded-lg bg-gradient-to-r ${account.color} text-white text-xs font-medium hover:opacity-90 transition-opacity shadow-md cursor-pointer`}
                            >
                                {account.role}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-3">Click any role to auto-login</p>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 text-xs text-slate-400">
                    <p>System Version 4.0.0 (Next.js Edition)</p>
                </div>
            </motion.div>
        </div>
    );
}

function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 md:py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 group disabled:opacity-70 cursor-pointer"
        >
            {pending ? (
                <span>Logging in...</span>
            ) : (
                <>
                    <Shield size={20} className="text-white/90" />
                    <span>Sign In to Dashboard</span>
                </>
            )}
        </button>
    );
}
