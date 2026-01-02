import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos para continuar.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('[Login] Starting login process...');
      await login(email, password);
      console.log('[Login] Login successful, navigating to /templates');
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      navigate('/templates');
    } catch (error: any) {
      console.error('[Login] Login failed:', error);

      // Extract error message from Supabase error
      let errorMessage = 'Verifique suas credenciais e tente novamente.';
      if (error?.message) {
        // Common Supabase auth error messages
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'E-mail ou senha incorretos.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Confirme seu e-mail antes de fazer login.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Muitas tentativas. Aguarde alguns minutos.';
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: 'Erro no login',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center justify-center mb-8">
            <img
              src="/logo-a4ia.png"
              alt="A4IA Logo"
              className="h-18 w-auto object-contain brightness-0 invert"
            />
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold text-primary-foreground leading-tight mb-6">
            Transforme planilhas confusas em{' '}
            <span className="text-primary-foreground/80">dados claros</span>
          </h1>

          <p className="text-lg text-primary-foreground/80 mb-8 max-w-md">
            Organize automaticamente suas planilhas de vendas, estoque, custos e muito mais.
            Sem complicação, sem conhecimento técnico.
          </p>

          <div className="space-y-4">
            {[
              'Upload simples de Excel, CSV ou Google Sheets',
              'Análise inteligente automática',
              'Dashboards visuais em segundos',
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-primary-foreground/90">
                <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <img
              src="/logo-a4ia.png"
              alt="A4IA Logo"
              className="h-15 w-auto object-contain"
            />
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold">Entrar na sua conta</CardTitle>
              <CardDescription>
                Acesse seus dashboards e análises
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Não tem uma conta?{' '}
                  <Link to="/register" className="text-primary font-medium hover:underline">
                    Criar conta grátis
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
