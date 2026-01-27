import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Ticket, Copy } from 'lucide-react';
import { format } from 'date-fns';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
}

type DiscountType = 'percentage' | 'fixed';

const emptyCoupon = {
  code: '',
  description: '',
  discount_type: 'percentage' as DiscountType,
  discount_value: 10,
  min_order_amount: 0,
  max_discount: null as number | null,
  usage_limit: null as number | null,
  valid_from: new Date().toISOString(),
  valid_until: null as string | null,
  is_active: true,
};

export default function AdminCouponsPage() {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyCoupon);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyCoupon) => {
      const { error } = await supabase.from('coupons').insert({
        ...data,
        code: data.code.toUpperCase(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setDialogOpen(false);
      setForm(emptyCoupon);
      toast.success(lang === 'vi' ? 'Đã tạo mã giảm giá!' : 'Coupon created!');
    },
    onError: (error: any) => {
      toast.error(error.message || (lang === 'vi' ? 'Lỗi tạo mã' : 'Error creating coupon'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof emptyCoupon> }) => {
      const { error } = await supabase.from('coupons').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setDialogOpen(false);
      setEditingCoupon(null);
      setForm(emptyCoupon);
      toast.success(lang === 'vi' ? 'Đã cập nhật mã giảm giá!' : 'Coupon updated!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success(lang === 'vi' ? 'Đã xóa mã giảm giá!' : 'Coupon deleted!');
    },
  });

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type as 'percentage' | 'fixed',
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount,
      max_discount: coupon.max_discount,
      usage_limit: coupon.usage_limit,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      is_active: coupon.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.code.trim()) {
      toast.error(lang === 'vi' ? 'Vui lòng nhập mã giảm giá' : 'Please enter coupon code');
      return;
    }
    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(lang === 'vi' ? 'Đã sao chép mã!' : 'Code copied!');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ticket className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{lang === 'vi' ? 'Mã Giảm Giá' : 'Coupons'}</h1>
            <p className="text-muted-foreground">{lang === 'vi' ? 'Quản lý mã giảm giá' : 'Manage discount coupons'}</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingCoupon(null);
            setForm(emptyCoupon);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {lang === 'vi' ? 'Thêm Mã' : 'Add Coupon'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? (lang === 'vi' ? 'Sửa Mã Giảm Giá' : 'Edit Coupon') : (lang === 'vi' ? 'Thêm Mã Giảm Giá' : 'Add Coupon')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{lang === 'vi' ? 'Mã Giảm Giá' : 'Coupon Code'} *</Label>
                  <Input 
                    value={form.code} 
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} 
                    placeholder="VD: SALE20"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'vi' ? 'Loại Giảm Giá' : 'Discount Type'}</Label>
                  <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{lang === 'vi' ? 'Phần trăm (%)' : 'Percentage (%)'}</SelectItem>
                      <SelectItem value="fixed">{lang === 'vi' ? 'Số tiền cố định' : 'Fixed Amount'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'vi' ? 'Giá Trị Giảm' : 'Discount Value'}</Label>
                  <Input 
                    type="number" 
                    value={form.discount_value} 
                    onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'vi' ? 'Đơn Tối Thiểu (cents)' : 'Min Order (cents)'}</Label>
                  <Input 
                    type="number" 
                    value={form.min_order_amount} 
                    onChange={e => setForm({ ...form, min_order_amount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'vi' ? 'Giảm Tối Đa (cents)' : 'Max Discount (cents)'}</Label>
                  <Input 
                    type="number" 
                    value={form.max_discount || ''} 
                    onChange={e => setForm({ ...form, max_discount: e.target.value ? Number(e.target.value) : null })}
                    placeholder={lang === 'vi' ? 'Không giới hạn' : 'No limit'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'vi' ? 'Số Lần Sử Dụng' : 'Usage Limit'}</Label>
                  <Input 
                    type="number" 
                    value={form.usage_limit || ''} 
                    onChange={e => setForm({ ...form, usage_limit: e.target.value ? Number(e.target.value) : null })}
                    placeholder={lang === 'vi' ? 'Không giới hạn' : 'No limit'}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{lang === 'vi' ? 'Mô Tả' : 'Description'}</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={checked => setForm({ ...form, is_active: checked })} />
                <Label>{lang === 'vi' ? 'Kích hoạt' : 'Active'}</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {lang === 'vi' ? 'Hủy' : 'Cancel'}
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCoupon ? (lang === 'vi' ? 'Cập Nhật' : 'Update') : (lang === 'vi' ? 'Tạo Mã' : 'Create')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === 'vi' ? 'Mã' : 'Code'}</TableHead>
                <TableHead>{lang === 'vi' ? 'Giảm Giá' : 'Discount'}</TableHead>
                <TableHead>{lang === 'vi' ? 'Đã Dùng' : 'Used'}</TableHead>
                <TableHead>{lang === 'vi' ? 'Trạng Thái' : 'Status'}</TableHead>
                <TableHead className="text-right">{lang === 'vi' ? 'Thao Tác' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {lang === 'vi' ? 'Chưa có mã giảm giá' : 'No coupons yet'}
                  </TableCell>
                </TableRow>
              )}
              {coupons?.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold text-primary">{coupon.code}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(coupon.code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {coupon.description && <p className="text-xs text-muted-foreground">{coupon.description}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {coupon.discount_type === 'percentage' 
                        ? `${coupon.discount_value}%` 
                        : `$${(coupon.discount_value / 100).toFixed(2)}`
                      }
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {coupon.used_count}{coupon.usage_limit ? `/${coupon.usage_limit}` : ''}
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                      {coupon.is_active ? (lang === 'vi' ? 'Hoạt động' : 'Active') : (lang === 'vi' ? 'Tắt' : 'Inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(coupon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
