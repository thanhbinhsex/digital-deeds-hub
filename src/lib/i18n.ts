// Internationalization utilities
export type Language = 'en' | 'vi';

const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.products': 'Products',
    'nav.categories': 'Categories',
    'nav.about': 'About',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.logout': 'Logout',
    'nav.account': 'Account',
    'nav.wallet': 'Wallet',
    'nav.purchases': 'My Purchases',
    'nav.admin': 'Admin Panel',

    // Hero
    'hero.title': 'Premium Digital Tools',
    'hero.subtitle': 'Discover the best tools, templates, and digital assets to supercharge your workflow',
    'hero.cta': 'Browse Products',
    'hero.secondary': 'Learn More',

    // Products
    'products.title': 'Featured Products',
    'products.viewAll': 'View All',
    'products.addToCart': 'Add to Cart',
    'products.buyNow': 'Buy Now',
    'products.price': 'Price',
    'products.category': 'Category',
    'products.search': 'Search products...',
    'products.noResults': 'No products found',
    'products.featured': 'Featured',

    // Cart & Checkout
    'cart.title': 'Shopping Cart',
    'cart.empty': 'Your cart is empty',
    'cart.total': 'Total',
    'cart.checkout': 'Checkout',
    'cart.remove': 'Remove',
    'checkout.title': 'Checkout',
    'checkout.payWithWallet': 'Pay with Wallet',
    'checkout.walletBalance': 'Wallet Balance',
    'checkout.insufficientBalance': 'Insufficient balance',
    'checkout.topUp': 'Top Up Wallet',
    'checkout.processing': 'Processing...',
    'checkout.success': 'Payment Successful!',

    // Wallet
    'wallet.title': 'My Wallet',
    'wallet.balance': 'Balance',
    'wallet.topUp': 'Top Up',
    'wallet.transactions': 'Transaction History',
    'wallet.noTransactions': 'No transactions yet',
    'wallet.credit': 'Credit',
    'wallet.debit': 'Debit',

    // TopUp
    'topup.title': 'Top Up Request',
    'topup.amount': 'Amount',
    'topup.method': 'Payment Method',
    'topup.reference': 'Transaction Reference',
    'topup.proof': 'Payment Proof (optional)',
    'topup.note': 'Note',
    'topup.submit': 'Submit Request',
    'topup.pending': 'Pending',
    'topup.approved': 'Approved',
    'topup.denied': 'Denied',
    'topup.history': 'Top Up History',
    'topup.code': 'Transfer Code',
    'topup.bankInfo': 'Bank Info',
    'topup.autoApprove': 'Auto-approve when transfer detected',

    // Auth
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.fullName': 'Full Name',
    'auth.username': 'Username',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.loginSuccess': 'Welcome back!',
    'auth.signupSuccess': 'Account created successfully!',

    // Account
    'account.title': 'My Account',
    'account.profile': 'Profile',
    'account.settings': 'Settings',
    'account.updateProfile': 'Update Profile',

    // Purchases
    'purchases.title': 'My Purchases',
    'purchases.empty': 'No purchases yet',
    'purchases.download': 'Download',
    'purchases.viewKey': 'View License Key',
    'purchases.orderDate': 'Order Date',
    'purchases.status': 'Status',

    // Admin
    'admin.dashboard': 'Dashboard',
    'admin.products': 'Products',
    'admin.categories': 'Categories',
    'admin.orders': 'Orders',
    'admin.topups': 'Top Up Requests',
    'admin.coupons': 'Coupons',
    'admin.users': 'Users',
    'admin.blog': 'Blog',
    'admin.audit': 'Audit Log',
    'admin.settings': 'Settings',
    'admin.approve': 'Approve',
    'admin.deny': 'Deny',
    'admin.addProduct': 'Add Product',
    'admin.editProduct': 'Edit Product',
    'admin.checkBank': 'Check Bank',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Success',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.submit': 'Submit',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.all': 'All',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.amount': 'Amount',
    'common.actions': 'Actions',
  },
  vi: {
    // Navigation
    'nav.home': 'Trang chủ',
    'nav.products': 'Sản phẩm',
    'nav.categories': 'Danh mục',
    'nav.about': 'Giới thiệu',
    'nav.login': 'Đăng nhập',
    'nav.signup': 'Đăng ký',
    'nav.logout': 'Đăng xuất',
    'nav.account': 'Tài khoản',
    'nav.wallet': 'Ví tiền',
    'nav.purchases': 'Đơn hàng',
    'nav.admin': 'Quản trị',

    // Hero
    'hero.title': 'Công Cụ Số Cao Cấp',
    'hero.subtitle': 'Khám phá các công cụ, template và tài sản số tốt nhất để nâng cao hiệu suất làm việc',
    'hero.cta': 'Xem Sản Phẩm',
    'hero.secondary': 'Tìm Hiểu Thêm',

    // Products
    'products.title': 'Sản Phẩm Nổi Bật',
    'products.viewAll': 'Xem Tất Cả',
    'products.addToCart': 'Thêm Giỏ Hàng',
    'products.buyNow': 'Mua Ngay',
    'products.price': 'Giá',
    'products.category': 'Danh mục',
    'products.search': 'Tìm kiếm sản phẩm...',
    'products.noResults': 'Không tìm thấy sản phẩm',
    'products.featured': 'Nổi bật',

    // Cart & Checkout
    'cart.title': 'Giỏ Hàng',
    'cart.empty': 'Giỏ hàng trống',
    'cart.total': 'Tổng cộng',
    'cart.checkout': 'Thanh toán',
    'cart.remove': 'Xóa',
    'checkout.title': 'Thanh Toán',
    'checkout.payWithWallet': 'Thanh toán bằng Ví',
    'checkout.walletBalance': 'Số dư Ví',
    'checkout.insufficientBalance': 'Số dư không đủ',
    'checkout.topUp': 'Nạp tiền',
    'checkout.processing': 'Đang xử lý...',
    'checkout.success': 'Thanh toán thành công!',

    // Wallet
    'wallet.title': 'Ví Của Tôi',
    'wallet.balance': 'Số dư',
    'wallet.topUp': 'Nạp tiền',
    'wallet.transactions': 'Lịch sử giao dịch',
    'wallet.noTransactions': 'Chưa có giao dịch',
    'wallet.credit': 'Nạp vào',
    'wallet.debit': 'Trừ đi',

    // TopUp
    'topup.title': 'Yêu Cầu Nạp Tiền',
    'topup.amount': 'Số tiền',
    'topup.method': 'Phương thức',
    'topup.reference': 'Mã tham chiếu',
    'topup.proof': 'Chứng từ (tùy chọn)',
    'topup.note': 'Ghi chú',
    'topup.submit': 'Gửi yêu cầu',
    'topup.pending': 'Chờ duyệt',
    'topup.approved': 'Đã duyệt',
    'topup.denied': 'Từ chối',
    'topup.history': 'Lịch sử nạp tiền',
    'topup.code': 'Mã chuyển khoản',
    'topup.bankInfo': 'Thông tin ngân hàng',
    'topup.autoApprove': 'Tự động duyệt khi phát hiện chuyển khoản',

    // Auth
    'auth.login': 'Đăng nhập',
    'auth.signup': 'Đăng ký',
    'auth.email': 'Email',
    'auth.password': 'Mật khẩu',
    'auth.confirmPassword': 'Xác nhận mật khẩu',
    'auth.fullName': 'Họ tên',
    'auth.username': 'Tên đăng nhập',
    'auth.forgotPassword': 'Quên mật khẩu?',
    'auth.noAccount': 'Chưa có tài khoản?',
    'auth.hasAccount': 'Đã có tài khoản?',
    'auth.loginSuccess': 'Chào mừng trở lại!',
    'auth.signupSuccess': 'Tạo tài khoản thành công!',

    // Account
    'account.title': 'Tài Khoản',
    'account.profile': 'Hồ sơ',
    'account.settings': 'Cài đặt',
    'account.updateProfile': 'Cập nhật',

    // Purchases
    'purchases.title': 'Đơn Hàng Của Tôi',
    'purchases.empty': 'Chưa có đơn hàng',
    'purchases.download': 'Tải xuống',
    'purchases.viewKey': 'Xem License Key',
    'purchases.orderDate': 'Ngày đặt',
    'purchases.status': 'Trạng thái',

    // Admin
    'admin.dashboard': 'Tổng quan',
    'admin.products': 'Sản phẩm',
    'admin.categories': 'Danh mục',
    'admin.orders': 'Đơn hàng',
    'admin.topups': 'Yêu cầu nạp tiền',
    'admin.coupons': 'Mã giảm giá',
    'admin.users': 'Người dùng',
    'admin.blog': 'Blog',
    'admin.audit': 'Nhật ký',
    'admin.settings': 'Cài đặt',
    'admin.approve': 'Duyệt',
    'admin.deny': 'Từ chối',
    'admin.addProduct': 'Thêm sản phẩm',
    'admin.editProduct': 'Sửa sản phẩm',
    'admin.checkBank': 'Kiểm tra Bank',

    // Common
    'common.save': 'Lưu',
    'common.cancel': 'Hủy',
    'common.delete': 'Xóa',
    'common.edit': 'Sửa',
    'common.view': 'Xem',
    'common.loading': 'Đang tải...',
    'common.error': 'Có lỗi xảy ra',
    'common.success': 'Thành công',
    'common.confirm': 'Xác nhận',
    'common.back': 'Quay lại',
    'common.next': 'Tiếp',
    'common.submit': 'Gửi',
    'common.search': 'Tìm kiếm',
    'common.filter': 'Lọc',
    'common.all': 'Tất cả',
    'common.status': 'Trạng thái',
    'common.date': 'Ngày',
    'common.amount': 'Số tiền',
    'common.actions': 'Thao tác',
  },
};

export function getTranslation(key: string, lang: Language = 'en'): string {
  return translations[lang][key as keyof typeof translations['en']] || key;
}

export function useTranslations(lang: Language = 'en') {
  return {
    t: (key: string) => getTranslation(key, lang),
    lang,
  };
}

// Format currency - VND only (stored as VND integer, not cents)
export function formatCurrency(amount: number, _currency: string = 'VND', lang: Language = 'en'): string {
  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
export function formatDate(date: string | Date, lang: Language = 'en'): string {
  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
