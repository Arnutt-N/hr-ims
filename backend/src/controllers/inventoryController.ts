
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';

const itemSchema = z.object({
    name: z.string(),
    category: z.string(),
    type: z.string(),
    serial: z.string().optional(),
    status: z.string().optional(),
    image: z.string().optional(),
    stock: z.number().int().min(0).default(1),
});

export const getInventory = async (req: Request, res: Response) => {
    try {
        const items = await prisma.inventoryItem.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching inventory', error });
    }
};

export const createItem = async (req: Request, res: Response) => {
    try {
        const data = itemSchema.parse(req.body);
        const item = await prisma.inventoryItem.create({ data });
        res.status(201).json(item);
    } catch (error) {
        res.status(400).json({ message: 'Error creating item', error });
    }
};

export const updateItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = itemSchema.partial().parse(req.body);
        const item = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data,
        });
        res.json(item);
    } catch (error) {
        res.status(400).json({ message: 'Error updating item', error });
    }
};

export const deleteItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.inventoryItem.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item', error });
    }
};
