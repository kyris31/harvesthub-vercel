'use client';

import React, { useState, useEffect } from 'react';
import { Crop } from '@/lib/db';

interface CropFormProps {
  initialData?: Crop | null;
  onSubmit: (data: Omit<Crop, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'> | Crop) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function CropForm({ initialData, onSubmit, onCancel, isSubmitting }: CropFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type || '');
    } else {
      setName('');
      setType('');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Crop name is required.');
      return;
    }

    const cropData = {
      name: name.trim(),
      type: type.trim() || undefined, // Store as undefined if empty, consistent with optional field
    };

    if (initialData) {
      await onSubmit({ ...initialData, ...cropData });
    } else {
      await onSubmit(cropData);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          {initialData ? 'Edit Crop' : 'Add New Crop'}
        </h2>
        <form onSubmit={handleSubmit}>
          {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}
          <div className="mb-4">
            <label htmlFor="cropName" className="block text-sm font-medium text-gray-700 mb-1">
              Crop Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="cropName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="cropType" className="block text-sm font-medium text-gray-700 mb-1">
              Crop Type (e.g., Fruit, Vegetable, Herb)
            </label>
            <input
              type="text"
              id="cropType"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center justify-end space-x-3">
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
              {isSubmitting ? (initialData ? 'Saving...' : 'Adding...') : (initialData ? 'Save Changes' : 'Add Crop')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}