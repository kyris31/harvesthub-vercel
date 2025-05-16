'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db, Sale, SaleItem, InputInventory, CultivationLog } from '@/lib/db';
// Placeholder for a CSV export utility
// import { exportToCSV } from '@/lib/exportUtils'; 

interface FinancialSummary {
  totalSales: number;
  totalRevenue: number;
  totalInputCosts: number; // Approximation based on purchased inputs
  estimatedProfit: number;
  salesByDate: { date: string; revenue: number }[];
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // Start of current month
    end: new Date().toISOString().split('T')[0], // Today
  });

  const calculateFinancialSummary = useCallback(async (startDate: string, endDate: string) => {
    setIsLoading(true);
    try {
      const salesInRange = await db.sales
        .where('sale_date').between(startDate, endDate, true, true)
        .toArray();
      
      const saleItemIds = salesInRange.map(s => s.id);
      const allSaleItems = await db.saleItems.where('sale_id').anyOf(saleItemIds).toArray();

      let totalRevenue = 0;
      const salesByDateMap = new Map<string, number>();

      salesInRange.forEach(sale => {
        const itemsForThisSale = allSaleItems.filter(si => si.sale_id === sale.id);
        let saleRevenue = 0;
        itemsForThisSale.forEach(item => {
          saleRevenue += item.quantity_sold * item.price_per_unit;
        });
        totalRevenue += saleRevenue;
        
        const currentDateRevenue = salesByDateMap.get(sale.sale_date) || 0;
        salesByDateMap.set(sale.sale_date, currentDateRevenue + saleRevenue);
      });
      
      const salesByDate = Array.from(salesByDateMap.entries())
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Approximate input costs: sum of all purchased inputs (cost_per_unit * initial_quantity)
      // This is a rough estimate as it doesn't track usage per sale/period directly for COGS.
      const allInputs = await db.inputInventory.toArray();
      const totalInputCosts = allInputs.reduce((sum, item) => {
        return sum + ((item.cost_per_unit || 0) * (item.initial_quantity || 0));
      }, 0);
      // A more accurate COGS would require linking input usage from cultivation logs to specific harvests/sales.

      setSummary({
        totalSales: salesInRange.length,
        totalRevenue,
        totalInputCosts, // This is total cost of all inputs ever purchased, not COGS for the period.
        estimatedProfit: totalRevenue - 0, // Placeholder for COGS calculation
        salesByDate,
      });
      setError(null);
    } catch (err) {
      console.error("Failed to calculate financial summary:", err);
      setError("Failed to load financial data.");
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    calculateFinancialSummary(dateRange.start, dateRange.end);
  }, [dateRange, calculateFinancialSummary]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'start' | 'end') => {
    setDateRange(prev => ({ ...prev, [field]: e.target.value }));
  };
  
  const handleExportSales = async () => {
    alert("Sales CSV export functionality to be implemented.");
    // const salesData = await db.sales.toArray(); // Fetch data to export
    // const items = await db.saleItems.toArray();
    // const customers = await db.customers.toArray();
    // // ... prepare data in CSV format ...
    // // exportToCSV(csvData, 'sales_report.csv');
  };

  const handleExportInventory = async () => {
    alert("Inventory CSV/PDF export functionality to be implemented.");
  };


  return (
    <div>
      <header className="bg-white shadow mb-6">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Financial Dashboard & Reports</h1>
        </div>
      </header>
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8 space-y-8">
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Date Range for Summary</h2>
          <div className="flex items-center space-x-4 mb-6">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
              <input type="date" id="startDate" value={dateRange.start} onChange={e => handleDateChange(e, 'start')} className="mt-1 p-2 border rounded-md"/>
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
              <input type="date" id="endDate" value={dateRange.end} onChange={e => handleDateChange(e, 'end')} className="mt-1 p-2 border rounded-md"/>
            </div>
          </div>

          {isLoading && <p>Loading financial summary...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {summary && !isLoading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-green-50 p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium text-green-700">Total Sales (Period)</h3>
                <p className="text-3xl font-bold text-green-600">{summary.totalSales}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium text-blue-700">Total Revenue (Period)</h3>
                <p className="text-3xl font-bold text-blue-600">${summary.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium text-yellow-700">Est. Profit (Period)</h3>
                <p className="text-3xl font-bold text-yellow-600">${(summary.totalRevenue - 0).toFixed(2)}</p>
                <p className="text-xs text-gray-500">(Note: COGS calculation is simplified)</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Sales Trend (Period)</h2>
            {summary && summary.salesByDate.length > 0 ? (
                <div className="h-64 bg-gray-100 p-4 rounded-md flex items-center justify-center">
                    {/* Placeholder for chart */}
                    <p className="text-gray-500">Chart would be displayed here (e.g., using Chart.js or Recharts)</p>
                    {/* <pre className="text-xs overflow-auto">{JSON.stringify(summary.salesByDate, null, 2)}</pre> */}
                </div>
            ) : (
                <p className="text-gray-500">No sales data in selected period to display trend.</p>
            )}
        </div>


        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Export Data</h2>
          <div className="space-x-4">
            <button 
              onClick={handleExportSales}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              Export Sales Report (CSV)
            </button>
            <button 
              onClick={handleExportInventory}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded"
            >
              Export Inventory Report (CSV/PDF)
            </button>
            {/* Add more export buttons as needed: Planting Logs, Harvest Logs, etc. */}
          </div>
           <p className="text-xs text-gray-500 mt-4">Note: Export functionality is currently a placeholder.</p>
        </div>

      </div>
    </div>
  );
}