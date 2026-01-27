import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExchangeRateResponse {
  success: boolean;
  from: string;
  to: string;
  rate: number;
  date?: string;
  error?: string;
}

export function useExchangeRate(from = 'USD', to = 'VND') {
  return useQuery({
    queryKey: ['exchange-rate', from, to],
    queryFn: async (): Promise<ExchangeRateResponse> => {
      const { data, error } = await supabase.functions.invoke('get-exchange-rate', {
        body: { from, to },
      });

      if (error) {
        console.error('Exchange rate error:', error);
        // Return fallback
        return { success: false, from, to, rate: 25000 };
      }

      return data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    retry: 1,
  });
}

export function convertCurrency(
  amountInCents: number,
  rate: number,
  fromCurrency = 'USD',
  toCurrency = 'VND'
): number {
  const amount = amountInCents / 100;
  if (toCurrency === 'VND') {
    return Math.round(amount * rate);
  }
  return amount;
}
