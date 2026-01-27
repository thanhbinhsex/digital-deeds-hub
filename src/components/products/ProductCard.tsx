import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { ShoppingCart, Star, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    name_vi: string | null;
    slug: string;
    short_description: string | null;
    price: number;
    original_price: number | null;
    currency: string;
    image_url: string | null;
    featured: boolean | null;
    category?: {
      name: string;
      name_vi: string | null;
    } | null;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { t, lang } = useLanguage();
  const { addItem } = useCart();

  const name = lang === 'vi' && product.name_vi ? product.name_vi : product.name;
  const categoryName = product.category
    ? lang === 'vi' && product.category.name_vi
      ? product.category.name_vi
      : product.category.name
    : null;

  const hasDiscount = product.original_price && product.original_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.original_price!) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      nameVi: product.name_vi || undefined,
      price: product.price,
      imageUrl: product.image_url || undefined,
    });
    toast.success(lang === 'en' ? 'Added to cart!' : 'Đã thêm vào giỏ hàng!');
  };

  return (
    <Link to={`/p/${product.slug}`}>
      <Card className="group h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <Zap className="h-12 w-12 text-primary/50" />
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
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
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <CardContent className="p-4">
          {categoryName && (
            <p className="text-xs font-medium text-primary mb-2">{categoryName}</p>
          )}
          <h3 className="font-display font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {name}
          </h3>
          {product.short_description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {product.short_description}
            </p>
          )}
        </CardContent>

        <CardFooter className="p-4 pt-0 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-lg">
              {formatCurrency(product.price, product.currency, lang)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                {formatCurrency(product.original_price!, product.currency, lang)}
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleAddToCart}
            className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
