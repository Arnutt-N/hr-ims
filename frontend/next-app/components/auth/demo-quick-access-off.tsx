'use client';

// [2026-11-10] Modified by Cursor: stand-in for the Quick Demo panel when
// NEXT_PUBLIC_DEMO_MODE is not exactly "true". No credential list.

type DemoQuickAccessProps = {
    onLogin: (email: string, password: string) => void;
};

export default function DemoQuickAccess(props: DemoQuickAccessProps) {
    void props;
    return null;
}
