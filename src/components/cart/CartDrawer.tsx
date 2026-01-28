import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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

                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                            <ShoppingBag className="h-6 w-6 text-primary/50" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{name}</h4>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(item.price, 'VND', lang)}
                        </div>

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

                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency(item.price * item.quantity, 'VND', lang)}
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
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('cart.total')}</span>
                <span className="font-bold text-lg">{formatCurrency(totalAmount, 'VND', lang)}</span>
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
