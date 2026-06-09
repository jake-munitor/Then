import { useCallback, useState } from 'react';

export function usePullToRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((current) => current + 1);
  }, []);

  const finishRefresh = useCallback(() => {
    setRefreshing(false);
  }, []);

  return { refreshing, refreshKey, onRefresh, finishRefresh };
}
