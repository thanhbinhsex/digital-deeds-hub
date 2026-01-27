import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, ChevronLeft, ChevronRight, Package } from 'lucide-react';

export function HeroCarousel() {
  const { lang } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: featuredProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, name_vi, slug, image_url, short_description')
        .eq('status', 'published')
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const slides = featuredProducts?.length ? featuredProducts : [
    { id: 'default', name: 'Complete Marketing Tools Suite', name_vi: 'Trọn Bộ MKT Bản Mới Nhất', slug: 'products', short_description: 'MKTCare, MKTPage, MKTTube, MKTZalo, MKTGroup...', image_url: null }
  ];

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide, slides.length]);

  const currentProduct = slides[currentSlide];
  const productName = lang === 'vi' && currentProduct.name_vi ? currentProduct.name_vi : currentProduct.name;

  return (
    <div className="relative rounded-2xl overflow-hidden gradient-primary">
      {/* Main content with animation */}
      <div className="relative z-10 p-6 lg:p-10 min-h-[200px] lg:min-h-[280px] flex items-center">
        <div 
          key={currentSlide}
          className="max-w-2xl animate-fade-in"
        >
          <h1 className="font-display text-2xl lg:text-4xl font-bold text-primary-foreground mb-3">
            {productName}
          </h1>
          <p className="text-primary-foreground/80 mb-6 line-clamp-2">
            {currentProduct.short_description || 'MKTCare, MKTPage, MKTTube, MKTZalo, MKTGroup...'}
          </p>
          <Button
            asChild
            variant="outline"
            className="bg-background/10 border-primary-foreground/30 text-primary-foreground hover:bg-background/20 transition-all duration-300 hover:scale-105"
          >
            <Link to={currentProduct.slug === 'products' ? '/products' : `/p/${currentProduct.slug}`}>
              {lang === 'vi' ? 'CHI TIẾT' : 'DETAILS'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Product images carousel */}
        <div className="absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 hidden md:flex gap-4 items-center">
          {slides.slice(0, 3).map((product, index) => {
            const isActive = index === currentSlide % 3;
            return (
              <div
                key={product.id}
                onClick={() => setCurrentSlide(index)}
                className={cn(
                  'w-24 h-24 lg:w-32 lg:h-32 rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-500',
                  isActive 
                    ? 'border-primary-foreground/60 scale-110 shadow-glow' 
                    : 'border-primary-foreground/20 bg-primary-foreground/5 hover:border-primary-foreground/40'
                )}
              >
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-foreground/10">
                    <Package className="h-8 w-8 text-primary-foreground/50" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/20 text-primary-foreground hover:bg-background/30 transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 md:right-auto md:left-[calc(100%-200px)] top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/20 text-primary-foreground hover:bg-background/30 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === currentSlide 
                  ? 'w-8 bg-primary-foreground' 
                  : 'w-2 bg-primary-foreground/40 hover:bg-primary-foreground/60'
              )}
            />
          ))}
        </div>
      )}

      {/* Background shimmer effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/10 to-transparent rotate-12 animate-shimmer" />
      </div>
    </div>
  );
}
