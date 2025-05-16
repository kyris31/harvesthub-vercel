'use client';

import React, { useState, useEffect } from 'react';
import { InputInventory, db } from '@/lib/db';

interface InputInventoryFormProps {
  initialData?: InputInventory | null;
  onSubmit: (data: Omit<InputInventory, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'> | InputInventory) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function InputInventoryForm({ initialData, onSubmit, onCancel, isSubmitting }: InputInventoryFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [initialQuantity, setInitialQuantity] = useState<number | ''>('');
  const [currentQuantity, setCurrentQuantity] = useState<number | ''>('');
  const [quantityUnit, setQuantityUnit] = useState('');
  const [costPerUnit, setCostPerUnit] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type || '');
      setSupplier(initialData.supplier || '');
      setPurchaseDate(initialData.purchase_date ? initialData.purchase_date.split('T')[0] : '');
      setInitialQuantity(initialData.initial_quantity ?? '');
      setCurrentQuantity(initialData.current_quantity ?? '');
      setQuantityUnit(initialData.quantity_unit || '');
      setCostPerUnit(initialData.cost_per_unit ?? '');
      setNotes(initialData.notes || '');
    } else {
      // Reset form
      setName('');
      setType('');
      setSupplier('');
      setPurchaseDate('');
      setInitialQuantity('');
      setCurrentQuantity('');
      setQuantityUnit('');
      setCostPerUnit('');
      setNotes('');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || initialQuantity === '' || currentQuantity === '') {
      setFormError('Item Name, Initial Quantity, and Current Quantity are required.');
      return;
    }

    // Validate initialQuantity - if it's not an empty string (checked on L55), it must be a number.
    // So, we only need to check if it's NaN.
    if (isNaN(initialQuantity as number)) { // Cast to number as TS might not infer perfectly after L55
        setFormError('Initial Quantity must be a valid number.');
        return;
    }

    // Validate currentQuantity - similar logic
    if (isNaN(currentQuantity as number)) { // Cast to number
        setFormError('Current Quantity must be a valid number.');
        return;
    }

    // Validate costPerUnit (if provided)
    if (costPerUnit !== '') { // Only validate if a value is entered
        if (isNaN(costPerUnit as number)) { // Cast to number
            setFormError('Cost per Unit must be a valid number if provided.');
            return;
        }
    }

    const inventoryData = {
      name: name.trim(),
      type: type.trim() || undefined,
      supplier: supplier.trim() || undefined,
      purchase_date: purchaseDate || undefined,
      initial_quantity: Number(initialQuantity),
      current_quantity: Number(currentQuantity),
      quantity_unit: quantityUnit.trim() || undefined,
      cost_per_unit: costPerUnit === '' ? undefined : Number(costPerUnit),
      notes: notes.trim() || undefined,
    };

    if (initialData?.id) {
      await onSubmit({ ...initialData, ...inventoryData });
    } else {
      await onSubmit(inventoryData);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {initialData ? 'Edit Inventory Item' : 'Add New Inventory Item'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}

          <div>
            <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="itemName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="itemType" className="block text-sm font-medium text-gray-700">Type (e.g., Fertilizer, Pesticide)</label>
            <input
              type="text"
              id="itemType"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">Supplier</label>
            <input
              type="text"
              id="supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700">Purchase Date</label>
            <input
              type="date"
              id="purchaseDate"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="initialQuantity" className="block text-sm font-medium text-gray-700">
                Initial Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="initialQuantity"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                required
                disabled={isSubmitting}
                step="any"
              />
            </div>
            <div>
              <label htmlFor="currentQuantity" className="block text-sm font-medium text-gray-700">
                Current Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="currentQuantity"
                value={currentQuantity}
                onChange={(e) => setCurrentQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                required
                disabled={isSubmitting}
                step="any"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantityUnit" className="block text-sm font-medium text-gray-700">Unit (e.g., kg, L, bags)</label>
              <input
                type="text"
                id="quantityUnit"
                value={quantityUnit}
                onChange={(e) => setQuantityUnit(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="costPerUnit" className="block text-sm font-medium text-gray-700">Cost per Unit</label>
              <input
                type="number"
                id="costPerUnit"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                disabled={isSubmitting}
                step="any"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
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
              {isSubmitting ? (initialData ? 'Saving...' : 'Adding...') : (initialData ? 'Save Changes' : 'Add Item')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}