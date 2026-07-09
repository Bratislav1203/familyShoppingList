import { useState, useEffect } from 'react';
import { listenShoppingItems } from '../services/shoppingService';
import type { ShoppingItem } from '../types';

interface ShoppingItemsState {
  items: ShoppingItem[];
  loading: boolean;
  error: string | null;
}

export function useShoppingItems(familyId: string | null): ShoppingItemsState {
  const [state, setState] = useState<ShoppingItemsState>({ items: [], loading: true, error: null });

  useEffect(() => {
    if (!familyId) {
      setState({ items: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsub = listenShoppingItems(familyId, (items) => {
      setState({ items, loading: false, error: null });
    });
    return unsub;
  }, [familyId]);

  return state;
}
