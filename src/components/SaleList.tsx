'use client';

import React from 'react';
import { Sale, SaleItem, Customer, HarvestLog, Crop, SeedBatch, PlantingLog } from '@/lib/db'; // Added PlantingLog

interface EnrichedSale extends Sale {
  customerName?: string;
  itemCount?: number;
  calculatedTotal?: number; // Since total_amount is not generated in DB anymore
  items?: SaleItem[]; // Optional: if you want to show item details in a modal or expand
}

interface SaleListProps {
  sales: EnrichedSale[];
  customers: Customer[];
  // For calculating total if not pre-calculated or for item details display
  saleItems: SaleItem[]; 
  harvestLogs: HarvestLog[];
  plantingLogs: PlantingLog[];
  seedBatches: SeedBatch[];
  crops: Crop[];
  onEdit: (sale: Sale) => void; // Pass the raw Sale object for editing
  onDelete: (id: string) => Promise<void>;
  isDeleting: string | null;
  onViewInvoice: (saleId: string) => void; // For invoice generation/viewing
}

export default function SaleList({ 
  sales, 
  customers,
  saleItems,
  // harvestLogs, plantingLogs, seedBatches, crops, // Keep if needed for detailed item display
  onEdit, 
  onDelete, 
  isDeleting,
  onViewInvoice
}: SaleListProps) {

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return <span className="text-gray-400">N/A</span>;
    const activeCustomers = customers.filter(c => c.is_deleted !== 1);
    const customer = activeCustomers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown/Deleted Customer';
  };

  // Calculate total for a sale if not already provided
  const calculateSaleTotal = (saleId: string): number => {
    const activeSaleItems = saleItems.filter(item => item.is_deleted !== 1);
    return activeSaleItems
      .filter(item => item.sale_id === saleId)
      .reduce((sum, item) => sum + (Number(item.quantity_sold) * Number(item.price_per_unit)), 0);
  };

  const activeSales = sales.filter(sale => sale.is_deleted !== 1);

  if (activeSales.length === 0) {
    return <p className="text-center text-gray-500 mt-8">No active sales recorded yet. Record your first sale!</p>;
  }

  return (
    <div className="overflow-x-auto shadow-md rounded-lg">
      <table className="min-w-full bg-white">
        <thead className="bg-green-600 text-white">
          <tr>
            <th className="text-left py-3 px-5 uppercase font-semibold text-sm">Sale Date</th>
            <th className="text-left py-3 px-5 uppercase font-semibold text-sm">Customer</th>
            <th className="text-right py-3 px-5 uppercase font-semibold text-sm">Item Count</th>
            <th className="text-right py-3 px-5 uppercase font-semibold text-sm">Total Amount</th>
            <th className="text-center py-3 px-5 uppercase font-semibold text-sm">Synced</th>
            <th className="text-center py-3 px-5 uppercase font-semibold text-sm">Actions</th>
          </tr>
        </thead>
        <tbody className="text-gray-700">
          {activeSales.map((sale) => {
            const activeSaleItemsForThisSale = saleItems.filter(si => si.sale_id === sale.id && si.is_deleted !== 1);
            const itemCount = activeSaleItemsForThisSale.length;
            const totalAmount = sale.total_amount ?? calculateSaleTotal(sale.id); // calculateSaleTotal already filters for active items

            return (
              <tr key={sale.id} className="border-b border-gray-200 hover:bg-green-50 transition-colors duration-150">
                <td className="py-3 px-5">{new Date(sale.sale_date).toLocaleDateString()}</td>
                <td className="py-3 px-5">{getCustomerName(sale.customer_id)}</td>
                <td className="py-3 px-5 text-right">{itemCount}</td>
                <td className="py-3 px-5 text-right">${totalAmount.toFixed(2)}</td>
                <td className="py-3 px-5 text-center">
                  {sale._synced === 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  ) : sale._synced === 1 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Synced
                    </span>
                  ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Unknown
                    </span>
                  )}
                </td>
                <td className="py-3 px-5 text-center space-x-2">
                  <button
                    onClick={() => onViewInvoice(sale.id)}
                    className="text-purple-600 hover:text-purple-800 font-medium transition-colors duration-150"
                    title="View/Generate Invoice"
                  >
                    Invoice
                  </button>
                  <button
                    onClick={() => onEdit(sale)} // Pass the original sale object
                    className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-150"
                    disabled={isDeleting === sale.id}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(sale.id)}
                    className="text-red-600 hover:text-red-800 font-medium transition-colors duration-150 disabled:opacity-50"
                    disabled={isDeleting === sale.id}
                  >
                    {isDeleting === sale.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}