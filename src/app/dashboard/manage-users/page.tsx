"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import { useLandlordId } from "../../../lib/hooks/useLandlordId";
import Navigation from "../../../components/Navigation";
import { Users, Trash2, UserPlus, Send } from "lucide-react";
import logger from "../../../lib/logger";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { AlertMessage } from "../../../components/ui/alert-message";
import { db } from '../../../lib/firebase/firebase';
import { inviteUser, removeUserAccess } from '../../../lib/firebase/firestoreUtils';
import { UserProfile } from "@/types";
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ManageUsersPage() {
  const { user, loading } = useAuth();
  const { landlordId } = useLandlordId();
  const router = useRouter();
  const [authorizedUsers, setAuthorizedUsers] = useState<UserProfile[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const fetchAuthorizedUsers = useCallback(async () => {
    if (!user || !landlordId) return;
    setIsFetchingUsers(true);
    setAuthorizedUsers([]);
    try {
      logger.info(`ManageUsersPage: Fetching users for landlord ${landlordId}...`);
      const usersCollectionRef = collection(db, 'users');
      const q = query(usersCollectionRef, where('landlordId', '==', landlordId));
      const querySnapshot = await getDocs(q);

      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProfile[];

      logger.info(`ManageUsersPage: Found ${usersList.length} users.`);
      setAuthorizedUsers(usersList);
    } catch (error) {
      logger.error('ManageUsersPage: Failed to fetch authorized users', {
        component: 'ManageUsersPage',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setFormError("Failed to load current users. Please refresh the page.");
    } finally {
      setIsFetchingUsers(false);
    }
  }, [user, landlordId]);

  useEffect(() => {
    if (user && landlordId) {
      fetchAuthorizedUsers();
    }
  }, [user, landlordId, fetchAuthorizedUsers]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!newUserEmail.trim()) {
      setFormError('Please fill in the email address');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(newUserEmail)) {
       setFormError('Please enter a valid email address');
       return;
    }

    try {
      logger.info(`ManageUsersPage: Attempting to invite user ${newUserEmail} for landlord ${landlordId}`);
      await inviteUser(landlordId, newUserEmail, 'user');

      setFormSuccess(`Invitation sent successfully to ${newUserEmail}.`);
      setNewUserEmail('');
    } catch (error) {
       logger.error('ManageUsersPage: Failed to invite user', {
         component: 'ManageUsersPage',
         error: error instanceof Error ? error.message : 'Unknown error'
       });
       setFormError(error instanceof Error ? error.message : 'Failed to send invitation. Please try again.');
    }
  };

  const handleRemoveUser = async (emailToRemove: string) => {
    if (!emailToRemove) return;

     if (!confirm(`Are you sure you want to remove access for ${emailToRemove}? This action cannot be undone.`)) {
       return;
     }

    try {
       logger.info(`ManageUsersPage: Attempting to remove user ${emailToRemove}`);
      await removeUserAccess(emailToRemove);

      setAuthorizedUsers(prevUsers => prevUsers.filter(u => u.email.toLowerCase() !== emailToRemove.toLowerCase()));
      setFormSuccess(`Successfully removed access for ${emailToRemove}.`);
      setFormError(null);
    } catch (error) {
      logger.error('ManageUsersPage: Failed to remove user access', {
        component: 'ManageUsersPage',
        email: emailToRemove,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setFormError(error instanceof Error ? error.message : 'Failed to remove user. Please try again.');
      setFormSuccess(null);
    }
  };

  if (loading || !landlordId) {
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
      
      <div className="md:ml-64 p-4 pt-20 md:pt-4">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <CardTitle className="text-2xl">Manage Users</CardTitle>
                <CardDescription>Invite new users and manage access for your account.</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <UserPlus className="h-6 w-6 text-blue-500" />
                <CardTitle>Invite New User</CardTitle>
              </div>
               <CardDescription>Enter the email address of the user you want to grant access to.</CardDescription>
            </CardHeader>
            <CardContent>
              {formError && (
                <AlertMessage
                  variant="error"
                  message={formError}
                  className="mb-4"
                />
              )}
              {formSuccess && (
                 <AlertMessage
                   variant="success"
                   message={formSuccess}
                   className="mb-4"
                 />
               )}

              <form onSubmit={handleInviteUser} className="space-y-4">
                <div className="space-y-2">
                   <label htmlFor="newUserEmail" className="block text-sm font-medium text-gray-700">
                     Email Address
                   </label>
                   <Input
                     type="email"
                     id="newUserEmail"
                     value={newUserEmail}
                     onChange={(e) => setNewUserEmail(e.target.value)}
                     placeholder="john@example.com"
                     className="w-full"
                     required
                   />
                 </div>
                <Button
                  type="submit"
                  variant="default"
                  size="default"
                  className="w-full bg-[#1F2937] hover:bg-[#111827] text-white transition-colors"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authorized Users</CardTitle>
              <CardDescription>
                Users who currently have access to this landlord account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFetchingUsers ? (
                 <div className="flex justify-center items-center py-8">
                   <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                 </div>
               ) : (
                 <div className="divide-y divide-gray-200">
                   {authorizedUsers.map((authUser) => (
                     <div
                       key={authUser.id}
                       className="py-4 flex justify-between items-center hover:bg-gray-50 px-4 -mx-4 first:hover:rounded-t-lg last:hover:rounded-b-lg"
                     >
                       <div>
                         <p className="text-sm font-medium text-gray-900">{authUser.email}</p>
                         <p className="text-sm text-gray-500 capitalize">Role: {authUser.role || 'User'}</p>
                       </div>
                       {user.email?.toLowerCase() !== authUser.email.toLowerCase() ? (
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleRemoveUser(authUser.email)}
                           className="text-red-600 hover:text-red-700 hover:bg-red-50"
                           aria-label={`Remove access for ${authUser.email}`}
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       ) : (
                         <span className="text-xs text-gray-400 pr-2">(You)</span>
                       )}
                     </div>
                   ))}
                   {authorizedUsers.length === 0 && (
                     <div className="py-8 text-center">
                       <Users className="mx-auto h-12 w-12 text-gray-400" />
                       <p className="mt-2 text-sm font-medium text-gray-900">No other authorized users</p>
                       <p className="text-sm text-gray-500">
                         Invite users using the form above.
                       </p>
                     </div>
                   )}
                 </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 