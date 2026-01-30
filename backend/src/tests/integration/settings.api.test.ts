/**
 * Integration Tests for Settings API
 * 
 * Tests ต้องรันกับ Database จริง
 * ใช้ jest --testEnvironment=node
 */

import request from 'supertest';
import express from 'express';
import settingsRoutes from '../../routes/settings';
import { requireAuth, requireRole } from '../../middleware/auth';

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
    requireAuth: (req: any, res: any, next: any) => {
        req.user = { id: 1, role: 'superadmin' };
        next();
    },
    requireRole: () => (req: any, res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/settings', settingsRoutes);

describe('Settings API Integration', () => {
    describe('GET /api/settings', () => {
        it('should return settings', async () => {
            const response = await request(app)
                .get('/api/settings')
                .expect(200);

            expect(response.body).toHaveProperty('orgName');
            expect(response.body).toHaveProperty('borrowLimit');
        });
    });

    describe('PUT /api/settings', () => {
        it('should update settings', async () => {
            const newSettings = {
                orgName: 'Updated Organization',
                borrowLimit: 14,
            };

            const response = await request(app)
                .put('/api/settings')
                .send(newSettings)
                .expect(200);

            expect(response.body.orgName).toBe(newSettings.orgName);
            expect(response.body.borrowLimit).toBe(newSettings.borrowLimit);
        });

        it('should reject invalid settings', async () => {
            const invalidSettings = {
                borrowLimit: -1,
            };

            await request(app)
                .put('/api/settings')
                .send(invalidSettings)
                .expect(400);
        });
    });
});
