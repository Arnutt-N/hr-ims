import { checkLowStock } from '@/lib/actions/notifications';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const result = await checkLowStock();
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to trigger' }, { status: 500 });
    }
}
