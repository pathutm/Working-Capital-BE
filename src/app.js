import express from 'express';
import cors from 'cors';
import organizationRoutes from './routes/organizationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import prisma from './config/prisma.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/organizations', organizationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health Check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', database: 'Connected' });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: 'Database connection failed', error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Working Capital Backend is running');
});

// Global Error Handler
app.use(errorHandler);

export default app;
