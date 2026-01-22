import { NextResponse } from 'next/server';
import { createWarehouse, getProvinces } from '@/lib/actions/warehouse';
import { auth } from '@/auth';

export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        console.log('User Role:', session.user.role);

        // 1. Get a valid province
        const provinceRes = await getProvinces();
        if (!provinceRes.success || !provinceRes.provinces || provinceRes.provinces.length === 0) {
            return NextResponse.json({ error: 'No provinces found in DB' }, { status: 400 });
        }
        const firstProvince = provinceRes.provinces[0];

        // 2. Prepare Data
        const testData = {
            name: `Debug Prov Hub ${Date.now()}`,
            code: `DBG-${Date.now().toString().slice(-4)}`,
            type: 'provincial',
            provinceId: firstProvince.id,
            divisionId: null,
            isActive: true,
            managerIds: []
        };

        // 3. Call Server Action directly
        const result = await createWarehouse(testData);

        return NextResponse.json({
            message: 'Attempted to create warehouse',
            inputData: testData,
            result: result
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
