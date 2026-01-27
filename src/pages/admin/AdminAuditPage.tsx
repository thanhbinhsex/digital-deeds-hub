import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/i18n';
import { FileText, CheckCircle, XCircle, Package, User, CreditCard } from 'lucide-react';

export default function AdminAuditPage() {
  const { t, lang } = useLanguage();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const getActionIcon = (action: string) => {
    if (action.includes('APPROVE')) return <CheckCircle className="h-4 w-4 text-success" />;
    if (action.includes('DENY')) return <XCircle className="h-4 w-4 text-destructive" />;
    if (action.includes('PRODUCT')) return <Package className="h-4 w-4 text-primary" />;
    if (action.includes('USER')) return <User className="h-4 w-4 text-accent" />;
    if (action.includes('TOPUP')) return <CreditCard className="h-4 w-4 text-warning" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      APPROVE_TOPUP: 'bg-success/20 text-success',
      DENY_TOPUP: 'bg-destructive/20 text-destructive',
      CREATE_PRODUCT: 'bg-primary/20 text-primary',
      UPDATE_PRODUCT: 'bg-accent/20 text-accent',
      DELETE_PRODUCT: 'bg-destructive/20 text-destructive',
    };
    return (
      <Badge className={`${colors[action] || 'bg-muted'} border-0`}>
        {action.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{t('admin.audit')}</h1>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === 'en' ? 'Action' : 'Hành động'}</TableHead>
                <TableHead>{lang === 'en' ? 'Admin' : 'Người thực hiện'}</TableHead>
                <TableHead>{lang === 'en' ? 'Entity' : 'Đối tượng'}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : logs && logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        {getActionBadge(log.action)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        Admin
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-muted-foreground">{log.entity_type}</span>
                        {log.entity_id && (
                          <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">
                            {log.entity_id.slice(0, 8)}...
                          </code>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(log.created_at, lang)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {lang === 'en' ? 'No audit logs' : 'Chưa có nhật ký'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
