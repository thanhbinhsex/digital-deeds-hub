import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, Package } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { signIn } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      toast.error(lang === 'en' ? 'Invalid email or password' : 'Email hoặc mật khẩu không đúng');
    } else {
      toast.success(t('auth.loginSuccess'));
      navigate('/');
    }
  };

  return (
    <SidebarLayout>
      <div className="min-h-full flex items-center justify-center p-4">
        {/* Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px]" />
        </div>

        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl gradient-primary shadow-glow mb-4">
              <Package className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">{t('auth.login')}</CardTitle>
            <CardDescription>
              {lang === 'en' ? 'Welcome back! Sign in to your account' : 'Chào mừng trở lại! Đăng nhập vào tài khoản'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.login')}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                {t('auth.noAccount')}{' '}
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  {t('auth.signup')}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </SidebarLayout>
  );
}
