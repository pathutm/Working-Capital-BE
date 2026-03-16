import * as organizationService from '../services/organizationService.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'name, email, and password are required',
      });
    }

    const organization = await organizationService.registerOrganization(req.body);

    return res.status(201).json({
      message: 'Organization registered successfully',
      organization,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const organization = await organizationService.loginOrganization(email, password);

    return res.status(200).json({
      message: 'Login successful',
      organization,
    });
  } catch (error) {
    next(error);
  }
};
