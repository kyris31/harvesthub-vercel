'use client';

import React, { useState, useEffect } from 'react';
import { PlantingLog, SeedBatch, db } from '@/lib/db';

interface PlantingLogFormProps {
  initialData?: PlantingLog | null;
  onSubmit: (data: Omit<PlantingLog, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'> | PlantingLog) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function PlantingLogForm({ initialData, onSubmit, onCancel, isSubmitting }: PlantingLogFormProps) {
  const [seedBatchId, setSeedBatchId] = useState<string | undefined>(undefined);
  const [plantingDate, setPlantingDate] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [quantityPlanted, setQuantityPlanted] = useState<number | ''>('');
  const [quantityUnit, setQuantityUnit] = useState('');
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('');
  const [notes, setNotes] = useState('');
  
  const [availableSeedBatches, setAvailableSeedBatches] = useState<(SeedBatch & { cropName?: string })[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [batches, crops] = await Promise.all([
          db.seedBatches.toArray(),
          db.crops.toArray()
        ]);
        const batchesWithCropNames = batches.map(batch => {
          const crop = crops.find(c => c.id === batch.crop_id);
          return { ...batch, cropName: crop ? crop.name : 'Unknown Crop' };
        });
        setAvailableSeedBatches(batchesWithCropNames);
      } catch (error) {
        console.error("Failed to fetch form data for planting logs", error);
        setFormError("Could not load seed batches data.");
      }
    };
    fetchFormData();

    if (initialData) {
      setSeedBatchId(initialData.seed_batch_id);
      setPlantingDate(initialData.planting_date ? initialData.planting_date.split('T')[0] : '');
      setLocationDescription(initialData.location_description || '');
      setQuantityPlanted(initialData.quantity_planted ?? '');
      setQuantityUnit(initialData.quantity_unit || '');
      setExpectedHarvestDate(initialData.expected_harvest_date ? initialData.expected_harvest_date.split('T')[0] : '');
      setNotes(initialData.notes || '');
    } else {
      // Reset form
      setSeedBatchId(undefined);
      setPlantingDate('');
      setLocationDescription('');
      setQuantityPlanted('');
      setQuantityUnit('');
      setExpectedHarvestDate('');
      setNotes('');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!plantingDate || quantityPlanted === '') {
      setFormError('Planting Date and Quantity Planted are required.');
      return;
    }
    // Validate quantityPlanted - if it's not an empty string (checked on L69), it must be a number.
    if (isNaN(quantityPlanted as number)) { // Cast to number as TS might not infer perfectly after L69
        setFormError('Quantity planted must be a valid number.');
        return;
    }

    const logData = {
      seed_batch_id: seedBatchId || undefined,
      planting_date: plantingDate,
      location_description: locationDescription.trim() || undefined,
      quantity_planted: Number(quantityPlanted),
      quantity_unit: quantityUnit.trim() || undefined,
      expected_harvest_date: expectedHarvestDate || undefined,
      notes: notes.trim() || undefined,
    };

    if (initialData?.id) {
      await onSubmit({ ...initialData, ...logData });
    } else {
      await onSubmit(logData);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {initialData ? 'Edit Planting Log' : 'Record New Planting'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}

          <div>
            <label htmlFor="seedBatchId" className="block text-sm font-medium text-gray-700">Seed Batch (Optional)</label>
            <select
              id="seedBatchId"
              value={seedBatchId || ''}
              onChange={(e) => setSeedBatchId(e.target.value || undefined)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              disabled={isSubmitting}
            >
              <option value="">Select a Seed Batch (Optional)</option>
              {availableSeedBatches.map(batch => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_code} ({batch.cropName} - Qty: {batch.initial_quantity} {batch.quantity_unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="plantingDate" className="block text-sm font-medium text-gray-700">
              Planting Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="plantingDate"
              value={plantingDate}
              onChange={(e) => setPlantingDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="locationDescription" className="block text-sm font-medium text-gray-700">Location (e.g., Field A, Row 5)</label>
            <input
              type="text"
              id="locationDescription"
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantityPlanted" className="block text-sm font-medium text-gray-700">
                Quantity Planted <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="quantityPlanted"
                value={quantityPlanted}
                onChange={(e) => setQuantityPlanted(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                required
                disabled={isSubmitting}
                step="any"
              />
            </div>
            <div>
              <label htmlFor="quantityUnit" className="block text-sm font-medium text-gray-700">Unit (e.g., seeds, seedlings)</label>
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
            <label htmlFor="expectedHarvestDate" className="block text-sm font-medium text-gray-700">Expected Harvest Date</label>
            <input
              type="date"
              id="expectedHarvestDate"
              value={expectedHarvestDate}
              onChange={(e) => setExpectedHarvestDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              disabled={isSubmitting}
            />
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
              {isSubmitting ? (initialData ? 'Saving...' : 'Recording...') : (initialData ? 'Save Changes' : 'Record Planting')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}