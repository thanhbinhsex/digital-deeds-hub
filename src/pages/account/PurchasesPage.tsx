import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate } from '@/lib/i18n';
import { Package, Download, Key, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function PurchasesPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:products(name, name_vi, image_url)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: entitlements } = useQuery({
    queryKey: ['entitlements'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('entitlements')
        .select(`
          *,
          product:products(name, name_vi, slug),
          assets:product_assets(*)
        `)
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'outline' | 'destructive'; className: string }> = {
      pending: { variant: 'outline', className: 'bg-warning/10 text-warning border-warning/30' },
      paid: { variant: 'outline', className: 'bg-success/10 text-success border-success/30' },
      completed: { variant: 'outline', className: 'bg-success/10 text-success border-success/30' },
      cancelled: { variant: 'outline', className: 'bg-muted text-muted-foreground' },
      refunded: { variant: 'destructive', className: '' },
    };
    const config = variants[status] || { variant: 'outline' as const, className: '' };
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  const handleDownload = (productId: string) => {
    const productEntitlements = entitlements?.filter((e) => e.product_id === productId);
    if (!productEntitlements || productEntitlements.length === 0) {
      toast.error(lang === 'en' ? 'No entitlement found' : 'Không tìm thấy quyền truy cập');
      return;
    }

    // For demo, just show toast - in real app, this would generate signed URL
    toast.success(
      lang === 'en'
        ? 'Download started!'
        : 'Bắt đầu tải xuống!'
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold">{t('purchases.title')}</h2>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Skeleton className="h-20 w-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('purchases.orderDate')}: {formatDate(order.created_at, lang)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ID: {order.id.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(order.status)}
                    <p className="font-semibold mt-1">
                      {formatCurrency(order.total_amount, order.currency, lang)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.order_items?.map((item: any) => {
                    const productName =
                      lang === 'vi' && item.product?.name_vi
                        ? item.product.name_vi
                        : item.product?.name || item.product_name;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {item.product?.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={productName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                              <Package className="h-6 w-6 text-primary/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{productName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.unit_price, order.currency, lang)} × {item.quantity}
                          </p>
                        </div>
                        {order.status === 'paid' || order.status === 'completed' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(item.product_id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {t('purchases.download')}
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('purchases.empty')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
