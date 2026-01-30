import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { ProductCard } from '@/components/products/ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { Search, X } from 'lucide-react';

export default function ProductsPage() {
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  
  // Read category from URL query params
  const categorySlug = searchParams.get('category');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.getCategories();
      return response.data || [];
    },
  });

  // Find category ID from slug
  const selectedCategory = categories?.find((c: any) => c.slug === categorySlug)?.id || null;

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', search, selectedCategory],
    queryFn: async () => {
      const response = await api.getProducts({
        category_id: selectedCategory || undefined,
        search: search || undefined,
      });
      return response.data || [];
    },
    enabled: !!categories, // Wait for categories to load first
  });

  const handleCategoryChange = (slug: string | null) => {
    if (slug) {
      setSearchParams({ category: slug });
    } else {
      setSearchParams({});
    }
  };

  return (
    <SidebarLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold md:text-4xl mb-4">
            {t('nav.products')}
          </h1>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('products.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Categories filter */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Badge
              variant={!categorySlug ? 'default' : 'outline'}
              className={`cursor-pointer ${
                !categorySlug ? 'gradient-primary text-primary-foreground border-0' : ''
              }`}
              onClick={() => handleCategoryChange(null)}
            >
              {t('common.all')}
            </Badge>
            {categories.map((category: any) => (
              <Badge
                key={category.id}
                variant={categorySlug === category.slug ? 'default' : 'outline'}
                className={`cursor-pointer ${
                  categorySlug === category.slug ? 'gradient-primary text-primary-foreground border-0' : ''
                }`}
                onClick={() => handleCategoryChange(category.slug)}
              >
                {lang === 'vi' && category.name_vi ? category.name_vi : category.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Products grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/3] rounded-lg" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">{t('products.noResults')}</p>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
