
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';

const settingsSchema = z.object({
    orgName: z.string().optional(),
    borrowLimit: z.number().int().min(1).optional(),
    checkInterval: z.number().int().min(1).optional(),
    maintenanceAlert: z.boolean().optional(),
});

export const getSettings = async (req: Request, res: Response) => {
    try {
        const settings = await prisma.settings.findFirst();
        if (!settings) {
            // Return default if not found
            return res.json({
                orgName: 'IMS Corporation',
                borrowLimit: 7,
                checkInterval: 7,
                maintenanceAlert: true,
            });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings', error });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const data = settingsSchema.parse(req.body);

        // Upsert to ensure one record exists
        const firstSetting = await prisma.settings.findFirst();

        let settings;
        if (firstSetting) {
            settings = await prisma.settings.update({
                where: { id: firstSetting.id },
                data,
            });
        } else {
            settings = await prisma.settings.create({
                data: {
                    orgName: data.orgName || 'IMS Corporation',
                    borrowLimit: data.borrowLimit || 7,
                    checkInterval: data.checkInterval || 7,
                    maintenanceAlert: data.maintenanceAlert ?? true,
                },
            });
        }

        res.json(settings);
    } catch (error) {
        res.status(400).json({ message: 'Error updating settings', error });
    }
};
