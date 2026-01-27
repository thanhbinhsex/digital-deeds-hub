import { Link } from 'react-router-dom';
import { Package, Github, Twitter, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function Footer() {
  const { lang } = useLanguage();

  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-glow">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">
                <span className="gradient-text">Tool</span>Store
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {lang === 'en'
                ? 'Premium digital tools and assets for developers and creators.'
                : 'Công cụ số cao cấp cho lập trình viên và nhà sáng tạo.'}
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-semibold mb-4">
              {lang === 'en' ? 'Products' : 'Sản phẩm'}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {lang === 'en' ? 'All Products' : 'Tất cả sản phẩm'}
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {lang === 'en' ? 'Categories' : 'Danh mục'}
                </Link>
              </li>
              <li>
                <Link to="/products?featured=true" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {lang === 'en' ? 'Featured' : 'Nổi bật'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold mb-4">
              {lang === 'en' ? 'Account' : 'Tài khoản'}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/account" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {lang === 'en' ? 'My Account' : 'Tài khoản'}
                </Link>
              </li>
              <li>
                <Link to="/account/purchases" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {lang === 'en' ? 'My Purchases' : 'Đơn hàng'}
                </Link>
              </li>
              <li>
                <Link to="/account/wallet" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {lang === 'en' ? 'Wallet' : 'Ví tiền'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">
              {lang === 'en' ? 'Support' : 'Hỗ trợ'}
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {lang === 'en' ? 'Help Center' : 'Trung tâm trợ giúp'}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {lang === 'en' ? 'Contact Us' : 'Liên hệ'}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {lang === 'en' ? 'Terms of Service' : 'Điều khoản'}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {lang === 'en' ? 'Privacy Policy' : 'Chính sách'}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/40">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} ToolStore. {lang === 'en' ? 'All rights reserved.' : 'Đã đăng ký bản quyền.'}
          </p>
        </div>
      </div>
    </footer>
  );
}
