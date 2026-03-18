import prisma from '../config/prisma.js';

/**
 * Calculates Working Capital metrics for a specific company.
 * Receivables = Sum of (total_amount - paid_amount) for active Sales Invoices
 * Payables = Sum of (total_amount - paid_amount) for active Purchase Invoices
 */
export const getWorkingCapitalMetrics = async (company_id) => {
  if (!company_id) {
    throw new Error('company_id is required');
  }

  // Aggregate Sales Invoices (Receivables)
  const receivablesAggregation = await prisma.salesInvoice.aggregate({
    _sum: {
      total_amount: true,
      paid_amount: true,
    },
    where: {
      company_id,
      status: { not: 'Cancelled' },
    },
  });

  // Aggregate Purchase Invoices (Payables)
  const payablesAggregation = await prisma.purchaseInvoice.aggregate({
    _sum: {
      total_amount: true,
      paid_amount: true,
    },
    where: {
      company_id,
      status: { not: 'Cancelled' },
    },
  });

  // Aggregate Transactions for Cash on Hand (The REAL way)
  const inflowAggregation = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { company_id, type: 'INFLOW', status: 'COMPLETED' }
  });

  const outflowAggregation = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { company_id, type: 'OUTFLOW', status: 'COMPLETED' }
  });

  const totalReceivablesValue = Number(receivablesAggregation._sum.total_amount || 0) - 
                            Number(receivablesAggregation._sum.paid_amount || 0);
                            
  const totalPayablesValue = Number(payablesAggregation._sum.total_amount || 0) - 
                          Number(payablesAggregation._sum.paid_amount || 0);

  const cashBalance = Number(inflowAggregation._sum.amount || 0) - 
                     Number(outflowAggregation._sum.amount || 0);

  // Fetch 5 most recent transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: { company_id },
    include: {
      account: {
        select: { name: true }
      }
    },
    orderBy: { date: 'desc' },
    take: 5
  });

  return {
    totalReceivables: parseFloat(totalReceivablesValue.toFixed(2)),
    totalPayables: parseFloat(totalPayablesValue.toFixed(2)),
    workingCapital: parseFloat((totalReceivablesValue - totalPayablesValue).toFixed(2)),
    cashOnHand: parseFloat(cashBalance.toFixed(2)),
    recentTransactions: recentTransactions.map(tx => ({
        ...tx,
        amount: parseFloat(tx.amount.toString()),
        accountName: tx.account.name
    }))
  };
};

export const getReceivables = async (company_id) => {
  return await prisma.salesInvoice.findMany({
    where: { company_id, status: { not: 'Cancelled' } },
    include: {
      customer: {
        select: { 
          company_name: true, 
          customer_id: true, 
          billing_address_line1: true, 
          city: true, 
          state: true, 
          email: true,
          bank_name: true,
          bank_account_no: true,
          bank_ifsc: true,
          bank_branch: true
        }
      },
      items: true
    },
    orderBy: { invoice_date: 'desc' }
  });
};

export const getPayables = async (company_id) => {
  return await prisma.purchaseInvoice.findMany({
    where: { company_id, status: { not: 'Cancelled' } },
    include: {
      vendor: {
        select: { 
          company_name: true, 
          vendor_id: true, 
          billing_address_line1: true, 
          city: true, 
          state: true, 
          email: true,
          bank_name: true,
          bank_account_no: true,
          bank_ifsc: true,
          bank_branch: true
        }
      },
      items: true
    },
    orderBy: { invoice_date: 'desc' }
  });
};

export const getAllInvoices = async (company_id) => {
  const sales = await prisma.salesInvoice.findMany({
    where: { company_id },
    include: { 
      customer: { 
        select: { 
          company_name: true,
          bank_name: true,
          bank_account_no: true,
          bank_ifsc: true,
          bank_branch: true
        } 
      }, 
      items: true 
    },
    orderBy: { invoice_date: 'desc' }
  });

  const purchases = await prisma.purchaseInvoice.findMany({
    where: { company_id },
    include: { 
      vendor: { 
        select: { 
          company_name: true,
          bank_name: true,
          bank_account_no: true,
          bank_ifsc: true,
          bank_branch: true
        } 
      }, 
      items: true 
    },
    orderBy: { invoice_date: 'desc' }
  });

  // Combine and sort
  const combined = [
    ...sales.map(s => ({ ...s, invoice_type: 'Sales', entity_name: s.customer.company_name })),
    ...purchases.map(p => ({ ...p, invoice_type: 'Purchase', entity_name: p.vendor.company_name }))
  ].sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());

  return combined;
};

export const getCustomers = async (company_id) => {
  return await prisma.customer.findMany({
    where: { company_id },
    include: {
      salesInvoices: {
        select: { total_amount: true, status: true, paid_amount: true }
      }
    },
    orderBy: { company_name: 'asc' }
  });
};

export const getVendors = async (company_id) => {
  return await prisma.vendor.findMany({
    where: { company_id },
    include: {
      purchaseInvoices: {
        select: { total_amount: true, status: true, paid_amount: true }
      }
    },
    orderBy: { company_name: 'asc' }
  });
};
