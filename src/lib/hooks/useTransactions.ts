import { useState, useEffect, useCallback } from "react";
import { getPaginatedTransactions, type TransactionItem } from "../api/transactions";

export function useTransactions(userId: string | undefined) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchBatch = useCallback(async (cursor: string | null) => {
    if (!userId) return null;
    try {
      const data = await getPaginatedTransactions(userId, 100, cursor);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transactions");
      return null;
    }
  }, [userId]);

  const loadInitial = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setTransactions([]);
    setError(null);

    let currentCursor: string | null = null;
    let accumulated: TransactionItem[] = [];
    let shouldContinue = true;

    // Fetch up to 15 batches of 100
    for (let i = 0; i < 15 && shouldContinue; i++) {
      const data = await fetchBatch(currentCursor);
      if (data) {
        accumulated = [...accumulated, ...data.items];
        currentCursor = data.nextCursor;
        if (!currentCursor || data.items.length < 100) {
          shouldContinue = false;
        }
      } else {
        shouldContinue = false;
      }
    }

    setTransactions(accumulated);
    setNextCursor(currentCursor);
    setHasMore(!!currentCursor);
    setLoading(false);
  }, [userId, fetchBatch]);

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore || !userId || !nextCursor) return;
    setLoading(true);

    let currentCursor: string | null = nextCursor;
    let accumulated: TransactionItem[] = [];
    let stopFetching = false;

    for (let i = 0; i < 15 && !stopFetching; i++) {
      const data = await fetchBatch(currentCursor);
      if (data) {
        accumulated = [...accumulated, ...data.items];
        currentCursor = data.nextCursor;
        if (!currentCursor || data.items.length < 100) {
          stopFetching = true;
        }
      } else {
        stopFetching = true;
      }
    }

    if (accumulated.length > 0) {
      setTransactions(prev => [...prev, ...accumulated]);
    }
    setNextCursor(currentCursor);
    setHasMore(!!currentCursor);
    setLoading(false);
  }, [loading, hasMore, userId, nextCursor, fetchBatch]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return { transactions, loading, error, hasMore, fetchMore };
}
