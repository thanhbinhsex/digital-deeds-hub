import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Eye, Package } from 'lucide-react';
import { AnnouncementBanner } from './AnnouncementBanner';

export function HomeContent() {
  const { t, lang } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.getCategories();
      return response.data || [];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', activeCategory],
    queryFn: async () => {
      const response = await api.getProducts({
        category_id: activeCategory || undefined,
        limit: 12,
      });
      return response.data || [];
    },
  });

  const categoryTabs = [
    { id: null, label: lang === 'vi' ? 'TẤT CẢ' : 'ALL' },
    ...(categories?.map((cat: any) => ({
      id: cat.id,
      label: (lang === 'vi' && cat.name_vi ? cat.name_vi : cat.name).toUpperCase(),
    })) || []),
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Announcement Banner */}
      <AnnouncementBanner />

      {/* Category Tabs */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {categoryTabs.map((tab) => (
            <Button
              key={tab.id || 'all'}
              variant={activeCategory === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(tab.id)}
              className={cn(
                'shrink-0 rounded-full',
                activeCategory === tab.id && 'gradient-primary text-primary-foreground'
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {isLoading
          ? [...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <Skeleton className="aspect-video" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))
          : products?.map((product: any) => (
              <div
                key={product.id}
                className="rounded-xl border border-border bg-card overflow-hidden group hover:shadow-lg transition-shadow"
              >
                {/* Image */}
                <Link to={`/p/${product.slug}`} className="block aspect-video bg-muted relative overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {product.featured && (
                    <Badge className="absolute top-2 left-2 bg-warning text-warning-foreground">
                      {t('products.featured')}
                    </Badge>
                  )}
                </Link>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <Link to={`/p/${product.slug}`}>
                    <h3 className="font-semibold line-clamp-1 hover:text-primary transition-colors">
                      {lang === 'vi' && product.name_vi ? product.name_vi : product.name}
                    </h3>
                  </Link>

                  {/* Price */}
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(product.price, product.currency, lang)}
                    </span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatCurrency(product.original_price, product.currency, lang)}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {lang === 'vi' ? `Lượt xem: ${product.view_count || 0}` : `Views: ${product.view_count || 0}`}
                    </span>
                    <span>•</span>
                    <span>{lang === 'vi' ? 'Đã bán: 0' : 'Sold: 0'}</span>
                  </div>

                  {/* Button */}
                  <Button
                    asChild
                    className="w-full gradient-primary text-primary-foreground"
                  >
                    <Link to={`/p/${product.slug}`}>
                      {lang === 'vi' ? 'Xem Ngay' : 'View Now'}
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
      </div>

      {products?.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          {t('products.noResults')}
        </div>
      )}
    </div>
  );
}
