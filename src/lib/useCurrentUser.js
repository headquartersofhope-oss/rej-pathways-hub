import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } catch (_) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { user, loading };
}