/**
 * Pure finance rules shared by application code and automated tests.
 * Business date: dateOfTransaction (YYYY-MM-DD). `createdAt` is metadata only.
 */
export function getLedgerEffectForCategory(category) {
  switch (String(category || '').trim()) {
    case 'Savings':
      return 'savings-deposit';
    case 'Chama Contribution':
      // The transaction form does not select a specific Chama, so contributions
      // are credited to the Chama unallocated pool and can later be allocated.
      return 'chama-unallocated-contribution';
    case 'Money Recovered':
    case 'Money Lost':
    default:
      return 'none';
  }
}

export function calculateMonthMetrics(transactions, selectedMonth, budgetTotal = 0) {
  const monthTransactions = (transactions || []).filter((tx) => tx.budgetMonth === selectedMonth);
  const totalRecovered = monthTransactions
    .filter((tx) => tx.category === 'Money Recovered')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalOutflows = monthTransactions
    .filter((tx) => tx.category !== 'Money Recovered')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const netSpend = totalOutflows - totalRecovered;
  const categorySpend = {};

  for (const tx of monthTransactions) {
    if (tx.category === 'Money Recovered') continue;
    const category = tx.category || 'Uncategorized';
    categorySpend[category] = (categorySpend[category] || 0) + Number(tx.amount || 0);
  }

  const planned = Number(budgetTotal || 0);
  return {
    transactions: monthTransactions,
    totalRecovered,
    totalOutflows,
    netSpend,
    remainingBudget: planned - netSpend,
    categorySpend,
  };
}
