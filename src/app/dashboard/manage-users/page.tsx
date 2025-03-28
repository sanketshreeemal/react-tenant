"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import { useLandlordId } from "../../../lib/hooks/useLandlordId";
import Navigation from "../../../components/Navigation";
import { Users, Trash2, UserPlus } from "lucide-react";
import logger from "../../../lib/logger";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { AlertMessage } from "../../../components/ui/alert-message";
import { db } from '../../../lib/firebase/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface AdminAccess {
  id?: string;
  name: string;
  email: string;
}

export default function ManageUsersPage() {
  const { user, loading } = useAuth();
  const { landlordId } = useLandlordId();
  const router = useRouter();
  const [adminAccess, setAdminAccess] = useState<AdminAccess[]>([]);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [recipientError, setRecipientError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchAdminAccess = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, `landlords/${landlordId}/adminAccess`));
        const recipients = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AdminAccess[];
        setAdminAccess(recipients);
      } catch (error) {
        logger.error('Failed to fetch admin access', {
          component: 'ManageUsersPage',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    if (user && landlordId) {
      fetchAdminAccess();
    }
  }, [user, landlordId]);

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecipientError(null);

    if (!newRecipientName.trim() || !newRecipientEmail.trim()) {
      setRecipientError('Please fill in both name and email');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, `landlords/${landlordId}/adminAccess`), {
        name: newRecipientName,
        email: newRecipientEmail,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const newRecipient = {
        id: docRef.id,
        name: newRecipientName,
        email: newRecipientEmail
      };

      setAdminAccess([...adminAccess, newRecipient]);
      setNewRecipientName('');
      setNewRecipientEmail('');
    } catch (error) {
      setRecipientError('Failed to add user. Please try again.');
    }
  };

  const handleRemoveRecipient = async (recipientId: string) => {
    try {
      await deleteDoc(doc(db, `landlords/${landlordId}/adminAccess`, recipientId));
      setAdminAccess(adminAccess.filter(r => r.id !== recipientId));
    } catch (error) {
      logger.error('Failed to remove admin access', {
        component: 'ManageUsersPage',
        recipientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  if (loading) {
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
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <CardTitle className="text-2xl">Manage Users</CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <UserPlus className="h-6 w-6 text-blue-500" />
                <div>
                  <CardTitle>Add New User</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {recipientError && (
                <AlertMessage
                  variant="error"
                  message={recipientError}
                  className="mb-4"
                />
              )}

              <form onSubmit={handleAddRecipient} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <Input
                      type="text"
                      id="recipientName"
                      value={newRecipientName}
                      onChange={(e) => setNewRecipientName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <Input
                      type="email"
                      id="recipientEmail"
                      value={newRecipientEmail}
                      onChange={(e) => setNewRecipientEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="default"
                  size="default"
                  className="w-full bg-[#1F2937] hover:bg-[#111827] text-white transition-colors"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authorized Users</CardTitle>
              <CardDescription>
                Users who currently have access to the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-200">
                {adminAccess.map((recipient) => (
                  <div 
                    key={recipient.id} 
                    className="py-4 flex justify-between items-center hover:bg-gray-50 px-4 -mx-4 first:hover:rounded-t-lg last:hover:rounded-b-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{recipient.name}</p>
                      <p className="text-sm text-gray-500">{recipient.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => recipient.id && handleRemoveRecipient(recipient.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {adminAccess.length === 0 && (
                  <div className="py-8 text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm font-medium text-gray-900">No authorized users</p>
                    <p className="text-sm text-gray-500">
                      Add users to give them access to the application
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 