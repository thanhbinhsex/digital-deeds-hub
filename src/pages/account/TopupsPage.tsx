import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate } from '@/lib/i18n';
import { toast } from 'sonner';
import { Plus, Loader2, Clock, CheckCircle2, XCircle, ArrowLeft, Copy, Building2 } from 'lucide-react';

const topupSchema = z.object({
  amount: z.number().min(10000, 'Số tiền tối thiểu là 10,000 VND').max(100000000, 'Số tiền tối đa là 100,000,000 VND'),
  note: z.string().optional(),
});

type TopupForm = z.infer<typeof topupSchema>;

// Bank info for auto topup
const BANK_INFO = {
  bankName: 'Vietcombank',
  accountNumber: '1042986008',
  accountName: 'PHAM THANH BINH',
};

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
              {topups.map((topup) => (
                <div key={topup.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {formatCurrency(topup.amount, 'VND', lang)}
                        </span>
                        <TopupStatusBadge status={topup.status} />
                      </div>
                      {topup.topup_code && (
                        <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">
                          {topup.topup_code}
                        </p>
                      )}
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
              ))}
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
  const [createdTopup, setCreatedTopup] = useState<{ topup_code: string; amount: number } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TopupForm>({
    resolver: zodResolver(topupSchema),
    defaultValues: {
      amount: 100000,
      note: '',
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(lang === 'en' ? 'Copied!' : 'Đã sao chép!');
  };

  const onSubmit = async (data: TopupForm) => {
    if (!user) return;
    setIsLoading(true);

    const { data: insertData, error } = await supabase.from('topup_requests').insert({
      user_id: user.id,
      amount: data.amount,
      method: 'bank_transfer',
      note: data.note || null,
      status: 'pending',
    }).select().single();

    if (error) {
      setIsLoading(false);
      toast.error(t('common.error'));
      return;
    }

    // Send Telegram notification (fire and forget)
    try {
      await supabase.functions.invoke('send-telegram', {
        body: {
          type: 'topup',
          data: {
            id: insertData.id,
            amount: data.amount,
            userEmail: user.email,
            method: 'bank_transfer',
            topupCode: insertData.topup_code,
          },
        },
      });
    } catch (e) {
      console.error('Telegram notification failed:', e);
    }

    setIsLoading(false);
    setCreatedTopup({ topup_code: insertData.topup_code, amount: data.amount });
    queryClient.invalidateQueries({ queryKey: ['topups'] });
  };

  // Show bank transfer instructions after creating topup
  if (createdTopup) {
    const transferContent = `${createdTopup.topup_code}`;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/account/topups')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-display text-2xl font-bold">
            {lang === 'en' ? 'Transfer Instructions' : 'Hướng dẫn chuyển khoản'}
          </h2>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t('topup.bankInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-success/10 border border-success/30 rounded-lg p-4">
              <p className="text-success font-medium mb-2">
                {lang === 'en' ? '✓ Request created! Please transfer:' : '✓ Đã tạo yêu cầu! Vui lòng chuyển khoản:'}
              </p>
              <p className="text-2xl font-bold">{formatCurrency(createdTopup.amount, 'VND', lang)}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">{lang === 'en' ? 'Bank' : 'Ngân hàng'}</p>
                  <p className="font-medium">{BANK_INFO.bankName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">{lang === 'en' ? 'Account Number' : 'Số tài khoản'}</p>
                  <p className="font-medium font-mono">{BANK_INFO.accountNumber}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(BANK_INFO.accountNumber)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">{lang === 'en' ? 'Account Name' : 'Tên tài khoản'}</p>
                  <p className="font-medium">{BANK_INFO.accountName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">{lang === 'en' ? 'Transfer Content (IMPORTANT!)' : 'Nội dung chuyển khoản (QUAN TRỌNG!)'}</p>
                  <p className="font-bold font-mono text-lg text-primary">{transferContent}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(transferContent)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <p className="text-warning text-sm">
                <strong>{lang === 'en' ? 'Important:' : 'Lưu ý:'}</strong>{' '}
                {lang === 'en' 
                  ? 'Please include the transfer code in the transfer content. Your balance will be updated automatically within 1-5 minutes after the transfer.'
                  : 'Vui lòng ghi đúng nội dung chuyển khoản. Số dư sẽ được cập nhật tự động trong 1-5 phút sau khi chuyển khoản.'}
              </p>
            </div>

            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => navigate('/account/topups')}
            >
              {lang === 'en' ? 'View My Top-ups' : 'Xem lịch sử nạp tiền'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <Label htmlFor="amount">{t('topup.amount')} (VND)</Label>
              <Input
                id="amount"
                type="number"
                {...register('amount', { valueAsNumber: true })}
                placeholder="100000"
              />
              <p className="text-sm text-muted-foreground">
                {lang === 'en'
                  ? 'Enter amount in VND. Minimum: 10,000 VND'
                  : 'Nhập số tiền bằng VND. Tối thiểu: 10,000 VND'}
              </p>
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[50000, 100000, 200000, 500000].map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.getElementById('amount') as HTMLInputElement;
                    if (input) {
                      input.value = amt.toString();
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                  }}
                >
                  {(amt / 1000).toLocaleString()}K
                </Button>
              ))}
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
                {lang === 'en' ? 'Create Request' : 'Tạo yêu cầu'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
