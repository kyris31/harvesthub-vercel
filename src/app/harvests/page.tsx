'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db, HarvestLog, PlantingLog, SeedBatch, Crop } from '@/lib/db';
import HarvestLogList from '@/components/HarvestLogList';
import HarvestLogForm from '@/components/HarvestLogForm';

export default function HarvestLogsPage() {
  const [harvestLogs, setHarvestLogs] = useState<HarvestLog[]>([]);
  const [plantingLogs, setPlantingLogs] = useState<PlantingLog[]>([]);
  const [seedBatches, setSeedBatches] = useState<SeedBatch[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<HarvestLog | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [hLogsData, pLogsData, sBatchesData, crpsData] = await Promise.all([
        db.harvestLogs.where('is_deleted').equals(0).orderBy('harvest_date').reverse().toArray(),
        db.plantingLogs.where('is_deleted').equals(0).orderBy('planting_date').reverse().toArray(),
        db.seedBatches.where('is_deleted').equals(0).orderBy('_last_modified').reverse().toArray(),
        db.crops.where('is_deleted').equals(0).orderBy('name').toArray()
      ]);
      setHarvestLogs(hLogsData);
      setPlantingLogs(pLogsData);
      setSeedBatches(sBatchesData);
      setCrops(crpsData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch harvest data:", err);
      setError("Failed to load harvest logs or related data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormSubmit = async (data: Omit<HarvestLog, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at'> | HarvestLog) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      if ('id' in data && data.id) { // Editing existing
        const updatedLog: Partial<HarvestLog> = {
          ...data,
          updated_at: now,
          _synced: 0,
          _last_modified: Date.now(),
        };
        await db.harvestLogs.update(data.id, updatedLog);
      } else { // Adding new
        const newLogData: Omit<HarvestLog, 'id'> = {
          ...(data as Omit<HarvestLog, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'>),
          created_at: now,
          updated_at: now,
          _synced: 0,
          _last_modified: Date.now(),
          is_deleted: 0,
          deleted_at: undefined,
        };
        const id = crypto.randomUUID();
        await db.harvestLogs.add({ ...newLogData, id });
      }
      await fetchData(); // Refresh list
      setShowForm(false);
      setEditingLog(null);
    } catch (err: any) {
      console.error("Failed to save harvest log:", err);
      setError("Failed to save harvest log. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (log: HarvestLog) => {
    setEditingLog(log);
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this harvest log? This may affect sales records if this harvest was sold.")) {
      setIsDeleting(id);
      setError(null);
      try {
        await db.markForSync(db.harvestLogs, id, true);
        // Deleting a harvest log could affect sales if items from this harvest were sold.
        // The sales form/list should gracefully handle missing harvest logs.
        await fetchData(); // Refresh list
      } catch (err) {
        console.error("Failed to delete harvest log:", err);
        setError("Failed to delete harvest log.");
      } finally {
        setIsDeleting(null);
      }
    }
  };

  return (
    <div>
      <header className="bg-white shadow mb-6">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Harvest Logs</h1>
          <button
            onClick={() => { setEditingLog(null); setShowForm(true); setError(null); }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow-sm transition-colors duration-150"
          >
            Record New Harvest
          </button>
        </div>
      </header>

      {showForm && (
        <HarvestLogForm
          initialData={editingLog}
          onSubmit={handleFormSubmit}
          onCancel={() => { setShowForm(false); setEditingLog(null); setError(null);}}
          isSubmitting={isSubmitting}
        />
      )}

      <div className="mt-4">
        {error && <p className="text-red-500 mb-4 p-3 bg-red-100 rounded-md">{error}</p>}
        {isLoading && <p className="text-center text-gray-500">Loading harvest logs...</p>}
        {!isLoading && !error && (
          <HarvestLogList
            harvestLogs={harvestLogs}
            plantingLogs={plantingLogs}
            seedBatches={seedBatches}
            crops={crops}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        )}
        {!isLoading && harvestLogs.length === 0 && !error && (
           <div className="text-center py-10">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v.001c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No harvest logs</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by recording a new harvest.</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => { setEditingLog(null); setShowForm(true); setError(null); }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Record New Harvest
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}