"use client";

import React, { ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { useLandlordId } from '../hooks/useLandlordId';
import { useAuth } from '../hooks/useAuth';

/**
 * Higher-order component to protect routes that require authentication and landlordId
 * @param Component The component to wrap
 * @returns A new component with authentication and landlordId protection
 */
export function withLandlordAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function WithLandlordAuthComponent(props: P) {
    const { user, loading: authLoading } = useAuth();
    const { landlordId, loading: landlordLoading } = useLandlordId();
    const router = useRouter();
    
    // Show loading state while auth state is being determined
    if (authLoading || landlordLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    // Redirect to login if not authenticated
    if (!user) {
      router.push('/');
      return null;
    }
    
    // Redirect to error page if landlordId is missing
    if (!landlordId) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p>You don&apos;t have access to this resource.</p>
            <p>Please contact your administrator.</p>
          </div>
        </div>
      );
    }
    
    // If everything is okay, render the wrapped component
    return <WrappedComponent {...props} />;
  };
} 