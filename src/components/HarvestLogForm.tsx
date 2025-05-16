'use client';

import React, { useState, useEffect } from 'react';
import { HarvestLog, PlantingLog, SeedBatch, Crop, db } from '@/lib/db';

interface HarvestLogFormProps {
  initialData?: HarvestLog | null;
  onSubmit: (data: Omit<HarvestLog, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'> | HarvestLog) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function HarvestLogForm({ initialData, onSubmit, onCancel, isSubmitting }: HarvestLogFormProps) {
  const [plantingLogId, setPlantingLogId] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [quantityHarvested, setQuantityHarvested] = useState<number | ''>('');
  const [quantityUnit, setQuantityUnit] = useState('');
  const [qualityGrade, setQualityGrade] = useState('');
  const [notes, setNotes] = useState('');
  
  const [availablePlantingLogs, setAvailablePlantingLogs] = useState<(PlantingLog & { cropName?: string; seedBatchCode?: string })[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [pLogs, sBatches, crps] = await Promise.all([
          db.plantingLogs.orderBy('planting_date').reverse().toArray(), // Show recent first
          db.seedBatches.toArray(),
          db.crops.toArray()
        ]);

        const enrichedPlantingLogs = pLogs.map(pl => {
          let cropName = 'N/A';
          let seedBatchCode = 'N/A';
          if (pl.seed_batch_id) {
            const sBatch = sBatches.find(sb => sb.id === pl.seed_batch_id);
            if (sBatch) {
              seedBatchCode = sBatch.batch_code;
              const crop = crps.find(c => c.id === sBatch.crop_id);
              if (crop) cropName = crop.name;
            }
          }
          return { ...pl, cropName, seedBatchCode };
        });
        setAvailablePlantingLogs(enrichedPlantingLogs);
      } catch (error) {
        console.error("Failed to fetch form data for harvest logs", error);
        setFormError("Could not load planting logs data.");
      }
    };
    fetchFormData();

    if (initialData) {
      setPlantingLogId(initialData.planting_log_id);
      setHarvestDate(initialData.harvest_date ? initialData.harvest_date.split('T')[0] : '');
      setQuantityHarvested(initialData.quantity_harvested ?? '');
      setQuantityUnit(initialData.quantity_unit);
      setQualityGrade(initialData.quality_grade || '');
      setNotes(initialData.notes || '');
    } else {
      // Reset form
      setPlantingLogId('');
      setHarvestDate('');
      setQuantityHarvested('');
      setQuantityUnit('');
      setQualityGrade('');
      setNotes('');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!plantingLogId || !harvestDate || quantityHarvested === '' || !quantityUnit.trim()) {
      setFormError('Planting Log, Harvest Date, Quantity Harvested, and Unit are required.');
      return;
    }
    // Validate quantityHarvested - if it's not an empty string (checked on L77), it must be a number.
    if (isNaN(quantityHarvested as number)) { // Cast to number as TS might not infer perfectly after L77
        setFormError('Quantity Harvested must be a valid number.');
        return;
    }

    const logData = {
      planting_log_id: plantingLogId,
      harvest_date: harvestDate,
      quantity_harvested: Number(quantityHarvested),
      quantity_unit: quantityUnit.trim(),
      quality_grade: qualityGrade.trim() || undefined,
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
          {initialData ? 'Edit Harvest Log' : 'Record New Harvest'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}

          <div>
            <label htmlFor="plantingLogId" className="block text-sm font-medium text-gray-700">
              Planting Log <span className="text-red-500">*</span>
            </label>
            <select
              id="plantingLogId"
              value={plantingLogId}
              onChange={(e) => setPlantingLogId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              required
              disabled={isSubmitting || availablePlantingLogs.length === 0}
            >
              <option value="">Select a Planting Log</option>
              {availablePlantingLogs.map(pl => (
                <option key={pl.id} value={pl.id}>
                  {new Date(pl.planting_date).toLocaleDateString()} - {pl.cropName} (Batch: {pl.seedBatchCode}) - Loc: {pl.location_description || 'N/A'}
                </option>
              ))}
            </select>
            {availablePlantingLogs.length === 0 && <p className="text-xs text-gray-500 mt-1">No planting logs available. Please add one first.</p>}
          </div>

          <div>
            <label htmlFor="harvestDate" className="block text-sm font-medium text-gray-700">
              Harvest Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="harvestDate"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantityHarvested" className="block text-sm font-medium text-gray-700">
                Quantity Harvested <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="quantityHarvested"
                value={quantityHarvested}
                onChange={(e) => setQuantityHarvested(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                required
                disabled={isSubmitting}
                step="any"
              />
            </div>
            <div>
              <label htmlFor="quantityUnit" className="block text-sm font-medium text-gray-700">
                Unit <span className="text-red-500">*</span> (e.g., kg, pieces, bunches)
              </label>
              <input
                type="text"
                id="quantityUnit"
                value={quantityUnit}
                onChange={(e) => setQuantityUnit(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="qualityGrade" className="block text-sm font-medium text-gray-700">Quality Grade (Optional)</label>
            <input
              type="text"
              id="qualityGrade"
              value={qualityGrade}
              onChange={(e) => setQualityGrade(e.target.value)}
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
              disabled={isSubmitting || (availablePlantingLogs.length === 0 && !initialData)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isSubmitting ? (initialData ? 'Saving...' : 'Recording...') : (initialData ? 'Save Changes' : 'Record Harvest')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}