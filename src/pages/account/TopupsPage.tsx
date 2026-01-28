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
import { Plus, Loader2, Clock, CheckCircle2, XCircle, ArrowLeft, Copy, Building2, QrCode } from 'lucide-react';

const MIN_TOPUP = 10000;
const MAX_TOPUP = 100000000;

const topupSchema = z.object({
  amount: z.number().min(MIN_TOPUP, `Số tiền tối thiểu là ${MIN_TOPUP.toLocaleString('vi-VN')} VND`).max(MAX_TOPUP, `Số tiền tối đa là ${MAX_TOPUP.toLocaleString('vi-VN')} VND`),
  note: z.string().optional(),
});

type TopupForm = z.infer<typeof topupSchema>;

// Bank info for auto topup
const BANK_INFO = {
  bankName: 'Vietcombank',
  bankCode: 'VCB',
  accountNumber: '1042986008',
  accountName: 'PHAM THANH BINH',
};

// Preset amount packages
const AMOUNT_PACKAGES = [
  { value: 100000, label: '100K' },
  { value: 200000, label: '200K' },
  { value: 500000, label: '500K' },
  { value: 1000000, label: '1 Triệu' },
  { value: 2000000, label: '2 Triệu' },
  { value: 5000000, label: '5 Triệu' },
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

// Generate VietQR URL
function generateVietQRUrl(amount: number, content: string): string {
  const bankId = '970436'; // Vietcombank bank ID for VietQR
  const accountNo = BANK_INFO.accountNumber;
  const template = 'compact2';
  const accountName = encodeURIComponent(BANK_INFO.accountName);
  const addInfo = encodeURIComponent(content);
  
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
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
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TopupForm>({
    resolver: zodResolver(topupSchema),
    defaultValues: {
      amount: 100000,
      note: '',
    },
  });

  const currentAmount = watch('amount');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(lang === 'en' ? 'Copied!' : 'Đã sao chép!');
  };

  const handlePackageSelect = (amount: number) => {
    setSelectedPackage(amount);
    setValue('amount', amount, { shouldValidate: true });
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
    const qrUrl = generateVietQRUrl(createdTopup.amount, createdTopup.topup_code);
    
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
              <QrCode className="h-5 w-5" />
              {lang === 'en' ? 'Scan QR to Pay' : 'Quét mã QR để thanh toán'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <img 
                src={qrUrl} 
                alt="VietQR Payment" 
                className="w-64 h-64 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
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
                  <p className="font-bold font-mono text-lg text-primary">{createdTopup.topup_code}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(createdTopup.topup_code)}>
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
        <CardHeader>
          <CardTitle>{lang === 'en' ? 'Select Amount' : 'Chọn số tiền nạp'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount packages */}
          <div className="grid grid-cols-3 gap-3">
            {AMOUNT_PACKAGES.map((pkg) => (
              <Button
                key={pkg.value}
                type="button"
                variant={selectedPackage === pkg.value ? 'default' : 'outline'}
                className={`h-16 flex flex-col ${selectedPackage === pkg.value ? 'gradient-primary text-primary-foreground shadow-glow' : ''}`}
                onClick={() => handlePackageSelect(pkg.value)}
              >
                <span className="text-lg font-bold">{pkg.label}</span>
                <span className="text-xs opacity-80">{pkg.value.toLocaleString('vi-VN')}đ</span>
              </Button>
            ))}
          </div>

          {/* Custom amount input */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{lang === 'en' ? 'Or enter custom amount' : 'Hoặc nhập số tiền khác'} (VND)</Label>
              <Input
                id="amount"
                type="number"
                {...register('amount', { valueAsNumber: true })}
                placeholder="100000"
                onChange={(e) => {
                  setSelectedPackage(null);
                  register('amount').onChange(e);
                }}
              />
              <p className="text-sm text-muted-foreground">
                {lang === 'en'
                  ? `Min: ${MIN_TOPUP.toLocaleString()} VND - Max: ${MAX_TOPUP.toLocaleString()} VND`
                  : `Tối thiểu: ${MIN_TOPUP.toLocaleString()} VND - Tối đa: ${MAX_TOPUP.toLocaleString()} VND`}
              </p>
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Preview amount */}
            {currentAmount >= MIN_TOPUP && (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  {lang === 'en' ? 'You will top up' : 'Bạn sẽ nạp'}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(currentAmount, 'VND', lang)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note">{t('topup.note')}</Label>
              <Textarea
                id="note"
                {...register('note')}
                placeholder={lang === 'en' ? 'Additional notes (optional)' : 'Ghi chú (tùy chọn)'}
                rows={2}
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
                disabled={isLoading || currentAmount < MIN_TOPUP}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {lang === 'en' ? 'Continue' : 'Tiếp tục'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
