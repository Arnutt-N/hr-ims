
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

import authRoutes from './routes/auth';
import inventoryRoutes from './routes/inventory';
import requestRoutes from './routes/requests';
import userRoutes from './routes/users';
import historyRoutes from './routes/history';
import settingsRoutes from './routes/settings';
import assetsRoutes from './routes/assets';
import warehousesRoutes from './routes/warehouses';
import stockLevelsRoutes from './routes/stock-levels';
import stockTransfersRoutes from './routes/stock-transfers';
import stockTransactionsRoutes from './routes/stock-transactions';
import departmentRoutes from './routes/departments';

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/warehouses', warehousesRoutes);
app.use('/api/stock-levels', stockLevelsRoutes);
app.use('/api/stock-transfers', stockTransfersRoutes);
app.use('/api/stock-transactions', stockTransactionsRoutes);
app.use('/api/departments', departmentRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
