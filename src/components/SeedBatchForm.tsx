'use client';

import React, { useState, useEffect } from 'react';
import { SeedBatch, Crop, db } from '@/lib/db';

interface SeedBatchFormProps {
  initialData?: SeedBatch | null;
  onSubmit: (data: Omit<SeedBatch, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'> | SeedBatch) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function SeedBatchForm({ initialData, onSubmit, onCancel, isSubmitting }: SeedBatchFormProps) {
  const [cropId, setCropId] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [initialQuantity, setInitialQuantity] = useState<number | ''>('');
  const [quantityUnit, setQuantityUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [availableCrops, setAvailableCrops] = useState<Crop[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const crops = await db.crops.toArray();
        setAvailableCrops(crops);
      } catch (error) {
        console.error("Failed to fetch crops for form", error);
        setFormError("Could not load crops data.");
      }
    };
    fetchCrops();

    if (initialData) {
      setCropId(initialData.crop_id);
      setBatchCode(initialData.batch_code);
      setSupplier(initialData.supplier || '');
      setPurchaseDate(initialData.purchase_date ? initialData.purchase_date.split('T')[0] : '');
      setInitialQuantity(initialData.initial_quantity ?? '');
      setQuantityUnit(initialData.quantity_unit || '');
      setNotes(initialData.notes || '');
    } else {
      // Reset form
      setCropId('');
      setBatchCode('');
      setSupplier('');
      setPurchaseDate('');
      setInitialQuantity('');
      setQuantityUnit('');
      setNotes('');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!cropId || !batchCode.trim() || initialQuantity === '') {
      setFormError('Crop, Batch Code, and Initial Quantity are required.');
      return;
    }
    // Ensure initialQuantity is a number before isNaN check if it's not empty
    // The check `initialQuantity === ''` on line 61 already handles the empty string case.
    // So, if we reach here, initialQuantity is a number.
    if (isNaN(initialQuantity)) { // initialQuantity is confirmed to be 'number' here by TS if it passed the L61 check
        setFormError('Initial quantity must be a valid number.');
        return;
    }


    const seedBatchData = {
      crop_id: cropId,
      batch_code: batchCode.trim(),
      supplier: supplier.trim() || undefined,
      purchase_date: purchaseDate || undefined,
      initial_quantity: Number(initialQuantity),
      quantity_unit: quantityUnit.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (initialData?.id) {
      await onSubmit({ ...initialData, ...seedBatchData });
    } else {
      await onSubmit(seedBatchData);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {initialData ? 'Edit Seed Batch' : 'Add New Seed Batch'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}

          <div>
            <label htmlFor="cropId" className="block text-sm font-medium text-gray-700">
              Crop <span className="text-red-500">*</span>
            </label>
            <select
              id="cropId"
              value={cropId}
              onChange={(e) => setCropId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              required
              disabled={isSubmitting || availableCrops.length === 0}
            >
              <option value="">Select a Crop</option>
              {availableCrops.map(crop => (
                <option key={crop.id} value={crop.id}>{crop.name} ({crop.type || 'N/A'})</option>
              ))}
            </select>
            {availableCrops.length === 0 && <p className="text-xs text-gray-500 mt-1">No crops available. Please add a crop first.</p>}
          </div>

          <div>
            <label htmlFor="batchCode" className="block text-sm font-medium text-gray-700">
              Batch Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="batchCode"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              required
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
          
          <div className="grid grid-cols-2 gap-4">
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
              <label htmlFor="quantityUnit" className="block text-sm font-medium text-gray-700">Unit (e.g., seeds, g, kg)</label>
              <input
                type="text"
                id="quantityUnit"
                value={quantityUnit}
                onChange={(e) => setQuantityUnit(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                disabled={isSubmitting}
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
              disabled={isSubmitting || (availableCrops.length === 0 && !initialData)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isSubmitting ? (initialData ? 'Saving...' : 'Adding...') : (initialData ? 'Save Changes' : 'Add Seed Batch')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}