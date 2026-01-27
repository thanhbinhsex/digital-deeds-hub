import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate } from '@/lib/i18n';
import { Search, Eye, Package } from 'lucide-react';

export default function AdminOrdersPage() {
  const { t, lang } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders', search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*, product:products(name, name_vi, image_url))
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all' && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded');
      }

      const { data: ordersData, error } = await query;
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set(ordersData?.map(o => o.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      
      return ordersData?.map(order => ({
        ...order,
        profile: profiles?.find(p => p.user_id === order.user_id)
      }));
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-warning/20 text-warning border-0',
      paid: 'bg-success/20 text-success border-0',
      completed: 'bg-success/20 text-success border-0',
      cancelled: 'bg-muted text-muted-foreground border-0',
      refunded: 'bg-destructive/20 text-destructive border-0',
    };
    return <Badge className={variants[status] || ''}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{t('admin.orders')}</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={lang === 'en' ? 'Search orders...' : 'Tìm đơn hàng...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>{lang === 'en' ? 'Customer' : 'Khách hàng'}</TableHead>
                <TableHead>{t('common.amount')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{lang === 'en' ? 'Payment' : 'Thanh toán'}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : orders && orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {order.id.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {order.profile?.full_name || 'User'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {order.profile?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        {formatCurrency(order.total_amount, order.currency, lang)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.payment_method || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(order.created_at, lang)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t('common.view')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {lang === 'en' ? 'No orders found' : 'Không tìm thấy đơn hàng'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{lang === 'en' ? 'Order Details' : 'Chi tiết đơn hàng'}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID</span>
                  <code className="text-sm">{selectedOrder.id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === 'en' ? 'Customer' : 'Khách hàng'}</span>
                  <span>{selectedOrder.profile?.full_name || selectedOrder.profile?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.status')}</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.amount')}</span>
                  <span className="font-semibold">
                    {formatCurrency(selectedOrder.total_amount, selectedOrder.currency, lang)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.date')}</span>
                  <span>{formatDate(selectedOrder.created_at, lang)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">{lang === 'en' ? 'Items' : 'Sản phẩm'}</h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {lang === 'vi' && item.product?.name_vi ? item.product.name_vi : item.product?.name || item.product_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.unit_price, selectedOrder.currency, lang)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
