// app/dashboard/tenants/add/page.tsx

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addTenant } from '@/lib/firebase/firestoreUtils';
import { Tenant } from '@/types';
import { Input } from '@/components/ui/input'; // Shadcn UI Input
import { Button } from '@/components/ui/button'; // Shadcn UI Button
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'; // Shadcn UI Card
import logger from '@/lib/logger';


const AddTenantPage = () => {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [adhaarNumber, setAdhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [currentEmployer, setCurrentEmployer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    if (!firstName || !lastName || !email || !countryCode || !mobileNumber || !adhaarNumber) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    const tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'> = {
      firstName,
      lastName,
      email,
      phoneNumber: { countryCode, mobileNumber },
      adhaarNumber,
      panNumber,
      permanentAddress,
      currentEmployer,
    };

    try {
      const tenantId = await addTenant(tenantData);
      setSuccessMessage(`Tenant "${firstName} ${lastName}" added successfully! Tenant ID: ${tenantId}`);
      // router.push('/dashboard/tenants');
      resetForm();
    } catch (dbError: any) {
      logger.error("AddTenantPage: Error adding tenant to Firestore:", dbError);
      setError(dbError.message || 'Failed to add tenant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setCountryCode('');
    setMobileNumber('');
    setAdhaarNumber('');
    setPanNumber('');
    setPermanentAddress('');
    setCurrentEmployer('');
    setError(null);
    setSuccessMessage(null);
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };


  // IMPROVE STYLING ONCE ALL FUNCTIONALITY WORKS 
  return (
    <Card> {/* Shadcn UI Card */}
      <CardHeader> {/* Shadcn UI CardHeader */}
        <CardTitle>Add New Tenant</CardTitle> {/* Shadcn UI CardTitle */}
      </CardHeader>
      <CardContent> {/* Shadcn UI CardContent */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-500">{error}</div>}
          {successMessage && <div className="text-green-500">{successMessage}</div>}

          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <Input // Shadcn UI Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" // Example Tailwind classes - Shadcn Input is unstyled by default
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <Input // Shadcn UI Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input // Shadcn UI Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex space-x-2">
            <div>
              <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700">
                Country Code
              </label>
              <Input // Shadcn UI Input
                id="countryCode"
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                required
                className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700">
                Mobile Number
              </label>
              <Input // Shadcn UI Input
                id="mobileNumber"
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="adhaarNumber" className="block text-sm font-medium text-gray-700">
              Adhaar Number
            </label>
            <Input // Shadcn UI Input
              id="adhaarNumber"
              type="text"
              value={adhaarNumber}
              onChange={(e) => setAdhaarNumber(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="panNumber" className="block text-sm font-medium text-gray-700">
              PAN Number (Optional)
            </label>
            <Input // Shadcn UI Input
              id="panNumber"
              type="text"
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="permanentAddress" className="block text-sm font-medium text-gray-700">
              Permanent Address (Optional)
            </label>
            <Input // Shadcn UI Input - No multiline in Shadcn Input, use Textarea if needed or customize Input
              id="permanentAddress"
              type="text"
              value={permanentAddress}
              onChange={(e) => setPermanentAddress(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="currentEmployer" className="block text-sm font-medium text-gray-700">
              Current Employer (Optional)
            </label>
            <Input // Shadcn UI Input
              id="currentEmployer"
              type="text"
              value={currentEmployer}
              onChange={(e) => setCurrentEmployer(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <Button type="submit" disabled={loading} loading={loading}> {/* Shadcn UI Button */}
            {loading ? 'Adding Tenant...' : 'Add Tenant'}
          </Button>
        </form>
      </CardContent> {/* Shadcn UI CardContent */}
    </Card>  // {/* Shadcn UI Card */}
  );
};

export default AddTenantPage;