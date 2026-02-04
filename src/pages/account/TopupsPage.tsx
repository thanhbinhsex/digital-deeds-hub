import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate } from '@/lib/i18n';
import { toast } from 'sonner';
import { Plus, Loader2, Clock, CheckCircle2, XCircle, ArrowLeft, Copy, RefreshCw, Gift, Sparkles } from 'lucide-react';

const MIN_TOPUP = 10000;
const MAX_TOPUP = 100000000;

const topupSchema = z.object({
  amount: z.number().min(MIN_TOPUP, `Số tiền tối thiểu là ${MIN_TOPUP.toLocaleString('vi-VN')} VND`).max(MAX_TOPUP, `Số tiền tối đa là ${MAX_TOPUP.toLocaleString('vi-VN')} VND`),
});

type TopupForm = z.infer<typeof topupSchema>;

interface TopupPromotion {
  min_amount: number;
  bonus_percent: number;
  enabled: boolean;
}

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
      const response = await api.getTopupRequests();
      return response.data || [];
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
              {topups.map((topup: any) => (
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
                            {lang === 'en' ? 'Note:' : 'Ghi chú:'}
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
  const [isVerifying, setIsVerifying] = useState(false);
  const [createdTopup, setCreatedTopup] = useState<{ id: string; topup_code: string; amount: number } | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<number>(AMOUNT_PACKAGES[0].value);

  // Fetch promotions from settings
  const { data: promotions } = useQuery({
    queryKey: ['topup-promotions'],
    queryFn: async () => {
      const response = await api.getSetting('topup_promotion');
      const promos = response.data?.promotions || [];
      return promos.filter((p: TopupPromotion) => p.enabled).sort((a: TopupPromotion, b: TopupPromotion) => a.min_amount - b.min_amount);
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TopupForm>({
    resolver: zodResolver(topupSchema),
    defaultValues: {
      amount: AMOUNT_PACKAGES[0].value,
    },
  });

  const currentAmount = watch('amount');

  // Calculate bonus for current amount
  const calculateBonus = (amount: number): { percent: number; bonus: number } => {
    if (!promotions || promotions.length === 0) return { percent: 0, bonus: 0 };
    
    // Find the highest tier that applies
    let applicablePromo: TopupPromotion | null = null;
    for (const promo of promotions) {
      if (amount >= promo.min_amount) {
        applicablePromo = promo;
      }
    }
    
    if (!applicablePromo) return { percent: 0, bonus: 0 };
    
    return {
      percent: applicablePromo.bonus_percent,
      bonus: Math.floor(amount * applicablePromo.bonus_percent / 100),
    };
  };

  const currentBonus = calculateBonus(currentAmount || 0);

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

    try {
      const response = await api.createTopupRequest(data.amount, 'bank_transfer');
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to create topup request');
      }

      setCreatedTopup({ 
        id: response.data.id, 
        topup_code: response.data.topup_code, 
        amount: data.amount 
      });
      queryClient.invalidateQueries({ queryKey: ['topups'] });
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTransfer = async () => {
    if (!createdTopup) return;
    
    setIsVerifying(true);
    
    try {
      const response = await api.verifyTopup(createdTopup.id);

      const verified = (response as any)?.data?.verified;

      // PHP backend returns success=true even when not found yet (verified=false).
      // Only navigate to history when we are actually verified.
      if (response.success && verified === true) {
        toast.success(response.message || (lang === 'en' ? 'Top-up successful!' : 'Nạp tiền thành công!'));
        queryClient.invalidateQueries({ queryKey: ['topups'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        navigate('/account/topups');
        return;
      }

      if (response.success && verified === false) {
        toast.info(
          (response as any)?.data?.message ||
            response.message ||
            (lang === 'en'
              ? 'Transaction not found yet. Please try again in a few minutes.'
              : 'Chưa tìm thấy giao dịch. Vui lòng thử lại sau vài phút.')
        );
        return;
      }

      toast.error(response.message || (lang === 'en' ? 'Transaction not found' : 'Không tìm thấy giao dịch'));
    } catch (error) {
      console.error('Verify error:', error);
      toast.error(lang === 'en' ? 'An error occurred' : 'Đã xảy ra lỗi');
    } finally {
      setIsVerifying(false);
    }
  };

  // Show bank transfer instructions after creating topup
  if (createdTopup) {
    const qrUrl = generateVietQRUrl(createdTopup.amount, createdTopup.topup_code);
    
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/account/topups')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-display text-xl font-bold">
            {lang === 'en' ? 'Transfer Instructions' : 'Hướng dẫn chuyển khoản'}
          </h2>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-4 space-y-4">
            {/* QR Code */}
            <div className="flex justify-center p-2 bg-white rounded-lg">
              <img 
                src={qrUrl} 
                alt="VietQR Payment" 
                className="w-48 h-48 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-center">
              <p className="text-success text-sm font-medium mb-1">
                {lang === 'en' ? '✓ Request created!' : '✓ Đã tạo yêu cầu!'}
              </p>
              <p className="text-xl font-bold">{formatCurrency(createdTopup.amount, 'VND', lang)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{lang === 'en' ? 'Bank' : 'Ngân hàng'}</p>
                  <p className="font-medium">{BANK_INFO.bankName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{lang === 'en' ? 'Account Number' : 'Số TK'}</p>
                  <p className="font-medium font-mono">{BANK_INFO.accountNumber}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(BANK_INFO.accountNumber)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{lang === 'en' ? 'Account Name' : 'Tên TK'}</p>
                  <p className="font-medium">{BANK_INFO.accountName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-primary/10 border border-primary/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">{lang === 'en' ? 'Transfer Content' : 'Nội dung CK'}</p>
                  <p className="font-bold font-mono text-primary">{createdTopup.topup_code}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(createdTopup.topup_code)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
              <p className="text-warning text-xs">
                <strong>{lang === 'en' ? 'Important:' : 'Lưu ý:'}</strong>{' '}
                {lang === 'en' 
                  ? 'Please include the transfer code exactly as shown.'
                  : 'Vui lòng ghi đúng nội dung chuyển khoản.'}
              </p>
            </div>

            {/* Confirm Transfer Button */}
            <Button 
              className="w-full gradient-primary text-primary-foreground shadow-glow"
              onClick={handleVerifyTransfer}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {lang === 'en' ? 'Checking...' : 'Đang kiểm tra...'}
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {lang === 'en' ? 'I have transferred - Verify now' : 'Đã chuyển khoản - Xác nhận'}
                </>
              )}
            </Button>

            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => navigate('/account/topups')}
            >
              {lang === 'en' ? 'Back to History' : 'Quay lại lịch sử'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/account/topups')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-display text-xl font-bold">{t('topup.title')}</h2>
      </div>

      {/* Promotion Banner */}
      {promotions && promotions.length > 0 && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-5 w-5 text-success" />
              <h3 className="font-semibold text-success">
                {lang === 'vi' ? 'Khuyến mãi nạp tiền' : 'Top-up Promotions'}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {promotions.map((promo: TopupPromotion, idx: number) => (
                <div key={idx} className="bg-background rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    {lang === 'vi' ? 'Từ' : 'From'} {formatCurrency(promo.min_amount, 'VND', lang)}
                  </p>
                  <p className="font-bold text-success">+{promo.bonus_percent}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{lang === 'en' ? 'Select Amount' : 'Chọn số tiền'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Amount packages */}
          <div className="grid grid-cols-3 gap-2">
            {AMOUNT_PACKAGES.map((pkg) => (
              <Button
                key={pkg.value}
                type="button"
                variant={selectedPackage === pkg.value ? 'default' : 'outline'}
                className={`h-12 flex flex-col ${selectedPackage === pkg.value ? 'gradient-primary text-primary-foreground shadow-glow' : ''}`}
                onClick={() => handlePackageSelect(pkg.value)}
              >
                <span className="text-sm font-bold">{pkg.label}</span>
              </Button>
            ))}
          </div>

          {/* Custom amount input */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm">{lang === 'en' ? 'Or enter amount' : 'Hoặc nhập số tiền'} (VND)</Label>
              <Input
                id="amount"
                type="number"
                {...register('amount', { valueAsNumber: true })}
                placeholder="100000"
                onChange={(e) => {
                  setSelectedPackage(0);
                  register('amount').onChange(e);
                }}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Preview amount with bonus */}
            {currentAmount >= MIN_TOPUP && (
              <div className="p-3 bg-muted rounded-lg text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  {lang === 'en' ? 'Amount' : 'Số tiền nạp'}
                </p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(currentAmount, 'VND', lang)}
                </p>
                {currentBonus.bonus > 0 && (
                  <div className="flex items-center justify-center gap-2 text-success">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-semibold">
                      +{formatCurrency(currentBonus.bonus, 'VND', lang)} ({currentBonus.percent}% {lang === 'vi' ? 'bonus' : 'bonus'})
                    </span>
                  </div>
                )}
                {currentBonus.bonus > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {lang === 'vi' ? 'Tổng nhận được' : 'Total received'}
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(currentAmount + currentBonus.bonus, 'VND', lang)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
              disabled={isLoading || currentAmount < MIN_TOPUP}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {lang === 'en' ? 'Continue' : 'Tiếp tục'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
