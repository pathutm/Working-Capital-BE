import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/metrics', dashboardController.getMetrics);
router.get('/receivables', dashboardController.getReceivables);
router.get('/payables', dashboardController.getPayables);
router.get('/invoices', dashboardController.getAllInvoices);
router.get('/customers', dashboardController.getCustomers);
router.get('/vendors', dashboardController.getVendors);

export default router;
