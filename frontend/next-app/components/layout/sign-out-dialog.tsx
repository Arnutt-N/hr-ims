'use client';

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { LogOut, Loader2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { logout } from '@/lib/actions/auth';
import { useI18n } from '@/lib/i18n/provider';

/**
 * Confirm-before-signout dialog. Wraps any trigger element (sidebar
 * Sign Out button, profile dropdown menu item, etc.) and handles the
 * full flow:
 *
 *   1. User clicks the trigger
 *   2. Shadcn AlertDialog opens with a confirmation prompt
 *   3. User clicks Confirm -> we show a loading state on the button,
 *      pop a Sonner toast, and call the `logout` Server Action which
 *      redirects to /login.
 *   4. User clicks Cancel -> dialog closes, no side effects
 *
 * The dialog itself is built on shadcn AlertDialog (Radix), and we wrap
 * the confirm button in a motion.button so the loading state has a
 * subtle entry animation and the rotating spinner.
 */
export function SignOutDialog({ children }: { children: ReactNode }) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);

    const handleConfirm = async () => {
        setPending(true);
        // Toast immediately so the user gets feedback before navigation.
        toast.success(t('common.loading'), {
            description: t('signout.toast.description'),
            duration: 3_000,
        });

        try {
            await logout();
        } catch (error) {
            // `logout()` throws NEXT_REDIRECT on success — swallow it because
            // Next.js handles the navigation. Real errors re-throw so Sonner
            // can show them.
            if (
                error &&
                typeof error === 'object' &&
                'digest' in error &&
                typeof (error as { digest?: string }).digest === 'string' &&
                (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
            ) {
                return;
            }
            toast.error(t('signout.toast.error'));
            setPending(false);
            setOpen(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <LogOut size={18} className="text-rose-500" />
                        {t('signout.dialog.title')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('signout.dialog.description')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <motion.button
                            type="button"
                            disabled={pending}
                            onClick={(event) => {
                                event.preventDefault();
                                void handleConfirm();
                            }}
                            whileHover={{ scale: pending ? 1 : 1.03 }}
                            whileTap={{ scale: pending ? 1 : 0.97 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-70 disabled:cursor-wait"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                {pending ? (
                                    <motion.span
                                        key="pending"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="flex items-center gap-2"
                                    >
                                        <Loader2 size={16} className="animate-spin" />
                                        {t('common.loading')}
                                    </motion.span>
                                ) : (
                                    <motion.span
                                        key="idle"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="flex items-center gap-2"
                                    >
                                        <LogOut size={16} />
                                        {t('signout.dialog.confirm')}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
