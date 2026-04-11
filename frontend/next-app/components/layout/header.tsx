import { auth } from '@/auth';
import { NotificationBell } from './notification-bell';
import { APPROVER_ROLES, sessionHasAnyRole } from '@/lib/auth-guards';
import { HeaderTitle } from './header-title';
import { LocaleToggle } from './locale-toggle';
import { SearchInput } from './header-search';
import { ProfileDropdown } from './profile-dropdown';

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

                {/* Profile dropdown (avatar-only trigger, details revealed in menu) */}
                <div className="pl-2 border-l border-slate-200">
                    <ProfileDropdown user={user ?? null} />
                </div>
            </div>
        </header>
    );
}

