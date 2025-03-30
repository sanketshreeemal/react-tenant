import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * A hook that provides access to the current landlordId from the auth context
 * @returns {{landlordId: string | null, isLoading: boolean}}
 * An object containing the landlordId and loading state
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
          const userData = userDoc.data();
          setLandlordId(userData.landlordId);
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