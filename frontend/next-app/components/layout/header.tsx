import { auth } from '@/auth';
import { Search, ChevronDown, User as UserIcon } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { APPROVER_ROLES, sessionHasAnyRole } from '@/lib/auth-guards';
import { HeaderTitle } from './header-title';
import { LocaleToggle } from './locale-toggle';
import { SearchInput } from './header-search';

export async function Header() {
    const session = await auth();
    const user = session?.user;
    const canTriggerLowStockCheck = sessionHasAnyRole(session, ...APPROVER_ROLES);

    return (
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 md:px-8 sticky top-0 z-20 transition-all duration-300">
            {/* Left: Dynamic page title (pathname-driven, locale-aware) */}
            <HeaderTitle />

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-4 ml-auto">
                {/* Search Bar (Hidden on mobile) */}
                <SearchInput />

                {/* Language toggle */}
                <LocaleToggle />

                {/* Notifications */}
                <NotificationBell canTriggerLowStockCheck={canTriggerLowStockCheck} />

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-slate-800 leading-none">{user?.name || 'Guest User'}</p>
                        <p className="text-[10px] uppercase font-bold text-blue-500 mt-1 tracking-wide">{user?.email || 'Guest'}</p>
                    </div>

                    <button className="flex items-center gap-2 group cursor-pointer">
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

