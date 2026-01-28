import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface NhhtoolUserInfo {
  status: 'success' | 'error';
  username?: string;
  total_money?: number;
  message?: string;
}

interface NhhtoolBuyResponse {
  status: 'success' | 'error';
  msg?: string;
  transaction_code?: string;
}

interface NhhtoolActiveKeyResponse {
  status: 'success' | 'error';
  message?: string;
  msg?: string;
  transaction_code?: string;
  key?: string;
}

interface NhhtoolHistoryItem {
  status: string;
  transaction_code: string;
  title: string;
}

interface NhhtoolHistoryResponse {
  status: 'success' | 'error';
  history?: NhhtoolHistoryItem[];
  message?: string;
}

interface NhhtoolTransactionDetail {
  status: 'success' | 'error';
  data?: {
    title: string;
    key: string;
    expried: string;
    link_down: string;
  };
  message?: string;
}

async function callNhhtoolApi<T>(action: string, params?: Record<string, string>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('nhhtool-proxy', {
    body: { action, ...params },
  });

  if (error) {
    throw new Error(error.message || 'API call failed');
  }

  return data as T;
}

export function useNhhtoolUserInfo() {
  return useQuery({
    queryKey: ['nhhtool', 'userinfo'],
    queryFn: () => callNhhtoolApi<NhhtoolUserInfo>('userinfo'),
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}

export function useNhhtoolHistory() {
  return useQuery({
    queryKey: ['nhhtool', 'history'],
    queryFn: () => callNhhtoolApi<NhhtoolHistoryResponse>('history'),
    staleTime: 30000,
    retry: 2,
  });
}

export function useNhhtoolTransactionDetail(transactionCode: string | null) {
  return useQuery({
    queryKey: ['nhhtool', 'transaction', transactionCode],
    queryFn: () => 
      callNhhtoolApi<NhhtoolTransactionDetail>('history', { 
        transaction_code: transactionCode! 
      }),
    enabled: !!transactionCode,
    staleTime: 60000,
  });
}

export function useNhhtoolBuyTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (toolId: string) => 
      callNhhtoolApi<NhhtoolBuyResponse>('buytool', { tool_id: toolId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nhhtool', 'userinfo'] });
      queryClient.invalidateQueries({ queryKey: ['nhhtool', 'history'] });
    },
  });
}

export function useNhhtoolActiveKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => 
      callNhhtoolApi<NhhtoolActiveKeyResponse>('activekey', { key }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nhhtool', 'history'] });
    },
  });
}
