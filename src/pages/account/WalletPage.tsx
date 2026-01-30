import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate } from '@/lib/i18n';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react';

export default function WalletPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const response = await api.getWalletBalance();
      return response.data;
    },
    enabled: !!user,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: async () => {
      const response = await api.getWalletTransactions({ limit: 20 });
      return response.data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card className="border-border/50 overflow-hidden">
        <div className="gradient-primary p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm mb-1">
                {t('wallet.balance')}
              </p>
              {walletLoading ? (
                <Skeleton className="h-10 w-40 bg-primary-foreground/20" />
              ) : (
                <p className="text-4xl font-bold text-primary-foreground">
                  {formatCurrency(walletData?.balance || 0, 'VND', lang)}
                </p>
              )}
            </div>
            <div className="h-16 w-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
        </div>
        <CardContent className="p-4">
          <Link to="/account/topups/new">
            <Button className="w-full gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity">
              <Plus className="mr-2 h-5 w-5" />
              {t('wallet.topUp')}
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>{t('wallet.transactions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      tx.type === 'credit'
                        ? 'bg-success/20 text-success'
                        : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    {tx.type === 'credit' ? (
                      <ArrowDownLeft className="h-5 w-5" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {tx.type === 'credit' ? t('wallet.credit') : t('wallet.debit')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tx.note || tx.ref_type || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(tx.created_at, lang)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        tx.type === 'credit' ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {tx.type === 'credit' ? '+' : '-'}
                      {formatCurrency(tx.amount, 'VND', lang)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lang === 'en' ? 'Balance:' : 'Số dư:'} {formatCurrency(tx.balance_after, 'VND', lang)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('wallet.noTransactions')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
