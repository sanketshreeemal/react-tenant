"use client";

import React, { useEffect, useState } from 'react';
import { withLandlordAuth } from '@/lib/hoc/withLandlordAuth';
import { useLandlordId } from '@/lib/hooks/useLandlordId';
import { getAllRentalInventory } from '@/lib/firebase/firestoreUtils';
import { RentalInventory } from '@/types';

function ExamplePage() {
  const { landlordId } = useLandlordId();
  const [inventory, setInventory] = useState<RentalInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!landlordId) return;
      
      try {
        setLoading(true);
        const data = await getAllRentalInventory(landlordId);
        setInventory(data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching inventory:', err);
        setError(err.message || 'Failed to fetch rental inventory');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [landlordId]);

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <h1 className="text-2xl font-bold mb-4">Multi-Tenant Example</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Rental Inventory</h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 p-4 rounded-lg text-red-800">
            <p>{error}</p>
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-gray-500 py-4">
            <p>No rental inventory items found. Add some to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="py-2 px-4 text-left">Unit Number</th>
                  <th className="py-2 px-4 text-left">Property Type</th>
                  <th className="py-2 px-4 text-left">Owner Details</th>
                  <th className="py-2 px-4 text-left">Group</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{item.unitNumber}</td>
                    <td className="py-2 px-4">{item.propertyType}</td>
                    <td className="py-2 px-4">{item.ownerDetails}</td>
                    <td className="py-2 px-4">{item.groupName || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="mt-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-semibold">Technical Details</h3>
        <p className="mt-2 text-gray-700">
          This component demonstrates how to use the <code>useLandlordId</code> hook to access the current landlord ID
          and fetch data specific to that landlord. The data is fetched from the Firestore subcollection 
          <code>landlords/{landlordId}/rental-inventory</code>.
        </p>
        
        <div className="mt-4 bg-gray-700 text-white p-3 rounded overflow-x-auto">
          <pre className="text-sm">
            <code>{`
// Get the landlordId from the context
const { landlordId } = useLandlordId();

// Use it in your data fetching
const data = await getAllRentalInventory(landlordId);
            `}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default withLandlordAuth(ExamplePage); 