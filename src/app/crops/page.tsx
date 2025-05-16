'use client'; // This will be a client component to interact with local DB and state

import React, { useState, useEffect } from 'react';
import { db, Crop } from '@/lib/db';
import CropList from '@/components/CropList';
import CropForm from '@/components/CropForm';

export default function CropsPage() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Store ID of crop being deleted

  // Removed the initial useEffect for fetchCrops as fetchCropsAndUpdateState covers it.

  const fetchCropsAndUpdateState = async () => {
    setIsLoading(true);
    try {
      // Filter out soft-deleted items at the source
      const allCrops = await db.crops
        .where('is_deleted').equals(0) // Corrected to .equals(0) for active items
        .orderBy('_last_modified')
        .reverse()
        .toArray();
      setCrops(allCrops);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch crops:", err);
      setError("Failed to load crops. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCropsAndUpdateState();
  }, []);


  const handleFormSubmit = async (data: Omit<Crop, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'> | Crop) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if ('id' in data && data.id) { // Editing existing crop
        const updatedCrop: Partial<Crop> = {
          name: data.name,
          type: data.type,
          updated_at: new Date().toISOString(),
          _synced: 0, // Mark as unsynced
          _last_modified: Date.now(),
        };
        await db.crops.update(data.id, updatedCrop);
      } else { // Adding new crop
        const now = new Date().toISOString();
        const newCropData: Omit<Crop, 'id'> = {
          name: data.name,
          type: data.type,
          created_at: now,
          updated_at: now,
          _synced: 0, // Mark as unsynced
          _last_modified: Date.now(),
          is_deleted: 0, // Default to not deleted
          deleted_at: undefined, // Ensure it's not set
        };
        // Dexie's add method doesn't need the full Crop object from db.addCropAndMark if we handle ID generation here
        // Since we use UUIDs, we should generate it before adding.
        const id = crypto.randomUUID();
        await db.crops.add({ ...newCropData, id });
      }
      await fetchCropsAndUpdateState(); // Re-fetch all crops to update list
      setShowForm(false);
      setEditingCrop(null);
    } catch (err) {
      console.error("Failed to save crop:", err);
      setError("Failed to save crop. Please ensure the name is unique if applicable and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (crop: Crop) => {
    setEditingCrop(crop);
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this crop? This action cannot be undone locally immediately.")) {
      setIsDeleting(id);
      setError(null);
      try {
        // Perform soft delete
        await db.markForSync(db.crops, id, true);
        await fetchCropsAndUpdateState(); // Re-fetch to update the list (excluding soft-deleted)
      } catch (err) {
        console.error("Failed to delete crop:", err);
        setError("Failed to delete crop.");
      } finally {
        setIsDeleting(null);
      }
    }
  };


  if (isLoading) {
    return <p>Loading crops...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div>
      <header className="bg-white shadow mb-6">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Crop Management</h1>
          <button
            onClick={() => { setEditingCrop(null); setShowForm(true); setError(null); }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow-sm transition-colors duration-150"
          >
            Add New Crop
          </button>
        </div>
      </header>

      {showForm && (
        <CropForm
          initialData={editingCrop}
          onSubmit={handleFormSubmit}
          onCancel={() => { setShowForm(false); setEditingCrop(null); setError(null);}}
          isSubmitting={isSubmitting}
        />
      )}

      <div className="mt-4">
        {isLoading && <p className="text-center text-gray-500">Loading crops...</p>}
        {!isLoading && !error && (
          <CropList
            crops={crops}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        )}
        {!isLoading && crops.length === 0 && !error && (
           <div className="text-center py-10">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No crops</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new crop.</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => { setEditingCrop(null); setShowForm(true); setError(null); }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {/* PlusIcon */}
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add New Crop
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}