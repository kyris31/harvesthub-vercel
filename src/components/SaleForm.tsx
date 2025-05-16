'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sale, SaleItem, Customer, HarvestLog, PlantingLog, Crop, SeedBatch, db } from '@/lib/db';
import CustomerForm from './CustomerForm'; // To create new customers on the fly

interface SaleFormProps {
  initialData?: Sale & { items?: SaleItem[] };
  onSubmit: (saleData: Omit<Sale, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at' | 'total_amount'>, itemsData: Omit<SaleItem, 'id' | 'sale_id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'>[]) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface EnrichedHarvestLog extends HarvestLog {
  cropName?: string;
  plantingDate?: string;
}

export default function SaleForm({ initialData, onSubmit, onCancel, isSubmitting }: SaleFormProps) {
  const [saleDate, setSaleDate] = useState('');
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<(Partial<SaleItem & { key: string, availableQuantity?: number, cropName?: string }>)[]>([]);
  
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [availableHarvests, setAvailableHarvests] = useState<EnrichedHarvestLog[]>([]);
  
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchFormData = useCallback(async () => {
    try {
      const [customers, harvests, plantingLogs, seedBatches, crops] = await Promise.all([
        db.customers.orderBy('name').toArray(),
        db.harvestLogs.orderBy('harvest_date').reverse().toArray(),
        db.plantingLogs.toArray(),
        db.seedBatches.toArray(),
        db.crops.toArray(),
      ]);
      setAvailableCustomers(customers);
      
      const enrichedHarvests = harvests.map(h => {
        const pLog = plantingLogs.find(pl => pl.id === h.planting_log_id);
        let cropName = 'Unknown Crop';
        if (pLog && pLog.seed_batch_id) {
          const sBatch = seedBatches.find(sb => sb.id === pLog.seed_batch_id);
          if (sBatch) {
            const crop = crops.find(c => c.id === sBatch.crop_id);
            cropName = crop?.name || 'Unknown Crop';
          }
        } else if (pLog) {
            // Fallback if no seed batch linked, try to find crop via planting log if direct crop link existed
        }
        return { ...h, cropName, plantingDate: pLog?.planting_date };
      });
      setAvailableHarvests(enrichedHarvests);

    } catch (error) {
      console.error("Failed to fetch form data for sales", error);
      setFormError("Could not load customer or harvest data.");
    }
  }, []);

  useEffect(() => {
    fetchFormData();
    if (initialData) {
      setSaleDate(initialData.sale_date ? initialData.sale_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setCustomerId(initialData.customer_id || undefined);
      setNotes(initialData.notes || '');
      // TODO: Populate items from initialData.items if editing
      // This requires fetching full harvest details for each item to pre-fill.
      // For simplicity in this pass, editing will clear items. A real app would pre-load.
      if (initialData.items) {
         const initialItems = initialData.items.map((item, index) => {
            const harvest = availableHarvests.find(h => h.id === item.harvest_log_id);
            return {
                ...item,
                key: `item-${index}-${Date.now()}`,
                availableQuantity: harvest?.quantity_harvested, // This might be stale if other sales used it
                cropName: harvest?.cropName
            };
        });
        // setItems(initialItems); // Deferred for simplicity
      } else {
        setItems([{ key: `item-0-${Date.now()}`, harvest_log_id: '', quantity_sold: '', price_per_unit: '' }]);
      }

    } else {
      setSaleDate(new Date().toISOString().split('T')[0]);
      setItems([{ key: `item-0-${Date.now()}`, harvest_log_id: '', quantity_sold: '', price_per_unit: '' }]);
    }
  }, [initialData, fetchFormData, availableHarvests]); // availableHarvests in dep array for initial items

  const handleItemChange = (index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...items];
    const currentItem = { ...newItems[index], [field]: value };

    if (field === 'harvest_log_id' && value) {
        const selectedHarvest = availableHarvests.find(h => h.id === value);
        currentItem.availableQuantity = selectedHarvest?.quantity_harvested;
        currentItem.cropName = selectedHarvest?.cropName;
        // Optionally auto-fill price if you have a standard price for crops
    }
    newItems[index] = currentItem;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { key: `item-${items.length}-${Date.now()}`, harvest_log_id: '', quantity_sold: '', price_per_unit: '' }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleCustomerSubmit = async (customerData: Omit<Customer, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'> | Customer) => {
    try {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const newCustomer : Customer = {
        ...(customerData as Omit<Customer, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'>),
        id,
        created_at: now,
        updated_at: now,
        _synced: 0,
        _last_modified: Date.now()
      };
      await db.customers.add(newCustomer);
      await fetchFormData(); // Refresh customer list
      setCustomerId(id); // Auto-select new customer
      setShowCustomerForm(false);
      return id;
    } catch (err) {
      console.error("Failed to add customer:", err);
      setFormError("Failed to add new customer.");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!saleDate) {
      setFormError('Sale Date is required.');
      return;
    }
    if (items.length === 0) {
      setFormError('At least one item is required for a sale.');
      return;
    }

    const saleItemsData: Omit<SaleItem, 'id' | 'sale_id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'>[] = [];
    for (const item of items) {
      if (!item.harvest_log_id || !item.quantity_sold || !item.price_per_unit) {
        setFormError('All item fields (Product, Quantity, Price) are required.');
        return;
      }
      if (isNaN(Number(item.quantity_sold)) || isNaN(Number(item.price_per_unit))) {
        setFormError('Item quantity and price must be numbers.');
        return;
      }
      // TODO: Check against available quantity from harvest log (needs careful handling for concurrent sales or edits)
      // const harvest = availableHarvests.find(h => h.id === item.harvest_log_id);
      // if (harvest && Number(item.quantity_sold) > harvest.quantity_harvested) {
      //   setFormError(`Not enough stock for ${harvest.cropName} from batch harvested on ${new Date(harvest.harvest_date).toLocaleDateString()}. Available: ${harvest.quantity_harvested}`);
      //   return;
      // }
      saleItemsData.push({
        harvest_log_id: item.harvest_log_id,
        quantity_sold: Number(item.quantity_sold),
        price_per_unit: Number(item.price_per_unit),
        notes: item.notes,
      });
    }

    const saleData = {
      sale_date: saleDate,
      customer_id: customerId || undefined,
      notes: notes.trim() || undefined,
    };

    await onSubmit(saleData, saleItemsData);
  };
  
  const calculateTotal = () => {
    return items.reduce((sum, item) => {
        const quantity = Number(item.quantity_sold);
        const price = Number(item.price_per_unit);
        return sum + (isNaN(quantity) || isNaN(price) ? 0 : quantity * price);
    }, 0);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {initialData ? 'Edit Sale' : 'Record New Sale'}
        </h2>

        {showCustomerForm && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-[60] flex justify-center items-center">
            <CustomerForm 
              onSubmit={handleCustomerSubmit}
              onCancel={() => setShowCustomerForm(false)}
              isSubmitting={false} /* Independent submission state for this sub-form */
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm mb-3 p-2 bg-red-50 rounded">{formError}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="saleDate" className="block text-sm font-medium text-gray-700">
                Sale Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="saleDate"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="customerId" className="block text-sm font-medium text-gray-700">Customer (Optional)</label>
              <div className="flex items-center space-x-2">
                <select
                  id="customerId"
                  value={customerId || ''}
                  onChange={(e) => setCustomerId(e.target.value || undefined)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  disabled={isSubmitting}
                >
                  <option value="">Select a Customer</option>
                  {availableCustomers.map(cust => (
                    <option key={cust.id} value={cust.id}>{cust.name}</option>
                  ))}
                </select>
                <button 
                  type="button" 
                  onClick={() => setShowCustomerForm(true)}
                  className="mt-1 px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  title="Add New Customer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t mt-4">
            <h3 className="text-lg font-medium text-gray-900">Sale Items</h3>
            {items.map((item, index) => (
              <div key={item.key} className="p-3 border rounded-md space-y-2 bg-gray-50 relative">
                {items.length > 1 && (
                     <button 
                        type="button" 
                        onClick={() => removeItem(index)}
                        className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1"
                        title="Remove Item"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <label htmlFor={`itemHarvest-${index}`} className="block text-xs font-medium text-gray-700">Product (Harvest Log) <span className="text-red-500">*</span></label>
                    <select
                      id={`itemHarvest-${index}`}
                      value={item.harvest_log_id || ''}
                      onChange={(e) => handleItemChange(index, 'harvest_log_id', e.target.value)}
                      className="mt-1 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-xs"
                      required
                      disabled={isSubmitting}
                    >
                      <option value="">Select Harvested Product</option>
                      {availableHarvests.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.cropName} (Harvested: {new Date(h.harvest_date).toLocaleDateString()}) - Qty: {h.quantity_harvested} {h.quantity_unit}
                        </option>
                      ))}
                    </select>
                    {item.harvest_log_id && item.availableQuantity !== undefined && <p className="text-xs text-gray-500 mt-0.5">Available: {item.availableQuantity}</p>}
                  </div>
                  <div>
                    <label htmlFor={`itemQty-${index}`} className="block text-xs font-medium text-gray-700">Quantity <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      id={`itemQty-${index}`}
                      value={item.quantity_sold || ''}
                      onChange={(e) => handleItemChange(index, 'quantity_sold', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="mt-1 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-xs"
                      required
                      disabled={isSubmitting}
                      step="any"
                    />
                  </div>
                  <div>
                    <label htmlFor={`itemPrice-${index}`} className="block text-xs font-medium text-gray-700">Price/Unit <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      id={`itemPrice-${index}`}
                      value={item.price_per_unit || ''}
                      onChange={(e) => handleItemChange(index, 'price_per_unit', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="mt-1 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-xs"
                      required
                      disabled={isSubmitting}
                      step="0.01"
                    />
                  </div>
                   <div className="md:col-span-1">
                        <label htmlFor={`itemNotes-${index}`} className="block text-xs font-medium text-gray-700">Item Notes</label>
                        <input
                            type="text"
                            id={`itemNotes-${index}`}
                            value={item.notes || ''}
                            onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                            className="mt-1 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-xs"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>
              </div>
            ))}
            <button 
              type="button" 
              onClick={addItem}
              className="mt-2 px-3 py-1.5 border border-dashed border-green-400 text-sm font-medium rounded-md text-green-700 hover:bg-green-50 focus:outline-none"
              disabled={isSubmitting}
            >
              + Add Item
            </button>
          </div>
          
          <div className="pt-4 border-t">
            <label htmlFor="saleNotes" className="block text-sm font-medium text-gray-700">Overall Sale Notes</label>
            <textarea
              id="saleNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <h3 className="text-xl font-semibold text-gray-800">
                Total: ${calculateTotal().toFixed(2)}
            </h3>
            <div className="flex items-center space-x-3">
                <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 disabled:opacity-50"
                >
                Cancel
                </button>
                <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                {isSubmitting ? (initialData ? 'Saving...' : 'Recording Sale...') : (initialData ? 'Save Changes' : 'Record Sale')}
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}