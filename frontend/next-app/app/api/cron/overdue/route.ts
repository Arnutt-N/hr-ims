import { checkOverdueItems } from '@/lib/actions/requests';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensure not cached

export async function GET(request: Request) {
    try {
        // Simple security check (Authorization header)
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const result = await checkOverdueItems();

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Overdue check completed. Found ${result.count} new overdue items.`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Cron job error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
