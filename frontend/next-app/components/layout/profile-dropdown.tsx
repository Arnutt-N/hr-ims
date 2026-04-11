'use client';

import { User as UserIcon, ChevronDown, LogOut, Settings as SettingsIcon, UserCircle, Languages, Check } from 'lucide-react';
import Link from 'next/link';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n/provider';
import { SignOutDialog } from './sign-out-dialog';

type ProfileUser = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
};

/**
 * Top-right profile dropdown. Shows only the avatar as the trigger, so the
 * navbar stays compact. The dropdown reveals the user's name, email, and
 * the main account actions. Sign out runs through SignOutDialog so the
 * user gets a confirm step + toast + loading animation.
 */
export function ProfileDropdown({ user }: { user?: ProfileUser | null }) {
    const { t, locale, setLocale } = useI18n();
    const name = user?.name?.trim() || 'Guest User';
    const email = user?.email?.trim() || '—';

    const switchLocale = (next: 'th' | 'en') => {
        if (next === locale) return;
        setLocale(next);
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={name}
                    className="flex items-center gap-1.5 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all cursor-pointer group"
                >
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden">
                        {user?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={user.image}
                                alt={name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <UserIcon size={18} className="text-indigo-500" />
                        )}
                    </div>
                    <ChevronDown
                        size={14}
                        className="text-white/80 mr-1 group-data-[state=open]:rotate-180 transition-transform"
                    />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={8} className="w-60">
                <DropdownMenuLabel className="px-3 py-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-[2px] shrink-0">
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                {user?.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={user.image} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon size={18} className="text-indigo-500" />
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-slate-900 truncate">{name}</span>
                            <span className="text-xs text-slate-500 truncate">{email}</span>
                        </div>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                        <UserCircle size={16} className="mr-2 text-slate-500" />
                        <span>{t('profile.menu.my-profile')}</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/settings/system" className="cursor-pointer">
                        <SettingsIcon size={16} className="mr-2 text-slate-500" />
                        <span>{t('profile.menu.settings')}</span>
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Language picker — primarily for mobile where the top-bar
                    segmented control is hidden. Two rows: TH + EN. Active
                    row shows a check icon. */}
                <div className="sm:hidden">
                    <DropdownMenuItem
                        onSelect={(event) => {
                            event.preventDefault();
                            switchLocale('th');
                        }}
                        className="cursor-pointer"
                    >
                        <Languages size={16} className="mr-2 text-slate-500" />
                        <span className="flex-1">ภาษาไทย</span>
                        {locale === 'th' && <Check size={14} className="text-indigo-600" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={(event) => {
                            event.preventDefault();
                            switchLocale('en');
                        }}
                        className="cursor-pointer"
                    >
                        <Languages size={16} className="mr-2 text-slate-500" />
                        <span className="flex-1">English</span>
                        {locale === 'en' && <Check size={14} className="text-indigo-600" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                </div>

                {/* Sign out sits inside SignOutDialog so clicking opens the confirm flow */}
                <SignOutDialog>
                    <DropdownMenuItem
                        onSelect={(event) => event.preventDefault()}
                        className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                    >
                        <LogOut size={16} className="mr-2" />
                        <span>{t('profile.menu.sign-out')}</span>
                    </DropdownMenuItem>
                </SignOutDialog>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
