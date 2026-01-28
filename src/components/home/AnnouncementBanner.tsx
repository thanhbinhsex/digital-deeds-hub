import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ArrowRight, Package, Megaphone } from 'lucide-react';

export function AnnouncementBanner() {
  const { lang } = useLanguage();

  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('*');
      return data || [];
    },
  });

  const generalSettings = settings?.find(s => s.key === 'general')?.value as Record<string, any> || {};
  const bannerSettings = settings?.find(s => s.key === 'banner')?.value as Record<string, any> || {};

  const siteName = generalSettings.site_name || 'MinMinTool';
  const title = lang === 'vi' 
    ? (bannerSettings.title_vi || bannerSettings.title || `Chào mừng đến ${siteName}`)
    : (bannerSettings.title || `Welcome to ${siteName}`);
  const description = lang === 'vi'
    ? (bannerSettings.description_vi || bannerSettings.description || 'Công cụ marketing hiệu quả cho doanh nghiệp của bạn')
    : (bannerSettings.description || 'Effective marketing tools for your business');
  const buttonText = lang === 'vi'
    ? (bannerSettings.button_text_vi || bannerSettings.button_text || 'Xem sản phẩm')
    : (bannerSettings.button_text || 'View Products');
  const buttonLink = bannerSettings.button_link || '/products';

  return (
    <div className="relative rounded-2xl overflow-hidden gradient-primary">
      {/* Main content */}
      <div className="relative z-10 p-6 lg:p-10 min-h-[200px] lg:min-h-[280px] flex items-center">
        <div className="max-w-2xl animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="h-5 w-5 text-primary-foreground/80" />
            <span className="text-sm text-primary-foreground/80 font-medium">
              {lang === 'vi' ? 'Thông báo' : 'Announcement'}
            </span>
          </div>
          <h1 className="font-display text-2xl lg:text-4xl font-bold text-primary-foreground mb-3">
            {title}
          </h1>
          <p className="text-primary-foreground/80 mb-6 line-clamp-2">
            {description}
          </p>
          <Button
            asChild
            variant="outline"
            className="bg-background/10 border-primary-foreground/30 text-primary-foreground hover:bg-background/20 transition-all duration-300 hover:scale-105"
          >
            <Link to={buttonLink}>
              {buttonText}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Decorative icon */}
        <div className="absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 hidden md:flex">
          <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-xl border-2 border-primary-foreground/20 bg-primary-foreground/5 flex items-center justify-center">
            <Package className="h-16 w-16 text-primary-foreground/50" />
          </div>
        </div>
      </div>

      {/* Background shimmer effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/10 to-transparent rotate-12 animate-shimmer" />
      </div>
    </div>
  );
}
