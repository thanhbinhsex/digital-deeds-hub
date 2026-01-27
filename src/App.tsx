import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import ProductsPage from "./pages/Products";
import ProductDetailPage from "./pages/ProductDetail";
import CheckoutPage from "./pages/Checkout";
import AccountLayout from "./pages/account/AccountLayout";
import ProfilePage from "./pages/account/ProfilePage";
import WalletPage from "./pages/account/WalletPage";
import TopupsPage, { NewTopupPage } from "./pages/account/TopupsPage";
import PurchasesPage from "./pages/account/PurchasesPage";
import AdminLayout from "./pages/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminTopupsPage from "./pages/admin/AdminTopupsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAuditPage from "./pages/admin/AdminAuditPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/p/:slug" element={<ProductDetailPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/account" element={<AccountLayout />}>
                  <Route index element={<ProfilePage />} />
                  <Route path="wallet" element={<WalletPage />} />
                  <Route path="purchases" element={<PurchasesPage />} />
                  <Route path="topups" element={<TopupsPage />} />
                  <Route path="topups/new" element={<NewTopupPage />} />
                </Route>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="orders" element={<AdminOrdersPage />} />
                  <Route path="topups" element={<AdminTopupsPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="audit" element={<AdminAuditPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
