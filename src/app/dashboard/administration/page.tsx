"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import { useLandlordId } from "../../../lib/hooks/useLandlordId";
import Navigation from "../../../components/Navigation";
import { Users, Trash2, UserPlus, Send, Loader2, Download } from "lucide-react";
import logger from "../../../lib/logger";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { AlertMessage } from "../../../components/ui/alert-message";
import { db } from '../../../lib/firebase/firebase';
import { inviteUser, removeUserAccess } from '../../../lib/firebase/firestoreUtils';
import { UserProfile, AllUser } from "@/types";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ManageUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const { landlordId, loading: landlordIdLoading, error: landlordIdError } = useLandlordId();
  const router = useRouter();
  const [authorizedUsers, setAuthorizedUsers] = useState<AllUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  const [isInvitingUser, setIsInvitingUser] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const fetchAuthorizedUsers = useCallback(async () => {
    if (!user || !landlordId) return;
    setIsFetchingUsers(true);
    setAuthorizedUsers([]);
    setFormError(null);
    try {
      logger.info(`ManageUsersPage: Fetching users for landlord ${landlordId}...`);
      const allUsersCollectionRef = collection(db, 'allUsers');
      const q = query(allUsersCollectionRef, where('landlordId', '==', landlordId));
      const querySnapshot = await getDocs(q);

      const usersList = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate() // Convert Firestore Timestamp to Date
      })) as AllUser[];

      logger.info(`ManageUsersPage: Found ${usersList.length} users.`);
      setAuthorizedUsers(usersList);
    } catch (error: any) {
      console.error('ManageUsersPage: Full error fetching authorized users:', error);
      logger.error('ManageUsersPage: Failed to fetch authorized users', {
        component: 'ManageUsersPage',
        errorCode: error?.code,
        errorMessage: error?.message,
        errorStack: error?.stack,
        fullError: JSON.stringify(error)
      });
      setFormError(`Failed to load authorized users. Please check console for details or try again. (Code: ${error?.code || 'UNKNOWN'})`);
    } finally {
      setIsFetchingUsers(false);
    }
  }, [user, landlordId]);

  useEffect(() => {
    if (user && landlordId && !landlordIdLoading) {
      fetchAuthorizedUsers();
    } else if (landlordIdError) {
      setFormError(`Failed to load landlord details: ${landlordIdError}`);
      setIsFetchingUsers(false);
    }
  }, [user, landlordId, landlordIdLoading, landlordIdError, fetchAuthorizedUsers]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsInvitingUser(true);

    if (!landlordId) {
       setFormError('Cannot invite user: Landlord ID missing. Please refresh.');
       setIsInvitingUser(false);
       return;
    }

    const email = newUserEmail.trim();
    const name = newUserName.trim();

    if (!name) {
      setFormError('Please enter the user\'s name');
      setIsInvitingUser(false);
      return;
    }
    if (!email) {
      setFormError('Please fill in the email address');
      setIsInvitingUser(false);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
       setFormError('Please enter a valid email address');
       setIsInvitingUser(false);
       return;
    }

    try {
      logger.info(`ManageUsersPage: Checking for existing user with email ${email} for landlord ${landlordId}`);
      const usersCollectionRef = collection(db, 'users');
      const q = query(usersCollectionRef, where('email', '==', email), where('landlordId', '==', landlordId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        logger.warn(`ManageUsersPage: User with email ${email} already exists for this landlord.`);
        setFormError(`A user with the email address ${email} already has access to this account.`);
        setIsInvitingUser(false);
        return;
      }

      logger.info(`ManageUsersPage: Attempting to invite user ${email} (Name: ${name}) for landlord ${landlordId}`);
      await inviteUser(landlordId, email, 'user', name);

      setFormSuccess(`User ${name} (${email}) added successfully. They can now sign in.`);
      setNewUserEmail('');
      setNewUserName('');
    } catch (error: any) {
       logger.error('ManageUsersPage: Failed to invite user', {
         component: 'ManageUsersPage',
         error: error instanceof Error ? error.message : 'Unknown error',
         fullError: JSON.stringify(error)
       });
       setFormError(error.message || 'Failed to add user. Please try again.');
    } finally {
      setIsInvitingUser(false);
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
      
      await fetchAuthorizedUsers();
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
      
      await fetchAuthorizedUsers();
    }
  };

  if (authLoading || landlordIdLoading || isFetchingUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user || !landlordId) {
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
                <CardTitle className="text-2xl">Administration</CardTitle>
                <CardDescription>Manage Access and Data.</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Access</CardTitle>
              <CardDescription>
                Users who currently have access to this account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="mb-6">
                <AccordionItem value="invite-new-user">
                  <AccordionTrigger className="flex items-center space-x-3">
                    <div className="flex items-center space-x-3">
                      <UserPlus className="h-6 w-6 text-blue-500" />
                      <span>Invite New User</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {formError && !formSuccess && (
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
                        <label htmlFor="newUserName" className="block text-sm font-medium text-gray-700">
                          User Name
                        </label>
                        <Input
                          type="text"
                          id="newUserName"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Enter user's full name"
                          className="w-full"
                          required
                        />
                      </div>
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
                        disabled={isInvitingUser}
                      >
                        {isInvitingUser ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        {isInvitingUser ? 'Adding User...' : 'Add User'}
                      </Button>
                      <p className="text-xs text-center text-gray-500 px-4">
                        This user will need to sign in using the exact email address provided to gain access.
                      </p>
                    </form>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {isFetchingUsers ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {authorizedUsers.map((authUser) => (
                    <div
                      key={authUser.uid}
                      className="py-4 flex justify-between items-center hover:bg-gray-50 px-4 -mx-4 first:hover:rounded-t-lg last:hover:rounded-b-lg"
                    >
                      <div>
                        {authUser.name && <p className="text-sm font-medium text-gray-900">{authUser.name}</p>}
                        <p className={`text-sm ${authUser.name ? 'text-gray-500' : 'font-medium text-gray-900'}`}>{authUser.email}</p>
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

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Manage Data</CardTitle>
                <Button 
                  variant="default"
                  size="default"
                  className="bg-[#1F2937] hover:bg-[#111827] text-white transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Database
                </Button>
              </div>
              <CardDescription>
                Download and manage your data locally.
              </CardDescription>
            </CardHeader>

          </Card>
        </div>
      </div>
    </div>
  );
} 