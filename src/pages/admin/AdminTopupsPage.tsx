import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate } from '@/lib/i18n';
import { toast } from 'sonner';
import { Check, X, Clock, CheckCircle2, XCircle, Loader2, Search, Eye, RefreshCw } from 'lucide-react';

export default function AdminTopupsPage() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedTopup, setSelectedTopup] = useState<any>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'deny' | null>(null);
  const [isCheckingBank, setIsCheckingBank] = useState(false);

  const { data: topups, isLoading } = useQuery({
    queryKey: ['admin-topups', statusFilter, search],
    queryFn: async () => {
      let query = supabase
        .from('topup_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'approved' | 'denied');
      }

      if (search) {
        query = query.or(`topup_code.ilike.%${search}%,reference.ilike.%${search}%`);
      }

      const { data: topupsData, error } = await query;
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set(topupsData?.map(t => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      
      return topupsData?.map(topup => ({
        ...topup,
        profile: profiles?.find(p => p.user_id === topup.user_id)
      }));
    },
  });

  const processMutation = useMutation({
    mutationFn: async ({ topupId, action, note }: { topupId: string; action: 'approve' | 'deny'; note: string }) => {
      const response = await supabase.functions.invoke('approve-topup', {
        body: { topupId, action, adminNote: note },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-topups'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success(
        variables.action === 'approve'
          ? lang === 'en' ? 'Topup approved!' : 'Đã duyệt nạp tiền!'
          : lang === 'en' ? 'Topup denied!' : 'Đã từ chối nạp tiền!'
      );
      setSelectedTopup(null);
      setAdminNote('');
      setActionType(null);
    },
    onError: (error: any) => {
      toast.error(error.message || t('common.error'));
    },
  });

  const handleCheckBank = async () => {
    setIsCheckingBank(true);
    try {
      const response = await supabase.functions.invoke('check-bank-topup');
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        const approvedCount = response.data.results?.filter((r: any) => r.matched)?.length || 0;
        if (approvedCount > 0) {
          toast.success(
            lang === 'en' 
              ? `Auto-approved ${approvedCount} topup(s)!` 
              : `Đã tự động duyệt ${approvedCount} yêu cầu!`
          );
          queryClient.invalidateQueries({ queryKey: ['admin-topups'] });
        } else {
          toast.info(
            lang === 'en' 
              ? 'No matching transactions found' 
              : 'Không tìm thấy giao dịch khớp'
          );
        }
      } else {
        throw new Error(response.data?.error || 'Unknown error');
      }
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    } finally {
      setIsCheckingBank(false);
    }
  };

  const handleAction = (topup: any, action: 'approve' | 'deny') => {
    setSelectedTopup(topup);
    setActionType(action);
    setAdminNote('');
  };

  const confirmAction = () => {
    if (!selectedTopup || !actionType) return;
    processMutation.mutate({
      topupId: selectedTopup.id,
      action: actionType,
      note: adminNote,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            <Clock className="h-3 w-3 mr-1" />
            {t('topup.pending')}
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('topup.approved')}
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            <XCircle className="h-3 w-3 mr-1" />
            {t('topup.denied')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t('admin.topups')}</h1>
        <Button 
          onClick={handleCheckBank} 
          disabled={isCheckingBank}
          className="gradient-primary text-primary-foreground"
        >
          {isCheckingBank ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {t('admin.checkBank')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={lang === 'en' ? 'Search by code...' : 'Tìm theo mã...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="pending">{t('topup.pending')}</SelectItem>
            <SelectItem value="approved">{t('topup.approved')}</SelectItem>
            <SelectItem value="denied">{t('topup.denied')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === 'en' ? 'User' : 'Người dùng'}</TableHead>
                <TableHead>{t('topup.amount')}</TableHead>
                <TableHead>{t('topup.code')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : topups && topups.length > 0 ? (
                topups.map((topup) => (
                  <TableRow key={topup.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {topup.profile?.full_name || 'User'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {topup.profile?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-success">
                        +{formatCurrency(topup.amount, 'VND', lang)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-primary/10 text-primary px-2 py-1 rounded font-bold">
                        {topup.topup_code || '-'}
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(topup.status)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(topup.created_at, lang)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {topup.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success hover:bg-success/10"
                            onClick={() => handleAction(topup, 'approve')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {t('admin.approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleAction(topup, 'deny')}
                          >
                            <X className="h-4 w-4 mr-1" />
                            {t('admin.deny')}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTopup(topup);
                            setActionType(null);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('common.view')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {lang === 'en' ? 'No topup requests' : 'Không có yêu cầu nạp tiền'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!selectedTopup && !!actionType} onOpenChange={() => { setSelectedTopup(null); setActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve'
                ? lang === 'en' ? 'Approve Topup Request' : 'Duyệt yêu cầu nạp tiền'
                : lang === 'en' ? 'Deny Topup Request' : 'Từ chối yêu cầu nạp tiền'}
            </DialogTitle>
          </DialogHeader>

          {selectedTopup && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === 'en' ? 'User' : 'Người dùng'}</span>
                  <span className="font-medium">{selectedTopup.profile?.full_name || selectedTopup.profile?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('topup.amount')}</span>
                  <span className="font-semibold text-success">
                    +{formatCurrency(selectedTopup.amount, 'VND', lang)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('topup.code')}</span>
                  <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm font-bold">
                    {selectedTopup.topup_code}
                  </code>
                </div>
                {selectedTopup.note && (
                  <div>
                    <span className="text-muted-foreground">{lang === 'en' ? 'User note' : 'Ghi chú người dùng'}</span>
                    <p className="mt-1 text-sm">{selectedTopup.note}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {lang === 'en' ? 'Admin Note (optional)' : 'Ghi chú admin (tùy chọn)'}
                </label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={lang === 'en' ? 'Add a note...' : 'Thêm ghi chú...'}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedTopup(null); setActionType(null); }}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={confirmAction}
              disabled={processMutation.isPending}
              className={
                actionType === 'approve'
                  ? 'bg-success hover:bg-success/90 text-success-foreground'
                  : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              }
            >
              {processMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === 'approve' ? t('admin.approve') : t('admin.deny')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!selectedTopup && !actionType} onOpenChange={() => setSelectedTopup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === 'en' ? 'Topup Details' : 'Chi tiết nạp tiền'}</DialogTitle>
          </DialogHeader>
          {selectedTopup && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === 'en' ? 'User' : 'Người dùng'}</span>
                  <span className="font-medium">{selectedTopup.profile?.full_name || selectedTopup.profile?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('topup.amount')}</span>
                  <span className="font-semibold">{formatCurrency(selectedTopup.amount, 'VND', lang)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.status')}</span>
                  {getStatusBadge(selectedTopup.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('topup.code')}</span>
                  <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm font-bold">
                    {selectedTopup.topup_code}
                  </code>
                </div>
                {selectedTopup.bank_transaction_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === 'en' ? 'Bank TX' : 'Mã GD Bank'}</span>
                    <code className="bg-muted px-2 py-0.5 rounded text-sm">{selectedTopup.bank_transaction_id}</code>
                  </div>
                )}
                {selectedTopup.admin_note && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-sm">{lang === 'en' ? 'Admin note' : 'Ghi chú admin'}</span>
                    <p className="mt-1">{selectedTopup.admin_note}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
