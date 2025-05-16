'use client';

import React, { useState, useEffect } from 'react';
import { CultivationLog, PlantingLog, InputInventory, SeedBatch, Crop, db } from '@/lib/db';

interface CultivationLogFormProps {
  initialData?: CultivationLog | null;
  onSubmit: (data: Omit<CultivationLog, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'> | CultivationLog) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function CultivationLogForm({ initialData, onSubmit, onCancel, isSubmitting }: CultivationLogFormProps) {
  const [plantingLogId, setPlantingLogId] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [activityType, setActivityType] = useState('');
  const [inputInventoryId, setInputInventoryId] = useState<string | undefined>(undefined);
  const [inputQuantityUsed, setInputQuantityUsed] = useState<number | ''>('');
  const [inputQuantityUnit, setInputQuantityUnit] = useState('');
  const [notes, setNotes] = useState('');
  
  const [availablePlantingLogs, setAvailablePlantingLogs] = useState<(PlantingLog & { cropName?: string; seedBatchCode?: string })[]>([]);
  const [availableInputs, setAvailableInputs] = useState<InputInventory[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [pLogs, sBatches, crps, inputs] = await Promise.all([
          db.plantingLogs.toArray(),
          db.seedBatches.toArray(),
          db.crops.toArray(),
          db.inputInventory.orderBy('name').toArray()
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
        setAvailableInputs(inputs);

      } catch (error) {
        console.error("Failed to fetch form data for cultivation logs", error);
        setFormError("Could not load planting logs or inputs data.");
      }
    };
    fetchFormData();

    if (initialData) {
      setPlantingLogId(initialData.planting_log_id);
      setActivityDate(initialData.activity_date ? initialData.activity_date.split('T')[0] : '');
      setActivityType(initialData.activity_type);
      setInputInventoryId(initialData.input_inventory_id || undefined);
      setInputQuantityUsed(initialData.input_quantity_used ?? '');
      setInputQuantityUnit(initialData.input_quantity_unit || '');
      setNotes(initialData.notes || '');
    } else {
      // Reset form
      setPlantingLogId('');
      setActivityDate('');
      setActivityType('');
      setInputInventoryId(undefined);
      setInputQuantityUsed('');
      setInputQuantityUnit('');
      setNotes('');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!plantingLogId || !activityDate || !activityType.trim()) {
      setFormError('Planting Log, Activity Date, and Activity Type are required.');
      return;
    }
    if (inputQuantityUsed !== '' && isNaN(inputQuantityUsed)) {
        setFormError('Input Quantity Used must be a number if provided.');
        return;
    }
    if (inputInventoryId && (inputQuantityUsed === '' || !inputQuantityUnit.trim())) {
        setFormError('If an input is selected, Quantity Used and Unit are required.');
        return;
    }
     if (!inputInventoryId && (inputQuantityUsed !== '' || inputQuantityUnit.trim())) {
        setFormError('Quantity Used and Unit should only be filled if an input is selected.');
        return;
    }


    const logData = {
      planting_log_id: plantingLogId,
      activity_date: activityDate,
      activity_type: activityType.trim(),
      input_inventory_id: inputInventoryId || undefined,
      input_quantity_used: inputQuantityUsed === '' ? undefined : Number(inputQuantityUsed),
      input_quantity_unit: inputQuantityUnit.trim() || undefined,
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
          {initialData ? 'Edit Cultivation Log' : 'Record Cultivation Activity'}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="activityDate" className="block text-sm font-medium text-gray-700">
                Activity Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="activityDate"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="activityType" className="block text-sm font-medium text-gray-700">
                Activity Type <span className="text-red-500">*</span> (e.g., Weeding, Watering)
              </label>
              <input
                type="text"
                id="activityType"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <hr className="my-2"/>
          <p className="text-sm text-gray-600">Input Used (Optional):</p>

          <div>
            <label htmlFor="inputInventoryId" className="block text-sm font-medium text-gray-700">Input Item</label>
            <select
              id="inputInventoryId"
              value={inputInventoryId || ''}
              onChange={(e) => setInputInventoryId(e.target.value || undefined)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              disabled={isSubmitting}
            >
              <option value="">Select an Input (Optional)</option>
              {availableInputs.map(input => (
                <option key={input.id} value={input.id}>
                  {input.name} ({input.type || 'N/A'}) - Stock: {input.current_quantity} {input.quantity_unit || ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="inputQuantityUsed" className="block text-sm font-medium text-gray-700">Quantity Used</label>
              <input
                type="number"
                id="inputQuantityUsed"
                value={inputQuantityUsed}
                onChange={(e) => setInputQuantityUsed(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                disabled={isSubmitting || !inputInventoryId}
                step="any"
              />
            </div>
            <div>
              <label htmlFor="inputQuantityUnit" className="block text-sm font-medium text-gray-700">Unit</label>
              <input
                type="text"
                id="inputQuantityUnit"
                value={inputQuantityUnit}
                onChange={(e) => setInputQuantityUnit(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                disabled={isSubmitting || !inputInventoryId}
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
              disabled={isSubmitting || (availablePlantingLogs.length === 0 && !initialData)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isSubmitting ? (initialData ? 'Saving...' : 'Recording...') : (initialData ? 'Save Changes' : 'Record Activity')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}