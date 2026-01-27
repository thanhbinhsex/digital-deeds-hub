import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useExchangeRate, convertCurrency } from '@/hooks/useExchangeRate';
import { formatCurrency } from '@/lib/i18n';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  ArrowLeft, 
  Check, 
  Eye, 
  Calendar, 
  Tag, 
  Hash,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount: number | null;
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { data: exchangeRate } = useExchangeRate();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const rate = exchangeRate?.rate || 25000;

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name, name_vi, slug)
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Product not found');
      return data;
    },
    enabled: !!slug,
  });

  // Track view count
  useEffect(() => {
    if (product?.id) {
      const trackView = async () => {
        try {
          await supabase.functions.invoke('increment-view', {
            body: { product_id: product.id },
          });
        } catch (err) {
          console.error('Failed to track view:', err);
        }
      };
      trackView();
    }
  }, [product?.id]);

  // Validate coupon mutation
  const validateCouponMutation = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error(lang === 'vi' ? 'Mã giảm giá không tồn tại' : 'Coupon not found');

      // Check usage limit
      if (data.usage_limit && data.used_count >= data.usage_limit) {
        throw new Error(lang === 'vi' ? 'Mã giảm giá đã hết lượt sử dụng' : 'Coupon usage limit reached');
      }

      // Check validity period
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        throw new Error(lang === 'vi' ? 'Mã giảm giá đã hết hạn' : 'Coupon has expired');
      }

      // Check minimum order
      if (product && data.min_order_amount > product.price) {
        throw new Error(lang === 'vi' 
          ? `Đơn hàng tối thiểu ${formatCurrency(data.min_order_amount, 'USD', lang)}` 
          : `Minimum order ${formatCurrency(data.min_order_amount, 'USD', lang)}`
        );
      }

      return data as AppliedCoupon;
    },
    onSuccess: (coupon) => {
      setAppliedCoupon(coupon);
      toast.success(lang === 'vi' ? 'Đã áp dụng mã giảm giá!' : 'Coupon applied!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    validateCouponMutation.mutate(couponCode);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  // Calculate discount
  const calculateDiscount = () => {
    if (!appliedCoupon || !product) return 0;
    
    if (appliedCoupon.discount_type === 'percentage') {
      const discount = Math.round(product.price * appliedCoupon.discount_value / 100);
      if (appliedCoupon.max_discount) {
        return Math.min(discount, appliedCoupon.max_discount);
      }
      return discount;
    }
    return appliedCoupon.discount_value;
  };

  const discountAmount = calculateDiscount();
  const finalPrice = product ? product.price - discountAmount : 0;

  if (isLoading) {
    return (
      <SidebarLayout>
        <div className="p-6">
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <Skeleton className="aspect-video rounded-xl" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (error || !product) {
    return (
      <SidebarLayout>
        <div className="p-6 text-center py-20">
          <h1 className="text-2xl font-bold mb-4">
            {lang === 'en' ? 'Product not found' : 'Không tìm thấy sản phẩm'}
          </h1>
          <Button onClick={() => navigate('/products')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        </div>
      </SidebarLayout>
    );
  }

  const name = lang === 'vi' && product.name_vi ? product.name_vi : product.name;
  const description = lang === 'vi' && product.description_vi ? product.description_vi : product.description;
  const categoryName = product.category
    ? lang === 'vi' && product.category.name_vi
      ? product.category.name_vi
      : product.category.name
    : null;

  const vndPrice = convertCurrency(finalPrice, rate);
  const shortId = product.id.split('-')[0].toUpperCase();
  const viewCount = (product as any).view_count || 0;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      nameVi: product.name_vi || undefined,
      price: finalPrice,
      imageUrl: product.image_url || undefined,
    });
    toast.success(lang === 'en' ? 'Added to cart!' : 'Đã thêm vào giỏ hàng!');
  };

  const handleBuyNow = () => {
    if (!agreedTerms) {
      toast.error(lang === 'vi' ? 'Vui lòng đồng ý với điều khoản' : 'Please agree to the terms');
      return;
    }
    handleAddToCart();
    navigate('/checkout');
  };

  return (
    <SidebarLayout>
      <div className="p-4 lg:p-6">
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Left: Product Image */}
          <div className="lg:col-span-3 space-y-6">
            {/* Product Image */}
            <div className="relative rounded-xl overflow-hidden bg-muted border border-border">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={name}
                  className="w-full aspect-video object-cover"
                />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                  <ShoppingCart className="h-20 w-20 text-primary/30" />
                </div>
              )}
              
              {/* Decorative dots */}
              <div className="absolute -bottom-4 -left-4 grid grid-cols-3 gap-1">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Purchase Card */}
          <div className="lg:col-span-2">
            <Card className="sticky top-24 border-border/50 overflow-hidden">
              <CardContent className="p-6 space-y-4">
                {/* Product Meta */}
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    <span>{lang === 'vi' ? 'Mã sản phẩm' : 'Product ID'}: #{shortId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {lang === 'vi' ? 'Cập nhật' : 'Updated'}: {format(new Date(product.updated_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-xl font-bold leading-tight">{name}</h1>
                
                {/* Views */}
                <p className="text-sm text-muted-foreground">
                  <Eye className="h-4 w-4 inline mr-1" />
                  {viewCount.toLocaleString()} {lang === 'vi' ? 'lượt xem' : 'views'}
                </p>

                {/* Product Details */}
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>
                      <strong>{lang === 'vi' ? 'Giá bán' : 'Price'}:</strong>{' '}
                      {discountAmount > 0 && (
                        <span className="line-through text-muted-foreground mr-2">
                          {formatCurrency(product.price, 'USD', lang)}
                        </span>
                      )}
                      <span className="text-primary font-bold">
                        {vndPrice.toLocaleString('vi-VN')}VND
                      </span>
                      <span className="text-muted-foreground ml-1">
                        ({formatCurrency(finalPrice, 'USD', lang)})
                      </span>
                    </span>
                  </li>
                  {discountAmount > 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      <span className="text-green-600 font-medium">
                        {lang === 'vi' ? 'Tiết kiệm' : 'You save'}: {formatCurrency(discountAmount, 'USD', lang)}
                      </span>
                    </li>
                  )}
                  {categoryName && (
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>
                        <strong>{lang === 'vi' ? 'Danh mục' : 'Category'}:</strong>{' '}
                        <Link 
                          to={`/products?category=${product.category?.slug}`}
                          className="text-primary hover:underline"
                        >
                          {categoryName}
                        </Link>
                      </span>
                    </li>
                  )}
                </ul>

                {/* Coupon Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-orange-500">
                    {lang === 'vi' ? 'Mã giảm giá (nếu có):' : 'Coupon code (if any):'}
                  </label>
                  {appliedCoupon ? (
                    <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <Tag className="h-4 w-4 text-green-500" />
                      <span className="font-mono font-bold text-green-600">{appliedCoupon.code}</span>
                      <Badge variant="secondary" className="text-green-600">
                        -{appliedCoupon.discount_type === 'percentage' 
                          ? `${appliedCoupon.discount_value}%` 
                          : formatCurrency(appliedCoupon.discount_value, 'USD', lang)}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={removeCoupon}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder={lang === 'vi' ? 'Nhập mã giảm giá' : 'Enter coupon code'}
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="bg-background uppercase"
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      />
                      <Button 
                        variant="secondary" 
                        onClick={handleApplyCoupon}
                        disabled={validateCouponMutation.isPending || !couponCode.trim()}
                      >
                        {validateCouponMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          lang === 'vi' ? 'Áp dụng' : 'Apply'
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="terms"
                    checked={agreedTerms}
                    onCheckedChange={(checked) => setAgreedTerms(checked as boolean)}
                  />
                  <label htmlFor="terms" className="text-sm cursor-pointer">
                    {lang === 'vi' ? 'Tôi đồng ý với các điều khoản' : 'I agree to the terms'}
                  </label>
                </div>

                {/* Checkout Button */}
                <Button
                  size="lg"
                  onClick={handleBuyNow}
                  disabled={!agreedTerms}
                  className="w-full bg-gradient-to-r from-green-500 to-yellow-400 hover:from-green-600 hover:to-yellow-500 text-white font-bold text-lg shadow-lg"
                >
                  {lang === 'vi' ? 'Thanh Toán' : 'Checkout'}
                </Button>

                {/* Demo Link */}
                <div className="text-center">
                  <Button variant="link" className="text-primary">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {lang === 'vi' ? 'Xem Demo' : 'View Demo'}
                  </Button>
                </div>

                {/* Decorative dots */}
                <div className="absolute -bottom-4 -right-4 grid grid-cols-4 gap-1">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Description Section - Moved to bottom */}
        {description && (
          <Card className="border-border/50 mt-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-primary mb-4">{name}</h2>
              <p className="text-muted-foreground text-sm mb-2">
                ({lang === 'vi' ? 'nhấp vào tiêu đề để xem chi tiết' : 'click title to view details'})
              </p>
              
              <div className={`prose prose-sm dark:prose-invert max-w-none ${!showFullDescription && 'line-clamp-6'}`}>
                {description.split('\n').map((para, i) => (
                  para.trim() && <p key={i} className="text-muted-foreground">{para}</p>
                ))}
              </div>
              
              {description.length > 300 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 text-primary"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                >
                  {showFullDescription ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      {lang === 'vi' ? 'Thu gọn' : 'Show less'}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      {lang === 'vi' ? 'Xem thêm' : 'Show more'}
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}
