import Link from 'next/link';
import React, { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/crops', label: 'Crops' },
  { href: '/planting', label: 'Planting Logs' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/cultivation', label: 'Cultivation' },
  { href: '/harvests', label: 'Harvests' },
  { href: '/sales', label: 'Sales' },
  { href: '/reports', label: 'Reports' },
];

interface NavigationProps {
  isOnline: boolean;
  syncing: boolean;
  lastSyncStatus: string | null; // e.g., "Success", "Failed", "Syncing..."
  onManualSync: () => Promise<void>;
}

export default function Navigation({ isOnline, syncing, lastSyncStatus, onManualSync }: NavigationProps) {
  const [manualSyncMessage, setManualSyncMessage] = useState<string | null>(null);

  const handleSyncClick = async () => {
    setManualSyncMessage("Syncing...");
    try {
      await onManualSync();
      setManualSyncMessage("Sync successful!");
    } catch (error) {
      setManualSyncMessage("Sync failed. Check console.");
      console.error("Manual sync error:", error);
    }
    setTimeout(() => setManualSyncMessage(null), 3000);
  };

  return (
    <nav className="bg-green-700 p-4 text-white">
      <div className="container mx-auto flex flex-wrap justify-between items-center">
        <Link href="/" className="text-xl font-bold mb-2 sm:mb-0">
          Hurvesthub
        </Link>
        <ul className="flex flex-wrap space-x-2 sm:space-x-4 mb-2 sm:mb-0">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="hover:bg-green-600 px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center space-x-3">
            <button
                onClick={handleSyncClick}
                disabled={syncing || !isOnline}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400
                            ${isOnline ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}
                            ${syncing ? 'opacity-50 cursor-wait' : ''}`}
            >
                {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <div className="text-xs sm:text-sm">
                <span className={`mr-1 px-2 py-0.5 rounded-full text-xs ${isOnline ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                </span>
                {manualSyncMessage && <span className="ml-1 text-yellow-300">{manualSyncMessage}</span>}
                {!manualSyncMessage && lastSyncStatus && <span className="ml-1">{lastSyncStatus}</span>}
            </div>
        </div>
      </div>
    </nav>
  );
}