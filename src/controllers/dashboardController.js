import * as dashboardService from '../services/dashboardService.js';

export const getMetrics = async (req, res, next) => {
  try {
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({ message: 'company_id query parameter is required' });
    }

    const metrics = await dashboardService.getWorkingCapitalMetrics(company_id);

    return res.status(200).json(metrics);
  } catch (error) {
    next(error);
  }
};

export const getReceivables = async (req, res, next) => {
  try {
    const { company_id } = req.query;
    const data = await dashboardService.getReceivables(company_id);
    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const getPayables = async (req, res, next) => {
  try {
    const { company_id } = req.query;
    const data = await dashboardService.getPayables(company_id);
    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const getAllInvoices = async (req, res, next) => {
  try {
    const { company_id } = req.query;
    const data = await dashboardService.getAllInvoices(company_id);
    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const getCustomers = async (req, res, next) => {
  try {
    const { company_id } = req.query;
    const data = await dashboardService.getCustomers(company_id);
    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const getVendors = async (req, res, next) => {
  try {
    const { company_id } = req.query;
    const data = await dashboardService.getVendors(company_id);
    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};
