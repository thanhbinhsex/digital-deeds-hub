import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { toast } from 'sonner';
import { Trash2, Minus, Plus, Wallet, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, removeItem, updateQuantity, clearCart, totalAmount } = useCart();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch wallet balance
  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const canPayWithWallet = wallet && wallet.balance >= totalAmount;

  const handleCheckout = async () => {
    if (!user) {
      toast.error(lang === 'en' ? 'Please login first' : 'Vui lòng đăng nhập');
      navigate('/login');
      return;
    }

    if (!canPayWithWallet) {
      toast.error(t('checkout.insufficientBalance'));
      return;
    }

    setIsProcessing(true);

    try {
      // Use secure edge function for checkout
      const { data, error } = await supabase.functions.invoke('checkout', {
        body: {
          items: items.map(item => ({
            productId: item.productId,
            name: item.name,
            nameVi: item.nameVi,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      });

      if (error) {
        throw new Error(error.message || 'Checkout failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Checkout failed');
      }

      // Success
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(t('checkout.success'));
      navigate('/account/purchases');
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <SidebarLayout>
        <div className="container py-20 text-center">
          <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">{t('cart.empty')}</h1>
          <Button onClick={() => navigate('/products')} className="gradient-primary text-primary-foreground">
            {t('hero.cta')}
          </Button>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-8">{t('checkout.title')}</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const name = lang === 'vi' && item.nameVi ? item.nameVi : item.name;
              return (
                <Card key={item.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                            <ShoppingBag className="h-8 w-8 text-primary/50" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.price, 'VND', lang)}
                        </p>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Price & Remove */}
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(item.price * item.quantity, 'VND', lang)}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-2 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Order summary */}
          <div>
            <Card className="sticky top-24 border-border/50">
              <CardHeader>
                <CardTitle>{t('cart.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {lang === 'en' ? 'Subtotal' : 'Tạm tính'} ({items.length} {lang === 'en' ? 'items' : 'sản phẩm'})
                  </span>
                  <span>{formatCurrency(totalAmount, 'VND', lang)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>{t('cart.total')}</span>
                  <span className="gradient-text">
                    {formatCurrency(totalAmount, 'VND', lang)}
                  </span>
                </div>

                {/* Wallet info */}
                {user && wallet && (
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      <span className="font-medium">{t('checkout.walletBalance')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {formatCurrency(wallet.balance, 'VND', lang)}
                      </span>
                      {canPayWithWallet ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/30">
                          {lang === 'en' ? 'Sufficient' : 'Đủ'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/30">
                          {t('checkout.insufficientBalance')}
                        </span>
                      )}
                    </div>
                    {!canPayWithWallet && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => navigate('/account/topups')}
                      >
                        {t('checkout.topUp')}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={!user || !canPayWithWallet || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t('checkout.processing')}
                    </>
                  ) : (
                    <>
                      {t('checkout.payWithWallet')}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
