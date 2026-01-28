import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { 
  useNhhtoolUserInfo, 
  useNhhtoolHistory, 
  useNhhtoolActiveKey,
  useNhhtoolTransactionDetail 
} from '@/hooks/useNhhtoolApi';
import { toast } from 'sonner';
import { 
  User, 
  Wallet, 
  Key, 
  History, 
  CheckCircle, 
  XCircle,
  Download,
  Calendar,
  Loader2,
  ExternalLink
} from 'lucide-react';

export default function NhhtoolPage() {
  const { lang } = useLanguage();
  const [keyInput, setKeyInput] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);

  const { data: userInfo, isLoading: userLoading, refetch: refetchUserInfo } = useNhhtoolUserInfo();
  const { data: historyData, isLoading: historyLoading } = useNhhtoolHistory();
  const { data: transactionDetail, isLoading: detailLoading } = useNhhtoolTransactionDetail(selectedTransaction);
  const activeKeyMutation = useNhhtoolActiveKey();

  const handleActiveKey = async () => {
    if (!keyInput.trim()) {
      toast.error(lang === 'en' ? 'Please enter a key' : 'Vui lòng nhập key');
      return;
    }

    try {
      const result = await activeKeyMutation.mutateAsync(keyInput.trim());
      if (result.status === 'success') {
        toast.success(result.message || (lang === 'en' ? 'Key activated successfully!' : 'Kích hoạt key thành công!'));
        setKeyInput('');
        refetchUserInfo();
      } else {
        toast.error(result.msg || result.message || (lang === 'en' ? 'Failed to activate key' : 'Kích hoạt key thất bại'));
      }
    } catch (error) {
      toast.error(lang === 'en' ? 'Error activating key' : 'Lỗi kích hoạt key');
    }
  };

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <Card className="border-border/50 overflow-hidden">
        <div className="gradient-primary p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm mb-1">
                {lang === 'en' ? 'NHHTool Account' : 'Tài khoản NHHTool'}
              </p>
              {userLoading ? (
                <Skeleton className="h-8 w-32 bg-primary-foreground/20" />
              ) : userInfo?.status === 'success' ? (
                <div className="space-y-1">
                  <p className="text-xl font-bold text-primary-foreground flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {userInfo.username}
                  </p>
                  <p className="text-3xl font-bold text-primary-foreground">
                    {formatCurrency((userInfo.total_money || 0), 'VND', 'vi')}
                  </p>
                </div>
              ) : (
                <p className="text-primary-foreground/80">
                  {userInfo?.message || (lang === 'en' ? 'Unable to load account' : 'Không thể tải thông tin')}
                </p>
              )}
            </div>
            <div className="h-16 w-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
        </div>
      </Card>

      {/* Active Key Section */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {lang === 'en' ? 'Activate Key' : 'Kích hoạt Key'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder={lang === 'en' ? 'Enter your key...' : 'Nhập key của bạn...'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleActiveKey}
              disabled={activeKeyMutation.isPending}
              className="gradient-primary text-primary-foreground"
            >
              {activeKeyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                lang === 'en' ? 'Activate' : 'Kích hoạt'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {lang === 'en' ? 'Transaction History' : 'Lịch sử giao dịch'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : historyData?.history && historyData.history.length > 0 ? (
            <div className="space-y-3">
              {historyData.history.map((item, index) => (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <div 
                      className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedTransaction(item.transaction_code)}
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        item.status === 'success' 
                          ? 'bg-success/20 text-success' 
                          : 'bg-destructive/20 text-destructive'
                      }`}>
                        {item.status === 'success' ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          #{item.transaction_code}
                        </p>
                      </div>
                      <Badge variant={item.status === 'success' ? 'default' : 'destructive'}>
                        {item.status === 'success' 
                          ? (lang === 'en' ? 'Success' : 'Thành công')
                          : (lang === 'en' ? 'Failed' : 'Thất bại')
                        }
                      </Badge>
                    </div>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {lang === 'en' ? 'Transaction Details' : 'Chi tiết giao dịch'}
                      </DialogTitle>
                    </DialogHeader>
                    {detailLoading ? (
                      <div className="space-y-4 py-4">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-6 w-1/2" />
                      </div>
                    ) : transactionDetail?.data ? (
                      <div className="space-y-4 py-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {lang === 'en' ? 'Tool Name' : 'Tên tool'}
                          </p>
                          <p className="font-medium">{transactionDetail.data.title}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Key</p>
                          <code className="block p-3 bg-muted rounded-lg text-sm break-all">
                            {transactionDetail.data.key}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {lang === 'en' ? 'Expires:' : 'Hết hạn:'} {transactionDetail.data.expried}
                          </span>
                        </div>
                        {transactionDetail.data.link_down && (
                          <Button asChild className="w-full gradient-primary text-primary-foreground">
                            <a 
                              href={transactionDetail.data.link_down} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              {lang === 'en' ? 'Download' : 'Tải về'}
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground py-4">
                        {lang === 'en' ? 'Unable to load details' : 'Không thể tải chi tiết'}
                      </p>
                    )}
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {lang === 'en' ? 'No transactions yet' : 'Chưa có giao dịch nào'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
