import test from 'node:test';
import assert from 'node:assert/strict';
import { getLedgerEffectForCategory, calculateMonthMetrics } from '../lib/financeRules.mjs';

test('ordinary expense does not create a savings or Chama ledger movement', () => {
  assert.equal(getLedgerEffectForCategory('Bills & utilities'), 'none');
});

test('Savings creates only a savings deposit', () => {
  assert.equal(getLedgerEffectForCategory('Savings'), 'savings-deposit');
});

test('Chama Contribution credits the unallocated Chama pool', () => {
  assert.equal(getLedgerEffectForCategory('Chama Contribution'), 'chama-unallocated-contribution');
});

test('Money Lost is recorded as a budget outflow but not a ledger transfer', () => {
  assert.equal(getLedgerEffectForCategory('Money Lost'), 'none');
  const metrics = calculateMonthMetrics([{ budgetMonth: '2026-10', category: 'Money Lost', amount: 500 }], '2026-10', 2000);
  assert.equal(metrics.netSpend, 500);
  assert.deepEqual(metrics.categorySpend, { 'Money Lost': 500 });
});

test('Money Recovered reduces net spend and does not count as category spend', () => {
  assert.equal(getLedgerEffectForCategory('Money Recovered'), 'none');
  const metrics = calculateMonthMetrics([
    { budgetMonth: '2026-10', category: 'Bills & utilities', amount: 1200 },
    { budgetMonth: '2026-10', category: 'Money Recovered', amount: 200 },
    { budgetMonth: '2026-09', category: 'Bills & utilities', amount: 9999 },
  ], '2026-10', 2000);
  assert.equal(metrics.totalOutflows, 1200);
  assert.equal(metrics.totalRecovered, 200);
  assert.equal(metrics.netSpend, 1000);
  assert.equal(metrics.remainingBudget, 1000);
  assert.deepEqual(metrics.categorySpend, { 'Bills & utilities': 1200 });
});
