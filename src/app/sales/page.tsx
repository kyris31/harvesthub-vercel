'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db, Sale, SaleItem, Customer, HarvestLog, PlantingLog, SeedBatch, Crop, Invoice } from '@/lib/db';
import SaleList from '@/components/SaleList';
import SaleForm from '@/components/SaleForm';
// import { generateInvoicePDF } from '@/lib/invoiceGenerator'; // Placeholder for PDF generation

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [harvestLogs, setHarvestLogs] = useState<HarvestLog[]>([]);
  const [plantingLogs, setPlantingLogs] = useState<PlantingLog[]>([]);
  const [seedBatches, setSeedBatches] = useState<SeedBatch[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<(Sale & { items?: SaleItem[] }) | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        salesData,
        saleItemsData,
        customersData,
        harvestLogsData,
        plantingLogsData,
        seedBatchesData,
        cropsData
      ] = await Promise.all([
        db.sales.where('is_deleted').equals(0).orderBy('sale_date').reverse().toArray(),
        db.saleItems.where('is_deleted').equals(0).toArray(),
        db.customers.where('is_deleted').equals(0).orderBy('name').toArray(), // Added orderBy for consistency
        db.harvestLogs.where('is_deleted').equals(0).orderBy('harvest_date').reverse().toArray(),
        db.plantingLogs.where('is_deleted').equals(0).orderBy('planting_date').reverse().toArray(),
        db.seedBatches.where('is_deleted').equals(0).orderBy('_last_modified').reverse().toArray(),
        db.crops.where('is_deleted').equals(0).orderBy('name').toArray(), // Added orderBy for consistency
      ]);
      setSales(salesData);
      setSaleItems(saleItemsData);
      setCustomers(customersData);
      setHarvestLogs(harvestLogsData);
      setPlantingLogs(plantingLogsData);
      setSeedBatches(seedBatchesData);
      setCrops(cropsData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch sales data:", err);
      setError("Failed to load sales or related data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormSubmit = async (
    saleData: Omit<Sale, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at' | 'total_amount'>, 
    itemsData: Omit<SaleItem, 'id' | 'sale_id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'>[]
  ) => {
    setIsSubmitting(true);
    setError(null);
    const saleId = editingSale?.id || crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await db.transaction('rw', db.sales, db.saleItems, db.invoices, async () => {
        if (editingSale) { // Editing existing sale
          // For editing, we soft-delete old items and invoice, then create new ones.
          // This simplifies logic compared to trying to update/diff items.
          // The PRD states invoices are immutable, so generating a new one on edit is consistent.
          // The 'if (editingSale)' on line 80 was redundant and caused the syntax error.
          const itemsToSoftDelete = await db.saleItems.where('sale_id').equals(editingSale.id).toArray();
          for (const item of itemsToSoftDelete) {
            await db.markForSync(db.saleItems, item.id, true);
          }
          const invoiceToSoftDelete = await db.invoices.where('sale_id').equals(editingSale.id).first();
          if (invoiceToSoftDelete) {
            await db.markForSync(db.invoices, invoiceToSoftDelete.id, true);
          }
          // Update the sale record itself
          const updatedSale: Partial<Sale> = {
            ...saleData, // contains new sale_date, customer_id, notes
            updated_at: now,
            _synced: 0,
            _last_modified: Date.now(),
            is_deleted: 0, // Ensure it's not marked deleted if it was an edit
            deleted_at: undefined,
          };
          await db.sales.update(editingSale.id, updatedSale);
        } else { // Adding new sale
            const newSale: Sale = {
              id: saleId,
              ...saleData,
              created_at: now,
              updated_at: now,
              _synced: 0,
              _last_modified: Date.now(),
              is_deleted: 0,
              deleted_at: undefined,
            };
            await db.sales.add(newSale);
          }

          // Add new sale items (for both add and edit scenarios, as old items are soft-deleted on edit)
          for (const item of itemsData) {
            const newItemId = crypto.randomUUID();
            await db.saleItems.add({
              id: newItemId,
              sale_id: saleId,
              ...item,
              created_at: now,
              updated_at: now,
              _synced: 0,
              _last_modified: Date.now(),
              is_deleted: 0,
              deleted_at: undefined,
            });
          }
          
          // Generate new Invoice (for both add and edit)
          const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
          const newInvoice: Invoice = {
              id: crypto.randomUUID(),
              sale_id: saleId,
              invoice_number: invoiceNumber,
              invoice_date: saleData.sale_date,
              status: 'generated',
              pdf_url: `placeholder_invoice_${saleId}.pdf`,
              created_at: now,
              updated_at: now,
              _synced: 0,
              _last_modified: Date.now(),
              is_deleted: 0,
              deleted_at: undefined,
          };
          await db.invoices.add(newInvoice);
        console.log(`Invoice ${invoiceNumber} generated for sale ${saleId}`);

      }); // End transaction

      await fetchData();
      setShowForm(false);
      setEditingSale(null);
    } catch (err: any) {
      console.error("Failed to save sale:", err);
      setError(err.message || "Failed to save sale. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (saleToEdit: Sale) => {
    // Fetch non-soft-deleted items for the sale to populate the form
    const itemsForSale = await db.saleItems
        .where('sale_id').equals(saleToEdit.id)
        .and(item => item.is_deleted !== 1)
        .toArray();
    setEditingSale({ ...saleToEdit, items: itemsForSale });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this sale? This will also delete associated sale items and invoice. This action cannot be undone locally.")) {
      setIsDeleting(id);
      setError(null);
      try {
        // Soft delete the sale, its items, and its invoice
        await db.transaction('rw', db.sales, db.saleItems, db.invoices, async () => {
            const itemsToSoftDelete = await db.saleItems.where('sale_id').equals(id).toArray();
            for (const item of itemsToSoftDelete) {
              await db.markForSync(db.saleItems, item.id, true);
            }
            const invoiceToSoftDelete = await db.invoices.where('sale_id').equals(id).first();
            if (invoiceToSoftDelete) {
              await db.markForSync(db.invoices, invoiceToSoftDelete.id, true);
            }
            await db.markForSync(db.sales, id, true);
        });
        await fetchData();
      } catch (err) {
        console.error("Failed to delete sale:", err);
        setError("Failed to delete sale.");
      } finally {
        setIsDeleting(null);
      }
    }
  };
  
  const handleViewInvoice = async (saleId: string) => {
    // In a real app, this would fetch the PDF URL or generate/display the PDF.
    // For now, it's a placeholder.
    const invoice = await db.invoices.where('sale_id').equals(saleId).first();
    if (invoice) {
        alert(`Invoice: ${invoice.invoice_number}\nPDF URL (placeholder): ${invoice.pdf_url}\n\nPDF generation and display would happen here.`);
        // Example: window.open(invoice.pdf_url, '_blank');
    } else {
        alert("Invoice not found for this sale.");
    }
  };


  return (
    <div>
      <header className="bg-white shadow mb-6">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sales Records</h1>
          <button
            onClick={() => { setEditingSale(null); setShowForm(true); setError(null); }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow-sm transition-colors duration-150"
          >
            Record New Sale
          </button>
        </div>
      </header>

      {showForm && (
        <SaleForm
          initialData={editingSale || undefined} // Pass undefined if null
          onSubmit={handleFormSubmit}
          onCancel={() => { setShowForm(false); setEditingSale(null); setError(null);}}
          isSubmitting={isSubmitting}
        />
      )}

      <div className="mt-4">
        {error && <p className="text-red-500 mb-4 p-3 bg-red-100 rounded-md">{error}</p>}
        {isLoading && <p className="text-center text-gray-500">Loading sales records...</p>}
        {!isLoading && !error && (
          <SaleList
            sales={sales}
            customers={customers}
            saleItems={saleItems}
            harvestLogs={harvestLogs}
            plantingLogs={plantingLogs}
            seedBatches={seedBatches}
            crops={crops}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isDeleting={isDeleting}
            onViewInvoice={handleViewInvoice}
          />
        )}
        {!isLoading && sales.length === 0 && !error && (
           <div className="text-center py-10">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sales recorded</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by recording a new sale.</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => { setEditingSale(null); setShowForm(true); setError(null); }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Record New Sale
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}