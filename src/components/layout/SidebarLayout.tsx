import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Home,
  Package,
  FileText,
  Code2,
  ShoppingCart,
  ChevronDown,
  Wallet,
  Building2,
  Bitcoin,
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Shield,
  Globe,
} from 'lucide-react';
import { FloatingContactButton } from './FloatingContactButton';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  label: string;
  labelVi: string;
  icon: React.ElementType;
  href?: string;
  children?: { label: string; labelVi: string; href: string }[];
}

interface Category {
  id: string;
  name: string;
  name_vi: string | null;
  slug: string;
  icon: string | null;
}

const navItems: NavItem[] = [
  { label: 'Home', labelVi: 'Trang Chủ', icon: Home, href: '/' },
  { label: 'Blog', labelVi: 'Blog', icon: FileText, href: '/blog' },
];

const historyItems: NavItem[] = [
  {
    label: 'History',
    labelVi: 'Lịch Sử',
    icon: ShoppingCart,
    children: [
      { label: 'Orders', labelVi: 'Đơn hàng', href: '/account/purchases' },
      { label: 'Top-up History', labelVi: 'Lịch sử nạp tiền', href: '/account/topups' },
    ],
  },
];

const depositItems: NavItem[] = [
  { label: 'Bank Transfer', labelVi: 'Ngân Hàng', icon: Building2, href: '/account/topups/new?method=bank' },
];

export function SidebarLayout({ children }: { children?: React.ReactNode }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, name_vi, slug, icon')
        .order('sort_order', { ascending: true });
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // Build dynamic software menu from categories
  const softwareItem: NavItem & { categoryIcons?: Record<string, string | null> } = {
    label: 'Software',
    labelVi: 'Phần Mềm',
    icon: Package,
    children: categories.map(cat => ({
      label: cat.name,
      labelVi: cat.name_vi || cat.name,
      href: `/products?category=${cat.slug}`,
    })),
    categoryIcons: categories.reduce((acc, cat) => {
      acc[cat.slug] = cat.icon;
      return acc;
    }, {} as Record<string, string | null>),
  };

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href.split('?')[0]);
  };

  const NavLink = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => {
    const [open, setOpen] = useState(false);

    if (item.children) {
      return (
        <div>
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              {lang === 'vi' ? item.labelVi : item.label}
            </span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children.map((child) => {
                const slug = child.href.split('category=')[1];
                const iconUrl = (item as any).categoryIcons?.[slug];
                return (
                  <Link
                    key={child.href}
                    to={child.href}
                    onClick={onClick}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
                  >
                    {iconUrl && (
                      <img src={iconUrl} alt="" className="h-5 w-5 rounded object-cover" />
                    )}
                    {lang === 'vi' ? child.labelVi : child.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        to={item.href || '/'}
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive(item.href || '/')
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <item.icon className="h-5 w-5" />
        {lang === 'vi' ? item.labelVi : item.label}
      </Link>
    );
  };

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
        {/* Main Nav */}
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.label} item={item} onClick={onLinkClick} />
          ))}
        </div>

        {/* Menu Section */}
        <div>
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {lang === 'vi' ? 'MENU' : 'MENU'}
          </p>
          <div className="space-y-1">
            <NavLink key="software" item={softwareItem} onClick={onLinkClick} />
            {historyItems.map((item) => (
              <NavLink key={item.label} item={item} onClick={onLinkClick} />
            ))}
          </div>
        </div>

        {/* Deposit Section */}
        <div>
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {lang === 'vi' ? 'NẠP TIỀN' : 'DEPOSIT'}
          </p>
          <div className="space-y-1">
            {depositItems.map((item) => (
              <NavLink key={item.label} item={item} onClick={onLinkClick} />
            ))}
          </div>
        </div>

      </div>
    </ScrollArea>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
              M
            </div>
            <div>
              <span className="font-display font-bold text-lg">MinMinTool</span>
              <p className="text-xs text-muted-foreground">GROWN UP</p>
            </div>
          </Link>
        </div>

        <SidebarContent />
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
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold">
              M
            </div>
            <span className="font-display font-bold">MinMinTool</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <SidebarContent onLinkClick={() => setMobileSidebarOpen(false)} />
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


          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="mr-4">
                <Globe className="h-4 w-4 mr-2" />
                {lang === 'en' ? 'English' : 'Tiếng Việt'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLang('en')}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang('vi')}>Tiếng Việt</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatarUrl || undefined} />
                    <AvatarFallback className="gradient-primary text-primary-foreground text-sm">
                      {profile?.fullName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{profile?.fullName || t('nav.account')}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-medium">{profile?.fullName}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account">
                    <User className="h-4 w-4 mr-2" />
                    {t('account.profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/wallet">
                    <Wallet className="h-4 w-4 mr-2" />
                    {t('nav.wallet')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/purchases">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {t('nav.purchases')}
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <Shield className="h-4 w-4 mr-2" />
                        {t('nav.admin')}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login">
              <Button variant="ghost" className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <span>{lang === 'vi' ? 'Chưa đăng nhập' : 'Login'}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children || <Outlet />}
        </main>
      </div>

      {/* Floating Contact Button */}
      <FloatingContactButton />
    </div>
  );
}
