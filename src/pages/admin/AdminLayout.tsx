import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  CreditCard,
  Users,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Home,
  FolderOpen,
  Newspaper,
  Ticket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const adminLinks = [
  { path: '/admin', icon: LayoutDashboard, labelKey: 'admin.dashboard', exact: true },
  { path: '/admin/products', icon: Package, labelKey: 'admin.products' },
  { path: '/admin/categories', icon: FolderOpen, labelKey: 'admin.categories' },
  { path: '/admin/orders', icon: ShoppingCart, labelKey: 'admin.orders' },
  { path: '/admin/topups', icon: CreditCard, labelKey: 'admin.topups' },
  { path: '/admin/coupons', icon: Ticket, labelKey: 'admin.coupons' },
  { path: '/admin/users', icon: Users, labelKey: 'admin.users' },
  { path: '/admin/blog', icon: Newspaper, labelKey: 'admin.blog' },
  { path: '/admin/audit', icon: FileText, labelKey: 'admin.audit' },
  { path: '/admin/settings', icon: Settings, labelKey: 'admin.settings' },
];

export default function AdminLayout() {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const { t, lang } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Package className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">Admin</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {adminLinks.map((link) => {
            const isActive = link.exact
              ? location.pathname === link.path
              : location.pathname.startsWith(link.path) && link.path !== '/admin';
            const isExactActive = location.pathname === link.path;

            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  (link.exact ? isExactActive : isActive)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <link.icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{t(link.labelKey)}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-border">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Home className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>{t('nav.home')}</span>}
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>{t('nav.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">Admin</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="p-2 space-y-1">
          {adminLinks.map((link) => {
            const isActive = link.exact
              ? location.pathname === link.path
              : location.pathname.startsWith(link.path) && link.path !== '/admin';

            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <link.icon className="h-5 w-5" />
                <span>{t(link.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile?.fullName || 'Admin'}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatarUrl || undefined} />
              <AvatarFallback className="gradient-primary text-primary-foreground">
                {profile?.fullName?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
