import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate } from '@/lib/i18n';
import { toast } from 'sonner';
import { Plus, Loader2, Clock, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

const topupSchema = z.object({
  amount: z.number().min(100, 'Minimum amount is $1.00').max(1000000, 'Maximum amount is $10,000'),
  method: z.string().min(1, 'Please select a payment method'),
  reference: z.string().min(1, 'Please enter transaction reference'),
  note: z.string().optional(),
});

type TopupForm = z.infer<typeof topupSchema>;

const paymentMethods = [
  { value: 'bank_transfer', label: 'Bank Transfer', labelVi: 'Chuyển khoản ngân hàng' },
  { value: 'momo', label: 'MoMo', labelVi: 'MoMo' },
  { value: 'zalopay', label: 'ZaloPay', labelVi: 'ZaloPay' },
  { value: 'vnpay', label: 'VNPay', labelVi: 'VNPay' },
];

function TopupStatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
          <Clock className="h-3 w-3 mr-1" />
          {t('topup.pending')}
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t('topup.approved')}
        </Badge>
      );
    case 'denied':
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
          <XCircle className="h-3 w-3 mr-1" />
          {t('topup.denied')}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function TopupsPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const { data: topups, isLoading } = useQuery({
    queryKey: ['topups'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('topup_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">{t('topup.history')}</h2>
        <Link to="/account/topups/new">
          <Button className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity">
            <Plus className="mr-2 h-5 w-5" />
            {t('wallet.topUp')}
          </Button>
        </Link>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
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
          ) : topups && topups.length > 0 ? (
            <div className="divide-y divide-border">
              {topups.map((topup) => {
                const methodLabel =
                  paymentMethods.find((m) => m.value === topup.method)?.[
                    lang === 'vi' ? 'labelVi' : 'label'
                  ] || topup.method;

                return (
                  <div key={topup.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            {formatCurrency(topup.amount, 'USD', lang)}
                          </span>
                          <TopupStatusBadge status={topup.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {methodLabel} • {topup.reference}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(topup.created_at, lang)}
                        </p>
                        {topup.admin_note && (
                          <p className="text-sm mt-2 p-2 rounded bg-muted">
                            <span className="text-muted-foreground">
                              {lang === 'en' ? 'Admin note:' : 'Ghi chú admin:'}
                            </span>{' '}
                            {topup.admin_note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                {lang === 'en' ? 'No top-up requests yet' : 'Chưa có yêu cầu nạp tiền'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function NewTopupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TopupForm>({
    resolver: zodResolver(topupSchema),
    defaultValues: {
      amount: 1000, // $10.00
      method: '',
      reference: '',
      note: '',
    },
  });

  const selectedMethod = watch('method');

  const onSubmit = async (data: TopupForm) => {
    if (!user) return;
    setIsLoading(true);

    const { error } = await supabase.from('topup_requests').insert({
      user_id: user.id,
      amount: data.amount,
      method: data.method,
      reference: data.reference,
      note: data.note || null,
      status: 'pending',
    });

    setIsLoading(false);

    if (error) {
      toast.error(t('common.error'));
    } else {
      queryClient.invalidateQueries({ queryKey: ['topups'] });
      toast.success(
        lang === 'en'
          ? 'Top-up request submitted! Please wait for admin approval.'
          : 'Yêu cầu nạp tiền đã được gửi! Vui lòng chờ admin duyệt.'
      );
      navigate('/account/topups');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/account/topups')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-display text-2xl font-bold">{t('topup.title')}</h2>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">{t('topup.amount')} (USD cents)</Label>
              <Input
                id="amount"
                type="number"
                {...register('amount', { valueAsNumber: true })}
                placeholder="1000"
              />
              <p className="text-sm text-muted-foreground">
                {lang === 'en'
                  ? `Enter amount in cents. 1000 = $10.00`
                  : `Nhập số tiền bằng cents. 1000 = $10.00`}
              </p>
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('topup.method')}</Label>
              <Select value={selectedMethod} onValueChange={(v) => setValue('method', v)}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={lang === 'en' ? 'Select payment method' : 'Chọn phương thức'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {lang === 'vi' ? method.labelVi : method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.method && (
                <p className="text-sm text-destructive">{errors.method.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">{t('topup.reference')}</Label>
              <Input
                id="reference"
                {...register('reference')}
                placeholder={
                  lang === 'en' ? 'Transaction ID or reference code' : 'Mã giao dịch'
                }
              />
              {errors.reference && (
                <p className="text-sm text-destructive">{errors.reference.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">{t('topup.note')}</Label>
              <Textarea
                id="note"
                {...register('note')}
                placeholder={lang === 'en' ? 'Additional notes (optional)' : 'Ghi chú (tùy chọn)'}
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/account/topups')}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                className="flex-1 gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('topup.submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
