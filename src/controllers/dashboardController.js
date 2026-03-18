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
