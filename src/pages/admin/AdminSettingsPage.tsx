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
import { Save, Globe, CreditCard, Bell, Settings, Gift, Plus, Trash2 } from 'lucide-react';

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
      // Check if setting exists
      const existing = settings?.find(s => s.key === key);
      if (existing) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value })
          .eq('key', key);
        if (error) throw error;
      } else {
        // Insert new setting
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
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{lang === 'vi' ? 'Cài Đặt Hệ Thống' : 'System Settings'}</h1>
          <p className="text-muted-foreground">{lang === 'vi' ? 'Quản lý cài đặt website' : 'Manage website settings'}</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {lang === 'vi' ? 'Chung' : 'General'}
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {lang === 'vi' ? 'Thanh Toán' : 'Payment'}
          </TabsTrigger>
          <TabsTrigger value="promotion" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            {lang === 'vi' ? 'Khuyến Mãi' : 'Promotions'}
          </TabsTrigger>
          <TabsTrigger value="notification" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {lang === 'vi' ? 'Thông Báo' : 'Notifications'}
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <GeneralSettings 
            data={getSetting('general')} 
            onSave={(value) => updateMutation.mutate({ key: 'general', value })}
            isPending={updateMutation.isPending}
            lang={lang}
          />
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment">
          <PaymentSettings 
            data={getSetting('payment')} 
            onSave={(value) => updateMutation.mutate({ key: 'payment', value })}
            isPending={updateMutation.isPending}
            lang={lang}
          />
        </TabsContent>

        {/* Promotion Settings */}
        <TabsContent value="promotion">
          <PromotionSettings 
            data={getSetting('topup_promotion')} 
            onSave={(value) => updateMutation.mutate({ key: 'topup_promotion', value })}
            isPending={updateMutation.isPending}
            lang={lang}
          />
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notification">
          <NotificationSettings 
            data={getSetting('notification')} 
            onSave={(value) => updateMutation.mutate({ key: 'notification', value })}
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
    site_name: data.site_name || 'MinMinTool',
    site_description: data.site_description || '',
    contact_email: data.contact_email || '',
    contact_phone: data.contact_phone || '',
    facebook_url: data.facebook_url || '',
    zalo_url: data.zalo_url || '',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{lang === 'vi' ? 'Cài Đặt Chung' : 'General Settings'}</CardTitle>
        <CardDescription>{lang === 'vi' ? 'Thông tin cơ bản của website' : 'Basic website information'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{lang === 'vi' ? 'Tên Website' : 'Site Name'}</Label>
            <Input value={form.site_name} onChange={e => setForm({ ...form, site_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{lang === 'vi' ? 'Email Liên Hệ' : 'Contact Email'}</Label>
            <Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{lang === 'vi' ? 'Số Điện Thoại' : 'Phone Number'}</Label>
            <Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Facebook URL</Label>
            <Input value={form.facebook_url} onChange={e => setForm({ ...form, facebook_url: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Zalo URL</Label>
            <Input value={form.zalo_url} onChange={e => setForm({ ...form, zalo_url: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{lang === 'vi' ? 'Mô Tả Website' : 'Site Description'}</Label>
          <Textarea value={form.site_description} onChange={e => setForm({ ...form, site_description: e.target.value })} rows={3} />
        </div>
        <Button onClick={() => onSave(form)} disabled={isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isPending ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : (lang === 'vi' ? 'Lưu Cài Đặt' : 'Save Settings')}
        </Button>
      </CardContent>
    </Card>
  );
}

function PaymentSettings({ data, onSave, isPending, lang }: { data: Record<string, any>; onSave: (value: Record<string, any>) => void; isPending: boolean; lang: string }) {
  const [form, setForm] = useState({
    bank_name: data.bank_name || 'Vietcombank',
    bank_account: data.bank_account || '1042986008',
    bank_owner: data.bank_owner || 'PHAM THANH BINH',
    min_topup: data.min_topup || 10000,
    max_topup: data.max_topup || 100000000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{lang === 'vi' ? 'Cài Đặt Thanh Toán' : 'Payment Settings'}</CardTitle>
        <CardDescription>{lang === 'vi' ? 'Thông tin ngân hàng và thanh toán' : 'Bank and payment information'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{lang === 'vi' ? 'Tên Ngân Hàng' : 'Bank Name'}</Label>
            <Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="VD: Vietcombank" />
          </div>
          <div className="space-y-2">
            <Label>{lang === 'vi' ? 'Số Tài Khoản' : 'Account Number'}</Label>
            <Input value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{lang === 'vi' ? 'Chủ Tài Khoản' : 'Account Owner'}</Label>
            <Input value={form.bank_owner} onChange={e => setForm({ ...form, bank_owner: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{lang === 'vi' ? 'Nạp Tối Thiểu (VND)' : 'Min Topup (VND)'}</Label>
            <Input type="number" value={form.min_topup} onChange={e => setForm({ ...form, min_topup: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>{lang === 'vi' ? 'Nạp Tối Đa (VND)' : 'Max Topup (VND)'}</Label>
            <Input type="number" value={form.max_topup} onChange={e => setForm({ ...form, max_topup: Number(e.target.value) })} />
          </div>
        </div>
        <Button onClick={() => onSave(form)} disabled={isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isPending ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : (lang === 'vi' ? 'Lưu Cài Đặt' : 'Save Settings')}
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
    { min_amount: 5000000, bonus_percent: 20, enabled: true },
  ];
  
  const [promotions, setPromotions] = useState<TopupPromotion[]>(
    data.promotions || defaultPromos
  );

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
    // Sort by min_amount ascending
    const sorted = [...promotions].sort((a, b) => a.min_amount - b.min_amount);
    onSave({ promotions: sorted });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          {lang === 'vi' ? 'Khuyến Mãi Nạp Tiền' : 'Topup Promotions'}
        </CardTitle>
        <CardDescription>
          {lang === 'vi' 
            ? 'Cấu hình % bonus khi người dùng nạp tiền. Mức cao hơn sẽ ghi đè mức thấp hơn.' 
            : 'Configure bonus % when users top up. Higher tiers override lower tiers.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {promotions.map((promo, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Switch 
                checked={promo.enabled} 
                onCheckedChange={(checked) => updatePromotion(index, 'enabled', checked)}
              />
              <div className="flex-1 grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {lang === 'vi' ? 'Từ số tiền (VND)' : 'Min Amount (VND)'}
                  </Label>
                  <Input 
                    type="number" 
                    value={promo.min_amount} 
                    onChange={e => updatePromotion(index, 'min_amount', Number(e.target.value))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {lang === 'vi' ? 'Bonus (%)' : 'Bonus (%)'}
                  </Label>
                  <Input 
                    type="number" 
                    value={promo.bonus_percent} 
                    onChange={e => updatePromotion(index, 'bonus_percent', Number(e.target.value))}
                    className="h-9"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive hover:text-destructive"
                onClick={() => removePromotion(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={addPromotion} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          {lang === 'vi' ? 'Thêm Mức Khuyến Mãi' : 'Add Promotion Tier'}
        </Button>

        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
          <p className="text-sm text-primary">
            <strong>{lang === 'vi' ? 'Ví dụ:' : 'Example:'}</strong>{' '}
            {lang === 'vi' 
              ? 'Nạp 1,000,000 VND với bonus 15% sẽ nhận được 1,150,000 VND vào ví.'
              : 'Top up 1,000,000 VND with 15% bonus will receive 1,150,000 VND in wallet.'}
          </p>
        </div>

        <Button onClick={handleSave} disabled={isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isPending ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : (lang === 'vi' ? 'Lưu Khuyến Mãi' : 'Save Promotions')}
        </Button>
      </CardContent>
    </Card>
  );
}

function NotificationSettings({ data, onSave, isPending, lang }: { data: Record<string, any>; onSave: (value: Record<string, any>) => void; isPending: boolean; lang: string }) {
  const [form, setForm] = useState({
    telegram_enabled: data.telegram_enabled ?? true,
    notify_on_order: data.notify_on_order ?? true,
    notify_on_topup: data.notify_on_topup ?? true,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{lang === 'vi' ? 'Cài Đặt Thông Báo' : 'Notification Settings'}</CardTitle>
        <CardDescription>
          {lang === 'vi' 
            ? 'Cấu hình thông báo Telegram (Bot Token và Chat ID đã được cấu hình trong secrets)'
            : 'Configure Telegram notifications (Bot Token and Chat ID are configured in secrets)'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">{lang === 'vi' ? 'Bật Thông Báo Telegram' : 'Enable Telegram Notifications'}</p>
              <p className="text-sm text-muted-foreground">
                {lang === 'vi' ? 'Gửi thông báo qua Telegram khi có sự kiện' : 'Send notifications via Telegram on events'}
              </p>
            </div>
            <Switch 
              checked={form.telegram_enabled} 
              onCheckedChange={checked => setForm({ ...form, telegram_enabled: checked })} 
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">{lang === 'vi' ? 'Thông Báo Đơn Hàng' : 'Order Notifications'}</p>
              <p className="text-sm text-muted-foreground">
                {lang === 'vi' ? 'Gửi thông báo khi có đơn hàng mới' : 'Notify when new orders are placed'}
              </p>
            </div>
            <Switch 
              checked={form.notify_on_order} 
              onCheckedChange={checked => setForm({ ...form, notify_on_order: checked })} 
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">{lang === 'vi' ? 'Thông Báo Nạp Tiền' : 'Topup Notifications'}</p>
              <p className="text-sm text-muted-foreground">
                {lang === 'vi' ? 'Gửi thông báo khi nạp tiền thành công' : 'Notify when topups are successful'}
              </p>
            </div>
            <Switch 
              checked={form.notify_on_topup} 
              onCheckedChange={checked => setForm({ ...form, notify_on_topup: checked })} 
            />
          </div>
        </div>

        <div className="bg-muted rounded-lg p-3">
          <p className="text-sm text-muted-foreground">
            <strong>{lang === 'vi' ? 'Lưu ý:' : 'Note:'}</strong>{' '}
            {lang === 'vi' 
              ? 'TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID được cấu hình trong Cloud Secrets.'
              : 'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are configured in Cloud Secrets.'}
          </p>
        </div>

        <Button onClick={() => onSave(form)} disabled={isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isPending ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : (lang === 'vi' ? 'Lưu Cài Đặt' : 'Save Settings')}
        </Button>
      </CardContent>
    </Card>
  );
}
