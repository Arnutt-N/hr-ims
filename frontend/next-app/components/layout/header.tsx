import { auth } from '@/auth';
import { Bell, Search, ChevronDown, User as UserIcon } from 'lucide-react';
import Notifications from './Notifications';
import { redirect } from 'next/navigation';
import { formatThaiDate } from '@/lib/date-utils';

export async function Header() {
    const session = await auth();

    // if (!session?.user) {
    //     redirect('/login');
    // }

    const user = session?.user;
    const today = formatThaiDate(new Date());

    return (
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 md:px-8 sticky top-0 z-20 transition-all duration-300">
            {/* Left: Title or Breadcrumbs */}
            <div className="flex flex-col ml-12 md:ml-0">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{today}</p>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-4 ml-auto">
                {/* Search Bar (Hidden on mobile) */}
                <div className="hidden md:flex items-center bg-slate-100/50 rounded-xl px-4 py-2.5 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 transition-all w-64">
                    <Search size={18} className="text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent border-none focus:outline-none text-sm ml-3 w-full text-slate-600 placeholder:text-slate-400"
                    />
                </div>

                {/* Notifications */}
                {/* Notifications */}
                <Notifications />

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-slate-800 leading-none">{user?.name || 'Guest User'}</p>
                        <p className="text-[10px] uppercase font-bold text-blue-500 mt-1 tracking-wide">{user?.email || 'Guest'}</p>
                    </div>

                    <button className="flex items-center gap-2 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 p-[2px] shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 transition-all">
                            <div className="w-full h-full rounded-[10px] bg-white flex items-center justify-center overflow-hidden relative">
                                {user?.image ? (
                                    <img src={user.image} alt={user.name || 'User'} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon size={20} className="text-indigo-500" />
                                )}
                            </div>
                        </div>
                        <ChevronDown size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors md:hidden" />
                    </button>
                </div>
            </div>
        </header>
    );
}
