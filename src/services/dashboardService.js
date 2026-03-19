import prisma from '../config/prisma.js';

const deriveStatus = (invoice) => {
  if (['Paid', 'Cancelled'].includes(invoice.status)) return invoice.status;
  if (invoice.due_date && new Date(invoice.due_date) < new Date()) return 'Overdue';
  return invoice.status;
};

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

  const now = new Date();

  // Fetch 5 most recent overdue receivables
  const overdueReceivables = await prisma.salesInvoice.findMany({
    where: {
      company_id,
      status: { notIn: ['Paid', 'Cancelled'] },
      due_date: { lt: now }
    },
    include: {
      customer: { select: { company_name: true } }
    },
    orderBy: { due_date: 'asc' },
    take: 5
  });

  // Fetch 5 most recent overdue payables
  const overduePayables = await prisma.purchaseInvoice.findMany({
    where: {
      company_id,
      status: { notIn: ['Paid', 'Cancelled'] },
      due_date: { lt: now }
    },
    include: {
      vendor: { select: { company_name: true } }
    },
    orderBy: { due_date: 'asc' },
    take: 5
  });

  const netWorkingCapital = totalReceivablesValue - totalPayablesValue;

  // Optimized Monthly Invoices aggregation (In-memory to avoid 48+ DB queries)
  const monthlyInvoiceDataMap = new Map();
  const targetYears = [2024, 2026];

  const salesInvoices = await prisma.salesInvoice.findMany({
    where: {
      company_id,
      status: { not: 'Cancelled' },
      OR: targetYears.map(year => ({
        invoice_date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31)
        }
      }))
    },
    select: { invoice_date: true, total_amount: true }
  });

  const purchaseInvoices = await prisma.purchaseInvoice.findMany({
    where: {
      company_id,
      status: { not: 'Cancelled' },
      OR: targetYears.map(year => ({
        invoice_date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31)
        }
      }))
    },
    select: { invoice_date: true, total_amount: true }
  });

  salesInvoices.forEach(inv => {
    const date = new Date(inv.invoice_date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const entry = monthlyInvoiceDataMap.get(key) || { 
      name: `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`, 
      sales: 0, 
      purchases: 0, 
      sortDate: new Date(date.getFullYear(), date.getMonth(), 1) 
    };
    entry.sales += parseFloat(inv.total_amount.toString());
    monthlyInvoiceDataMap.set(key, entry);
  });

  purchaseInvoices.forEach(inv => {
    const date = new Date(inv.invoice_date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const entry = monthlyInvoiceDataMap.get(key) || { 
      name: `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`, 
      sales: 0, 
      purchases: 0, 
      sortDate: new Date(date.getFullYear(), date.getMonth(), 1) 
    };
    entry.purchases += parseFloat(inv.total_amount.toString());
    monthlyInvoiceDataMap.set(key, entry);
  });

  const monthlyInvoiceData = Array.from(monthlyInvoiceDataMap.values())
    .sort((a, b) => a.sortDate - b.sortDate);

  const recentTransactionsFormatted = recentTransactions.map(tx => ({
    ...tx,
    amount: parseFloat(tx.amount.toString()),
    accountName: tx.account.name
  }));

  const overdueReceivablesFormatted = overdueReceivables.map(inv => ({
    ...inv,
    total_amount: parseFloat(inv.total_amount.toString()),
    paid_amount: parseFloat(inv.paid_amount.toString()),
    entityName: inv.customer.company_name,
    status: 'Overdue'
  }));

  const overduePayablesFormatted = overduePayables.map(inv => ({
    ...inv,
    total_amount: parseFloat(inv.total_amount.toString()),
    paid_amount: parseFloat(inv.paid_amount.toString()),
    entityName: inv.vendor.company_name,
    status: 'Overdue'
  }));

  return {
    totalReceivables: parseFloat(totalReceivablesValue.toFixed(2)),
    totalPayables: parseFloat(totalPayablesValue.toFixed(2)),
    netWorkingCapital: parseFloat(netWorkingCapital.toFixed(2)),
    cashOnHand: parseFloat(cashBalance.toFixed(2)),
    overdueReceivables: overdueReceivablesFormatted,
    overduePayables: overduePayablesFormatted,
    monthlyInvoiceData
  };
};

export const getReceivables = async (company_id) => {
  const invoices = await prisma.salesInvoice.findMany({
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
  return invoices.map(inv => ({ ...inv, status: deriveStatus(inv) }));
};

export const getPayables = async (company_id) => {
  const invoices = await prisma.purchaseInvoice.findMany({
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
  return invoices.map(inv => ({ ...inv, status: deriveStatus(inv) }));
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
    ...sales.map(s => ({ ...s, invoice_type: 'Sales', entity_name: s.customer.company_name, status: deriveStatus(s) })),
    ...purchases.map(p => ({ ...p, invoice_type: 'Purchase', entity_name: p.vendor.company_name, status: deriveStatus(p) }))
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
