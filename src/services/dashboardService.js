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

  const totalReceivablesValue = Number(receivablesAggregation._sum.total_amount || 0) - 
                            Number(receivablesAggregation._sum.paid_amount || 0);
                            
  const totalPayablesValue = Number(payablesAggregation._sum.total_amount || 0) - 
                          Number(payablesAggregation._sum.paid_amount || 0);

  return {
    totalReceivables: parseFloat(totalReceivablesValue.toFixed(2)),
    totalPayables: parseFloat(totalPayablesValue.toFixed(2)),
    workingCapital: parseFloat((totalReceivablesValue - totalPayablesValue).toFixed(2)),
  };
};
