'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db, SeedBatch, Crop } from '@/lib/db';
import SeedBatchList from '@/components/SeedBatchList';
import SeedBatchForm from '@/components/SeedBatchForm';

export default function SeedBatchesPage() {
  const [seedBatches, setSeedBatches] = useState<SeedBatch[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSeedBatch, setEditingSeedBatch] = useState<SeedBatch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sBatchesData, crpsData] = await Promise.all([
        db.seedBatches.where('is_deleted').equals(0).orderBy('_last_modified').reverse().toArray(),
        db.crops.where('is_deleted').equals(0).orderBy('name').toArray()
      ]);
      setSeedBatches(sBatchesData);
      setCrops(crpsData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load seed batches or crops. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormSubmit = async (data: Omit<SeedBatch, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'> | SeedBatch) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      if ('id' in data && data.id) { // Editing existing
        const updatedSeedBatch: Partial<SeedBatch> = {
          ...data,
          updated_at: now,
          _synced: 0,
          _last_modified: Date.now(),
        };
        await db.seedBatches.update(data.id, updatedSeedBatch);
      } else { // Adding new
        const newSeedBatchData: Omit<SeedBatch, 'id'> = {
          ...(data as Omit<SeedBatch, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'>),
          created_at: now,
          updated_at: now,
          _synced: 0,
          _last_modified: Date.now(),
          is_deleted: 0,
          deleted_at: undefined,
        };
        const id = crypto.randomUUID();
        await db.seedBatches.add({ ...newSeedBatchData, id });
      }
      await fetchData();
      setShowForm(false);
      setEditingSeedBatch(null);
    } catch (err: any) {
      console.error("Failed to save seed batch:", err);
      if (err.name === 'ConstraintError') {
        setError("Failed to save seed batch. The Batch Code might already exist. Please use a unique Batch Code.");
      } else {
        setError("Failed to save seed batch. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (seedBatch: SeedBatch) => {
    setEditingSeedBatch(seedBatch);
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this seed batch? This may affect associated planting logs.")) {
      setIsDeleting(id);
      setError(null);
      try {
        await db.markForSync(db.seedBatches, id, true);
        // Consider implications for related data (e.g., planting logs using this batch)
        // Soft delete here doesn't automatically cascade to planting_logs' seed_batch_id if it's just a string ref.
        // The UI for planting logs would show "Unknown Batch" or similar if the batch is soft-deleted.
        await fetchData();
      } catch (err) {
        console.error("Failed to delete seed batch:", err);
        setError("Failed to delete seed batch.");
      } finally {
        setIsDeleting(null);
      }
    }
  };

  return (
    <div>
      <header className="bg-white shadow mb-6">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Seed Batch Inventory</h1>
          <button
            onClick={() => { setEditingSeedBatch(null); setShowForm(true); setError(null); }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow-sm transition-colors duration-150"
          >
            Add New Seed Batch
          </button>
        </div>
      </header>

      {showForm && (
        <SeedBatchForm
          initialData={editingSeedBatch}
          onSubmit={handleFormSubmit}
          onCancel={() => { setShowForm(false); setEditingSeedBatch(null); setError(null);}}
          isSubmitting={isSubmitting}
        />
      )}

      <div className="mt-4">
        {error && <p className="text-red-500 mb-4 p-3 bg-red-100 rounded-md">{error}</p>}
        {isLoading && <p className="text-center text-gray-500">Loading seed batches...</p>}
        {!isLoading && !error && (
          <SeedBatchList
            seedBatches={seedBatches}
            crops={crops}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        )}
        {!isLoading && seedBatches.length === 0 && !error && (
           <div className="text-center py-10">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No seed batches</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new seed batch.</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => { setEditingSeedBatch(null); setShowForm(true); setError(null); }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add New Seed Batch
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}