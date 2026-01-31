import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import {
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  DollarSign,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const { lang } = useLanguage();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.getAdminDashboard();
      return response.data;
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: async () => {
      const response = await api.adminGetOrders({ limit: 5 });
      return response.data || [];
    },
  });

  const { data: recentTopups } = useQuery({
    queryKey: ['recent-topups'],
    queryFn: async () => {
      const response = await api.adminGetTopups({ status: 'pending', limit: 5 });
      return response.data || [];
    },
  });

  const statCards = [
    {
      title: lang === 'en' ? 'Total Products' : 'Tổng sản phẩm',
      value: stats?.products || 0,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: lang === 'en' ? 'Total Orders' : 'Tổng đơn hàng',
      value: stats?.orders || 0,
      icon: ShoppingCart,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: lang === 'en' ? 'Total Users' : 'Tổng người dùng',
      value: stats?.users || 0,
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: lang === 'en' ? 'Pending Topups' : 'Chờ duyệt nạp tiền',
      value: stats?.pendingTopups || 0,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          {lang === 'en' ? 'Dashboard' : 'Tổng quan'}
        </h1>
        <p className="text-muted-foreground">
          {lang === 'en' ? 'Welcome back, Admin!' : 'Chào mừng trở lại, Admin!'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? [...Array(4)].map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-6">
                  <Skeleton className="h-10 w-10 rounded-lg mb-4" />
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-4 w-28" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Card key={stat.title} className="border-border/50">
                <CardContent className="p-6">
                  <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-4`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Revenue Card */}
      <Card className="border-border/50 gradient-primary text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 mb-1">
                {lang === 'en' ? 'Total Revenue' : 'Tổng doanh thu'}
              </p>
              {isLoading ? (
                <Skeleton className="h-10 w-40 bg-primary-foreground/20" />
              ) : (
                <p className="text-4xl font-bold">
                  {formatCurrency(stats?.revenue || 0, 'VND', lang)}
                </p>
              )}
            </div>
            <div className="h-16 w-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <DollarSign className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {lang === 'en' ? 'Recent Orders' : 'Đơn hàng gần đây'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {order.profile?.full_name || order.profile?.email || 'User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(order.total_amount, order.currency, lang)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {lang === 'en' ? 'No recent orders' : 'Chưa có đơn hàng'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pending Topups */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {lang === 'en' ? 'Pending Topups' : 'Yêu cầu nạp tiền chờ duyệt'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTopups && recentTopups.length > 0 ? (
              <div className="space-y-4">
                {recentTopups.map((topup: any) => (
                  <div key={topup.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {topup.profile?.full_name || topup.profile?.email || 'User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {topup.method} • {topup.topup_code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-success">
                        +{formatCurrency(topup.amount, 'VND', lang)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {lang === 'en' ? 'No pending topups' : 'Không có yêu cầu chờ duyệt'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
