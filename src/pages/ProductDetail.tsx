import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { toast } from 'sonner';
import { ShoppingCart, Star, Zap, ArrowLeft, Check } from 'lucide-react';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { addItem } = useCart();

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

  if (isLoading) {
    return (
      <SidebarLayout>
        <div className="container py-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-32" />
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
        <div className="container py-20 text-center">
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

  const hasDiscount = product.original_price && product.original_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.original_price!) * 100)
    : 0;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      nameVi: product.name_vi || undefined,
      price: product.price,
      imageUrl: product.image_url || undefined,
    });
    toast.success(lang === 'en' ? 'Added to cart!' : 'Đã thêm vào giỏ hàng!');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  return (
    <SidebarLayout>
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <button onClick={() => navigate('/')} className="hover:text-foreground">
            {t('nav.home')}
          </button>
          <span>/</span>
          <button onClick={() => navigate('/products')} className="hover:text-foreground">
            {t('nav.products')}
          </button>
          {categoryName && (
            <>
              <span>/</span>
              <button
                onClick={() => navigate(`/products?category=${product.category?.slug}`)}
                className="hover:text-foreground"
              >
                {categoryName}
              </button>
            </>
          )}
          <span>/</span>
          <span className="text-foreground">{name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <Zap className="h-24 w-24 text-primary/50" />
              </div>
            )}
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {product.featured && (
                <Badge className="gradient-primary text-primary-foreground border-0">
                  <Star className="h-3 w-3 mr-1" />
                  {t('products.featured')}
                </Badge>
              )}
              {hasDiscount && (
                <Badge variant="destructive">-{discountPercent}%</Badge>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            {categoryName && (
              <Badge variant="secondary" className="text-primary">
                {categoryName}
              </Badge>
            )}

            <h1 className="font-display text-3xl font-bold md:text-4xl">{name}</h1>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="font-display text-4xl font-bold gradient-text">
                {formatCurrency(product.price, product.currency, lang)}
              </span>
              {hasDiscount && (
                <span className="text-xl text-muted-foreground line-through">
                  {formatCurrency(product.original_price!, product.currency, lang)}
                </span>
              )}
            </div>

            {/* Description */}
            {description && (
              <div className="prose prose-muted max-w-none">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {description}
                </p>
              </div>
            )}

            {/* Features */}
            <div className="space-y-3 py-4 border-y border-border/50">
              <div className="flex items-center gap-3 text-sm">
                <Check className="h-5 w-5 text-success" />
                <span>{lang === 'en' ? 'Instant digital delivery' : 'Giao hàng số ngay lập tức'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Check className="h-5 w-5 text-success" />
                <span>{lang === 'en' ? 'Lifetime access' : 'Truy cập vĩnh viễn'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Check className="h-5 w-5 text-success" />
                <span>{lang === 'en' ? 'Free updates' : 'Cập nhật miễn phí'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={handleBuyNow}
                className="flex-1 gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity text-base"
              >
                {t('products.buyNow')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleAddToCart}
                className="flex-1 text-base"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {t('products.addToCart')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
