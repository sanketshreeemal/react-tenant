"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import Navigation from "../../../components/Navigation";
import { RentalInventory } from "@/types";
import { addRentalInventory, getAllRentalInventory, updateRentalInventory, deleteRentalInventory } from "@/lib/firebase/firestoreUtils";

export default function RentalInventoryManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = useState<RentalInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalInventory | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Form state
  const [unitNumber, setUnitNumber] = useState("");
  const [propertyType, setPropertyType] = useState<"Commercial" | "Residential">("Residential");
  const [ownerDetails, setOwnerDetails] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    } else if (user) {
      loadInventoryData();
    }
  }, [user, loading, router]);
  
  const loadInventoryData = async () => {
    try {
      setIsLoading(true);
      const data = await getAllRentalInventory();
      setInventoryItems(data);
    } catch (error: any) {
      console.error("Error loading inventory data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const openAddForm = () => {
    setEditingItem(null);
    resetForm();
    setIsFormOpen(true);
  };
  
  const openEditForm = (item: RentalInventory) => {
    setEditingItem(item);
    setUnitNumber(item.unitNumber);
    setPropertyType(item.propertyType);
    setOwnerDetails(item.ownerDetails);
    setBankDetails(item.bankDetails || "");
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };
  
  const resetForm = () => {
    setUnitNumber("");
    setPropertyType("Residential");
    setOwnerDetails("");
    setBankDetails("");
    setFormError(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!unitNumber.trim()) {
      setFormError("Unit Number is required");
      return;
    }
    
    if (!ownerDetails.trim()) {
      setFormError("Owner Details are required");
      return;
    }
    
    try {
      const inventoryData = {
        unitNumber: unitNumber.trim(),
        propertyType,
        ownerDetails: ownerDetails.trim(),
        bankDetails: bankDetails.trim() || undefined,
      };
      
      if (editingItem && editingItem.id) {
        await updateRentalInventory(editingItem.id, inventoryData);
      } else {
        await addRentalInventory(inventoryData);
      }
      
      await loadInventoryData(); // Reload data
      closeForm();
    } catch (error: any) {
      setFormError(error.message || "An error occurred while saving the inventory item");
    }
  };
  
  const handleDelete = async (itemId: string) => {
    if (confirm("Are you sure you want to delete this inventory item? This action cannot be undone.")) {
      try {
        await deleteRentalInventory(itemId);
        await loadInventoryData(); // Reload data
      } catch (error: any) {
        console.error("Error deleting inventory item:", error);
        alert(error.message || "An error occurred while deleting the inventory item");
      }
    }
  };
  
  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="md:ml-64 p-4">
        <header className="bg-white shadow rounded-lg mb-6">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Rental Inventory Management</h1>
            <button
              onClick={openAddForm}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Add Rental Unit
            </button>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto">
          {/* Inventory Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Number
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bank Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventoryItems.length > 0 ? (
                    inventoryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.unitNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.propertyType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.ownerDetails}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.bankDetails || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditForm(item)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => item.id && handleDelete(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                        No rental inventory items found. Click "Add Rental Unit" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      
      {/* Add/Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={closeForm}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {editingItem ? "Edit Rental Unit" : "Add Rental Unit"}
                </h3>
                
                {formError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
                    {formError}
                  </div>
                )}
                
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="unitNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Number *
                    </label>
                    <input
                      type="text"
                      id="unitNumber"
                      value={unitNumber}
                      onChange={(e) => setUnitNumber(e.target.value)}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="e.g., 101 or HSR2"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-1">
                      Property Type *
                    </label>
                    <select
                      id="propertyType"
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value as "Commercial" | "Residential")}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      required
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="ownerDetails" className="block text-sm font-medium text-gray-700 mb-1">
                      Owner Details *
                    </label>
                    <textarea
                      id="ownerDetails"
                      value={ownerDetails}
                      onChange={(e) => setOwnerDetails(e.target.value)}
                      rows={3}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter owner name, contact info, etc."
                      required
                    ></textarea>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="bankDetails" className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Details (Optional)
                    </label>
                    <textarea
                      id="bankDetails"
                      value={bankDetails}
                      onChange={(e) => setBankDetails(e.target.value)}
                      rows={3}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter bank account info, IFSC code, etc."
                    ></textarea>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={closeForm}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-500 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {editingItem ? "Update" : "Add"} Unit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 