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
import { Save, Globe, CreditCard, Bell, Settings } from 'lucide-react';

interface SiteSetting {
  id: string;
  key: string;
  value: Record<string, any>;
  description: string | null;
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
      const { error } = await supabase
        .from('site_settings')
        .update({ value })
        .eq('key', key);
      if (error) throw error;
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {lang === 'vi' ? 'Chung' : 'General'}
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {lang === 'vi' ? 'Thanh Toán' : 'Payment'}
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
    bank_name: data.bank_name || '',
    bank_account: data.bank_account || '',
    bank_owner: data.bank_owner || '',
    min_topup: data.min_topup || 10000,
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
        </div>
        <Button onClick={() => onSave(form)} disabled={isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isPending ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : (lang === 'vi' ? 'Lưu Cài Đặt' : 'Save Settings')}
        </Button>
      </CardContent>
    </Card>
  );
}

function NotificationSettings({ data, onSave, isPending, lang }: { data: Record<string, any>; onSave: (value: Record<string, any>) => void; isPending: boolean; lang: string }) {
  const [form, setForm] = useState({
    telegram_bot_token: data.telegram_bot_token || '',
    telegram_chat_id: data.telegram_chat_id || '',
    email_notifications: data.email_notifications ?? true,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{lang === 'vi' ? 'Cài Đặt Thông Báo' : 'Notification Settings'}</CardTitle>
        <CardDescription>{lang === 'vi' ? 'Cấu hình thông báo Telegram và Email' : 'Configure Telegram and Email notifications'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Telegram Bot Token</Label>
            <Input type="password" value={form.telegram_bot_token} onChange={e => setForm({ ...form, telegram_bot_token: e.target.value })} placeholder="123456:ABC-DEF..." />
          </div>
          <div className="space-y-2">
            <Label>Telegram Chat ID</Label>
            <Input value={form.telegram_chat_id} onChange={e => setForm({ ...form, telegram_chat_id: e.target.value })} placeholder="-100123456789" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.email_notifications} onCheckedChange={checked => setForm({ ...form, email_notifications: checked })} />
          <Label>{lang === 'vi' ? 'Bật thông báo Email' : 'Enable Email Notifications'}</Label>
        </div>
        <Button onClick={() => onSave(form)} disabled={isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isPending ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : (lang === 'vi' ? 'Lưu Cài Đặt' : 'Save Settings')}
        </Button>
      </CardContent>
    </Card>
  );
}
