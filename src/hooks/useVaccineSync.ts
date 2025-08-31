import { useState, useEffect } from 'react';
import { listVaccines } from '../services/vaccineService';

export function useVaccineSync() {
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateTrigger] = useState(0);

  const refreshVaccines = async () => {
    try {
      setLoading(true);
      const vaccineList = await listVaccines();
      setVaccines(vaccineList || []);
    } catch (error) {
      console.error('Error refreshing vaccines:', error);
      setVaccines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshVaccines();
  }, [updateTrigger]);

  useEffect(() => {
    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vaccines_db') {
        refreshVaccines();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check for changes every 5 seconds as a fallback
    const interval = setInterval(() => {
      refreshVaccines();
    }, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return { vaccines, setVaccines, refreshVaccines, updateTrigger, loading };
}
