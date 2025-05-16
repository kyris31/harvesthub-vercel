'use client';

import React from 'react';
import { Crop } from '@/lib/db';

interface CropListProps {
  crops: Crop[];
  onEdit: (crop: Crop) => void;
  onDelete: (id: string) => Promise<void>;
  isDeleting: string | null; // ID of crop being deleted, or null
}

export default function CropList({ crops, onEdit, onDelete, isDeleting }: CropListProps) {
  const activeCrops = crops.filter(crop => crop.is_deleted !== 1);

  if (activeCrops.length === 0) {
    return <p className="text-center text-gray-500 mt-8">No active crops found. Add your first crop to get started!</p>;
  }

  return (
    <div className="overflow-x-auto shadow-md rounded-lg">
      <table className="min-w-full bg-white">
        <thead className="bg-green-600 text-white">
          <tr>
            <th className="text-left py-3 px-5 uppercase font-semibold text-sm">Name</th>
            <th className="text-left py-3 px-5 uppercase font-semibold text-sm">Type</th>
            <th className="text-left py-3 px-5 uppercase font-semibold text-sm">Last Modified</th>
            <th className="text-center py-3 px-5 uppercase font-semibold text-sm">Synced</th>
            <th className="text-center py-3 px-5 uppercase font-semibold text-sm">Actions</th>
          </tr>
        </thead>
        <tbody className="text-gray-700">
          {activeCrops.map((crop) => (
            <tr key={crop.id} className="border-b border-gray-200 hover:bg-green-50 transition-colors duration-150">
              <td className="py-3 px-5">{crop.name}</td>
              <td className="py-3 px-5">{crop.type || <span className="text-gray-400">N/A</span>}</td>
              <td className="py-3 px-5 text-sm">
                {crop._last_modified ? new Date(crop._last_modified).toLocaleString() : (crop.updated_at ? new Date(crop.updated_at).toLocaleString() : 'N/A')}
              </td>
              <td className="py-3 px-5 text-center">
                {crop._synced === 0 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                ) : crop._synced === 1 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Synced
                  </span>
                ) : (
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Unknown
                  </span>
                )}
              </td>
              <td className="py-3 px-5 text-center">
                <button
                  onClick={() => onEdit(crop)}
                  className="text-blue-600 hover:text-blue-800 font-medium mr-3 transition-colors duration-150"
                  disabled={isDeleting === crop.id}
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(crop.id)}
                  className="text-red-600 hover:text-red-800 font-medium transition-colors duration-150 disabled:opacity-50"
                  disabled={isDeleting === crop.id}
                >
                  {isDeleting === crop.id ? 'Deleting...' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}