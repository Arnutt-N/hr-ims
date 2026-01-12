'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { authenticate } from '@/lib/actions/auth';
import { motion } from 'framer-motion';
import { Shield, Package, User, Lock, AlertCircle } from 'lucide-react';

export default function LoginForm() {
    const [errorMessage, dispatch] = useFormState(authenticate, undefined);

    return (
        <div className="flex h-screen bg-[#0f172a] font-['Noto_Sans_Thai'] relative overflow-hidden items-center justify-center p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#1e1b4b] to-[#172554] opacity-100 z-0 pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 z-0 pointer-events-none mix-blend-overlay"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center"
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
                                type="password"
                                name="password"
                                required
                                minLength={6}
                                placeholder="••••••••"
                                className="w-full pl-11 pr-4 py-3 md:py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

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
                </form>

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
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 md:py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 group disabled:opacity-70"
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
