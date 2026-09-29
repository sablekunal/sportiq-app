import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { BudgetItem } from '../../types';
import { DollarSign, Plus, Trash2, TrendingUp, TrendingDown, Target, ShieldCheck } from 'lucide-react';

export const BudgetAccounting: React.FC = () => {
  const { activeTournament, addBudgetItem, deleteBudgetItem } = useTournament();

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [category, setCategory] = useState('Ground & Facility');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(5000);
  const [status, setStatus] = useState<'PENDING' | 'RECEIVED' | 'PAID'>('PENDING');

  if (!activeTournament) return null;

  const budget = activeTournament.budget;
  const teamsCount = Math.max(activeTournament.teams.length, 1);

  const totalIncome = budget
    .filter((b) => b.type === 'INCOME')
    .reduce((sum, b) => sum + b.amount, 0);

  const totalExpenses = budget
    .filter((b) => b.type === 'EXPENSE')
    .reduce((sum, b) => sum + b.amount, 0);

  const netBalance = totalIncome - totalExpenses;
  const breakEvenPerTeam = Math.ceil(totalExpenses / teamsCount);
  const coveragePercent = totalExpenses > 0 ? Math.min(100, Math.round((totalIncome / totalExpenses) * 100)) : 100;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;

    addBudgetItem(activeTournament.id, {
      type,
      category,
      description,
      amount: Number(amount),
      status: type === 'INCOME' ? (status === 'PAID' ? 'RECEIVED' : status) : status,
    });

    setDescription('');
    setAmount(5000);
    setIsAddingItem(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-sport-navy flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Tournament Accounting & Budget Planner
          </h3>
          <p className="text-xs text-slate-500">
            Projected revenue, ground rentals, officials payouts, and break-even analysis
          </p>
        </div>

        <button
          onClick={() => setIsAddingItem(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* KPI Financial Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            ₹{totalIncome.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Sponsorships & Registrations</div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Ground, Referees, Trophies</div>
        </div>

        {/* Net Profit / Loss */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Net Position</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black ${
              netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            ₹{netBalance.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {netBalance >= 0 ? 'Projected Surplus' : 'Funding Deficit'}
          </div>
        </div>

        {/* Break Even Target */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Break-Even / Team</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-sport-navy">
            ₹{breakEvenPerTeam.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {teamsCount} registered squads
          </div>
        </div>
      </div>

      {/* Coverage Progress Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
        <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Expense Recovery:</span>
        <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              coveragePercent >= 100 ? 'bg-emerald-500' : 'bg-sport-orange'
            }`}
            style={{ width: `${coveragePercent}%` }}
          />
        </div>
        <span className="text-xs font-black text-sport-navy font-mono">{coveragePercent}%</span>
      </div>

      {/* Add Item Modal */}
      {isAddingItem && (
        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-emerald-500/30 shadow-md animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-sport-navy">Add Budget Entry</h4>
            <button
              onClick={() => setIsAddingItem(false)}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="EXPENSE">Expense (Debit)</option>
                <option value="INCOME">Income (Credit)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Venue / Referees / Prize"
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Amount (INR ₹)
              </label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid / Received</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Description / Vendor
              </label>
              <input
                type="text"
                placeholder="e.g. Paramedic ambulances & kit"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
              >
                Record Line Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Line Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {budget.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        item.type === 'INCOME'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-sport-navy">{item.category}</td>
                  <td className="py-3 px-4 text-slate-600">{item.description}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        item.status === 'RECEIVED' || item.status === 'PAID'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                      item.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-800'
                    }`}
                  >
                    {item.type === 'INCOME' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => deleteBudgetItem(activeTournament.id, item.id)}
                      className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
