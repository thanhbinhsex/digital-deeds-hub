import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useExchangeRate, convertCurrency } from '@/hooks/useExchangeRate';
import { formatCurrency } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  children?: React.ReactNode;
}

export function CartDrawer({ children }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalItems, totalAmount } = useCart();
  const { t, lang } = useLanguage();
  const { data: exchangeRate } = useExchangeRate();

  const rate = exchangeRate?.rate || 25000;

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs gradient-primary text-primary-foreground border-0">
                {totalItems}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t('cart.title')}
            {totalItems > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalItems}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">{t('cart.empty')}</p>
            <SheetTrigger asChild>
              <Link to="/products">
                <Button variant="outline">{t('hero.cta')}</Button>
              </Link>
            </SheetTrigger>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {items.map((item) => {
                  const name = lang === 'vi' && item.nameVi ? item.nameVi : item.name;
                  const vndPrice = convertCurrency(item.price * item.quantity, rate);

                  return (
                    <div key={item.id} className="flex gap-3">
                      {/* Image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                            <ShoppingBag className="h-6 w-6 text-primary/50" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{name}</h4>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(item.price, 'USD', lang)}
                          <span className="text-xs ml-1">
                            (~{vndPrice.toLocaleString('vi-VN')}₫)
                          </span>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Price & Remove */}
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency(item.price * item.quantity, 'USD', lang)}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive mt-1"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="pt-4 space-y-4">
              <Separator />
              
              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('cart.total')} (USD)</span>
                  <span className="font-semibold">{formatCurrency(totalAmount, 'USD', lang)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('cart.total')} (VND)</span>
                  <span className="font-semibold text-primary">
                    ~{convertCurrency(totalAmount, rate).toLocaleString('vi-VN')}₫
                  </span>
                </div>
                {exchangeRate?.date && (
                  <p className="text-xs text-muted-foreground text-right">
                    {lang === 'vi' ? 'Tỷ giá' : 'Rate'}: 1 USD = {rate.toLocaleString('vi-VN')}₫
                  </p>
                )}
              </div>

              <SheetTrigger asChild>
                <Link to="/checkout" className="block">
                  <Button className="w-full gradient-primary text-primary-foreground shadow-glow">
                    {t('cart.checkout')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </SheetTrigger>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
