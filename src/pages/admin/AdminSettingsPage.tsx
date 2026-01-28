import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Save, Globe, CreditCard, Bell, Gift, Plus, Trash2, Megaphone, MessageCircle, ExternalLink } from 'lucide-react';

interface SiteSetting {
  id: string;
  key: string;
  value: Record<string, any>;
  description: string | null;
}

interface TopupPromotion {
  min_amount: number;
  bonus_percent: number;
  enabled: boolean;
}

export default function AdminSettingsPage() {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');
      if (error) throw error;
      return data as SiteSetting[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, any> }) => {
      const existing = settings?.find(s => s.key === key);
      if (existing) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value })
          .eq('key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      toast.success(lang === 'vi' ? 'Đã lưu cài đặt!' : 'Settings saved!');
    },
    onError: () => {
      toast.error(lang === 'vi' ? 'Lỗi lưu cài đặt' : 'Error saving settings');
    },
  });

  const getSetting = (key: string) => settings?.find(s => s.key === key)?.value || {};

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{lang === 'vi' ? 'Cài Đặt' : 'Settings'}</h1>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="general" className="text-xs px-2 py-2">
            <Globe className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{lang === 'vi' ? 'Chung' : 'General'}</span>
          </TabsTrigger>
          <TabsTrigger value="banner" className="text-xs px-2 py-2">
            <Megaphone className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Banner</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="text-xs px-2 py-2">
            <MessageCircle className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{lang === 'vi' ? 'Liên Hệ' : 'Contact'}</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="text-xs px-2 py-2">
            <CreditCard className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{lang === 'vi' ? 'Thanh Toán' : 'Payment'}</span>
          </TabsTrigger>
          <TabsTrigger value="promotion" className="text-xs px-2 py-2">
            <Gift className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{lang === 'vi' ? 'Khuyến Mãi' : 'Promo'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings 
            data={getSetting('general')} 
            onSave={(value) => updateMutation.mutate({ key: 'general', value })}
            isPending={updateMutation.isPending}
            lang={lang}
          />
        </TabsContent>

        <TabsContent value="banner">
          <BannerSettings 
            data={getSetting('banner')} 
            onSave={(value) => updateMutation.mutate({ key: 'banner', value })}
            isPending={updateMutation.isPending}
            lang={lang}
          />
        </TabsContent>

        <TabsContent value="contact">
          <ContactSettings 
            data={getSetting('contact')} 
            onSave={(value) => updateMutation.mutate({ key: 'contact', value })}
            isPending={updateMutation.isPending}
            lang={lang}
          />
        </TabsContent>

        <TabsContent value="payment">
          <PaymentSettings 
            data={getSetting('payment')} 
            onSave={(value) => updateMutation.mutate({ key: 'payment', value })}
            isPending={updateMutation.isPending}
            lang={lang}
          />
        </TabsContent>

        <TabsContent value="promotion">
          <PromotionSettings 
            data={getSetting('topup_promotion')} 
            onSave={(value) => updateMutation.mutate({ key: 'topup_promotion', value })}
            isPending={updateMutation.isPending}
            lang={lang}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralSettings({ data, onSave, isPending, lang }: { data: Record<string, any>; onSave: (value: Record<string, any>) => void; isPending: boolean; lang: string }) {
  const [form, setForm] = useState({
    site_name: data.site_name || 'VieTool',
    site_url: data.site_url || 'vietool.cc',
    site_description: data.site_description || '',
    contact_email: data.contact_email || '',
    contact_phone: data.contact_phone || '',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{lang === 'vi' ? 'Thông Tin Website' : 'Website Info'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">{lang === 'vi' ? 'Tên Website' : 'Site Name'}</Label>
            <Input value={form.site_name} onChange={e => setForm({ ...form, site_name: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{lang === 'vi' ? 'Địa chỉ Website' : 'Site URL'}</Label>
            <Input value={form.site_url} onChange={e => setForm({ ...form, site_url: e.target.value })} placeholder="vietool.cc" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{lang === 'vi' ? 'Điện Thoại' : 'Phone'}</Label>
            <Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} className="h-9" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{lang === 'vi' ? 'Mô Tả' : 'Description'}</Label>
          <Textarea value={form.site_description} onChange={e => setForm({ ...form, site_description: e.target.value })} rows={2} />
        </div>
        <Button size="sm" onClick={() => onSave(form)} disabled={isPending}>
          <Save className="h-4 w-4 mr-1" />
          {isPending ? '...' : (lang === 'vi' ? 'Lưu' : 'Save')}
        </Button>
      </CardContent>
    </Card>
  );
}

function BannerSettings({ data, onSave, isPending, lang }: { data: Record<string, any>; onSave: (value: Record<string, any>) => void; isPending: boolean; lang: string }) {
  const [form, setForm] = useState({
    title: data.title || '',
    title_vi: data.title_vi || '',
    description: data.description || '',
    description_vi: data.description_vi || '',
    button_text: data.button_text || 'View Products',
    button_text_vi: data.button_text_vi || 'Xem sản phẩm',
    button_link: data.button_link || '/products',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          {lang === 'vi' ? 'Nội Dung Banner' : 'Banner Content'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">{lang === 'vi' ? 'Tiêu đề (EN)' : 'Title (EN)'}</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{lang === 'vi' ? 'Tiêu đề (VI)' : 'Title (VI)'}</Label>
            <Input value={form.title_vi} onChange={e => setForm({ ...form, title_vi: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{lang === 'vi' ? 'Mô tả (EN)' : 'Description (EN)'}</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{lang === 'vi' ? 'Mô tả (VI)' : 'Description (VI)'}</Label>
            <Textarea value={form.description_vi} onChange={e => setForm({ ...form, description_vi: e.target.value })} rows={2} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">{lang === 'vi' ? 'Nút (EN)' : 'Button (EN)'}</Label>
            <Input value={form.button_text} onChange={e => setForm({ ...form, button_text: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{lang === 'vi' ? 'Nút (VI)' : 'Button (VI)'}</Label>
            <Input value={form.button_text_vi} onChange={e => setForm({ ...form, button_text_vi: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Link</Label>
            <Input value={form.button_link} onChange={e => setForm({ ...form, button_link: e.target.value })} className="h-9" />
          </div>
        </div>
        <Button size="sm" onClick={() => onSave(form)} disabled={isPending}>
          <Save className="h-4 w-4 mr-1" />
          {isPending ? '...' : (lang === 'vi' ? 'Lưu' : 'Save')}
        </Button>
      </CardContent>
    </Card>
  );
}

function ContactSettings({ data, onSave, isPending, lang }: { data: Record<string, any>; onSave: (value: Record<string, any>) => void; isPending: boolean; lang: string }) {
  const [form, setForm] = useState({
    telegram_url: data.telegram_url || '',
    zalo_url: data.zalo_url || '',
    facebook_url: data.facebook_url || '',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          {lang === 'vi' ? 'Link Liên Hệ' : 'Contact Links'}
        </CardTitle>
        <CardDescription className="text-xs">
          {lang === 'vi' ? 'Hiển thị trên nút liên hệ floating' : 'Displayed on floating contact button'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-2">
              <ExternalLink className="h-3 w-3" />
              Telegram URL
            </Label>
            <Input 
              value={form.telegram_url} 
              onChange={e => setForm({ ...form, telegram_url: e.target.value })} 
              placeholder="https://t.me/username"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-2">
              <ExternalLink className="h-3 w-3" />
              Zalo URL
            </Label>
            <Input 
              value={form.zalo_url} 
              onChange={e => setForm({ ...form, zalo_url: e.target.value })} 
              placeholder="https://zalo.me/phone"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-2">
              <ExternalLink className="h-3 w-3" />
              Facebook URL
            </Label>
            <Input 
              value={form.facebook_url} 
              onChange={e => setForm({ ...form, facebook_url: e.target.value })} 
              placeholder="https://facebook.com/page"
              className="h-9"
            />
          </div>
        </div>
        <Button size="sm" onClick={() => onSave(form)} disabled={isPending}>
          <Save className="h-4 w-4 mr-1" />
          {isPending ? '...' : (lang === 'vi' ? 'Lưu' : 'Save')}
        </Button>
      </CardContent>
    </Card>
  );
}

function PaymentSettings({ data, onSave, isPending, lang }: { data: Record<string, any>; onSave: (value: Record<string, any>) => void; isPending: boolean; lang: string }) {
  const [form, setForm] = useState({
    bank_name: data.bank_name || 'Vietcombank',
    bank_account: data.bank_account || '',
    bank_owner: data.bank_owner || '',
    min_topup: data.min_topup || 10000,
    max_topup: data.max_topup || 100000000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{lang === 'vi' ? 'Thông Tin Ngân Hàng' : 'Bank Info'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">{lang === 'vi' ? 'Ngân Hàng' : 'Bank'}</Label>
            <Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{lang === 'vi' ? 'Số TK' : 'Account'}</Label>
            <Input value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{lang === 'vi' ? 'Chủ TK' : 'Owner'}</Label>
            <Input value={form.bank_owner} onChange={e => setForm({ ...form, bank_owner: e.target.value })} className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Min (VND)</Label>
              <Input type="number" value={form.min_topup} onChange={e => setForm({ ...form, min_topup: Number(e.target.value) })} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max (VND)</Label>
              <Input type="number" value={form.max_topup} onChange={e => setForm({ ...form, max_topup: Number(e.target.value) })} className="h-9" />
            </div>
          </div>
        </div>
        <Button size="sm" onClick={() => onSave(form)} disabled={isPending}>
          <Save className="h-4 w-4 mr-1" />
          {isPending ? '...' : (lang === 'vi' ? 'Lưu' : 'Save')}
        </Button>
      </CardContent>
    </Card>
  );
}

function PromotionSettings({ data, onSave, isPending, lang }: { data: Record<string, any>; onSave: (value: Record<string, any>) => void; isPending: boolean; lang: string }) {
  const defaultPromos: TopupPromotion[] = [
    { min_amount: 100000, bonus_percent: 5, enabled: true },
    { min_amount: 500000, bonus_percent: 10, enabled: true },
    { min_amount: 1000000, bonus_percent: 15, enabled: true },
  ];
  
  const [promotions, setPromotions] = useState<TopupPromotion[]>(data.promotions || defaultPromos);

  const addPromotion = () => {
    setPromotions([...promotions, { min_amount: 100000, bonus_percent: 5, enabled: true }]);
  };

  const removePromotion = (index: number) => {
    setPromotions(promotions.filter((_, i) => i !== index));
  };

  const updatePromotion = (index: number, field: keyof TopupPromotion, value: any) => {
    const updated = [...promotions];
    updated[index] = { ...updated[index], [field]: value };
    setPromotions(updated);
  };

  const handleSave = () => {
    const sorted = [...promotions].sort((a, b) => a.min_amount - b.min_amount);
    onSave({ promotions: sorted });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          {lang === 'vi' ? 'Khuyến Mãi Nạp Tiền' : 'Topup Bonus'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {promotions.map((promo, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Switch 
                checked={promo.enabled} 
                onCheckedChange={(checked) => updatePromotion(index, 'enabled', checked)}
              />
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input 
                  type="number" 
                  value={promo.min_amount} 
                  onChange={e => updatePromotion(index, 'min_amount', Number(e.target.value))}
                  className="h-8 text-sm"
                  placeholder="Min VND"
                />
                <div className="flex items-center gap-1">
                  <Input 
                    type="number" 
                    value={promo.bonus_percent} 
                    onChange={e => updatePromotion(index, 'bonus_percent', Number(e.target.value))}
                    className="h-8 text-sm"
                    min={0}
                    max={100}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => removePromotion(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addPromotion} className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          {lang === 'vi' ? 'Thêm Mức' : 'Add Tier'}
        </Button>

        <Button size="sm" onClick={handleSave} disabled={isPending}>
          <Save className="h-4 w-4 mr-1" />
          {isPending ? '...' : (lang === 'vi' ? 'Lưu' : 'Save')}
        </Button>
      </CardContent>
    </Card>
  );
}
