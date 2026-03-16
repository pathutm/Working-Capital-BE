import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';

export const registerOrganization = async (orgData) => {
  const { name, email, password, phone, address, contactPerson } = orgData;

  const existingOrganization = await prisma.organization.findUnique({
    where: { email },
  });

  if (existingOrganization) {
    const error = new Error('Organization already exists');
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return await prisma.organization.create({
    data: {
      name,
      email,
      phone,
      address,
      contactPerson,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      contactPerson: true,
      createdAt: true,
    },
  });
};

export const loginOrganization = async (email, password) => {
  const organization = await prisma.organization.findUnique({
    where: { email },
  });

  if (!organization) {
    const error = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  const isValidPassword = await bcrypt.compare(password, organization.passwordHash);

  if (!isValidPassword) {
    const error = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  return {
    id: organization.id,
    name: organization.name,
    email: organization.email,
    phone: organization.phone,
    address: organization.address,
    contactPerson: organization.contactPerson,
  };
};
