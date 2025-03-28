import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * A hook that provides access to the current landlordId from the auth context
 * @returns {{landlordId: string | null, isLoading: boolean, isSandboxUser: boolean}}
 * An object containing the landlordId, loading state, and whether the user is a sandbox user
 */
export const useLandlordId = () => {
  const { user } = useAuth();
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLandlordId = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setLandlordId(userDoc.data().landlordId);
        } else {
          setError('User document not found');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLandlordId();
  }, [user]);

  return { landlordId, loading, error };
}; 