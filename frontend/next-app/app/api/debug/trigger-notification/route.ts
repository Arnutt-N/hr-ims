import { checkLowStock } from '@/lib/actions/notifications';
import { NextResponse } from 'next/server';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }

    try {
        const result = await checkLowStock();
        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ error: 'Failed to trigger' }, { status: 500 });
    }
}
