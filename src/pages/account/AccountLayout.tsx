import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { User, Wallet, Package, CreditCard, Settings, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const accountLinks = [
  { path: '/account', icon: User, labelKey: 'account.profile', exact: true },
  { path: '/account/wallet', icon: Wallet, labelKey: 'nav.wallet' },
  { path: '/account/purchases', icon: Package, labelKey: 'nav.purchases' },
  { path: '/account/topups', icon: CreditCard, labelKey: 'topup.history' },
];

export default function AccountLayout() {
  const { profile } = useAuth();
  const { t, lang } = useLanguage();
  const location = useLocation();
  const { user } = useAuth();

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile card */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile?.avatarUrl || undefined} />
                    <AvatarFallback className="gradient-primary text-primary-foreground text-xl">
                      {profile?.fullName?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">
                      {profile?.fullName || lang === 'en' ? 'User' : 'Người dùng'}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {profile?.email}
                    </p>
                  </div>
                </div>

                {/* Wallet balance */}
                {wallet && (
                  <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10">
                    <p className="text-sm text-muted-foreground mb-1">{t('wallet.balance')}</p>
                    <p className="text-2xl font-bold gradient-text">
                      {formatCurrency(wallet.balance, 'USD', lang)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <Card className="border-border/50">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {accountLinks.map((link) => {
                    const isActive = link.exact
                      ? location.pathname === link.path
                      : location.pathname.startsWith(link.path);
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <link.icon className="h-5 w-5" />
                        {t(link.labelKey)}
                        <ChevronRight className="ml-auto h-4 w-4" />
                      </Link>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <Outlet />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
