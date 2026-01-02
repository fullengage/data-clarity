import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Upload,
  Sparkles,
  LineChart,
  PieChart,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Zap,
  Shield
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/logo-a4ia.png"
              alt="A4IA Logo"
              className="h-14 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button>Começar grátis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dataviz-blue-light text-dataviz-blue text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Organize dados automaticamente
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
            Transforme planilhas{' '}
            <span className="text-gradient">confusas</span> em{' '}
            <span className="text-gradient">dados claros</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Envie sua planilha bagunçada e deixe nosso sistema organizar, analisar e criar
            dashboards profissionais automaticamente. Sem complicação técnica.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/register">
              <Button size="lg" className="h-14 px-8 text-base shadow-lg hover:shadow-xl transition-shadow">
                Começar grátis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="h-14 px-8 text-base">
                Já tenho conta
              </Button>
            </Link>
          </div>

          {/* Hero Visual */}
          <div className="relative mx-auto max-w-4xl">
            <div className="absolute inset-0 bg-gradient-hero opacity-10 blur-3xl rounded-full" />
            <div className="relative bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
              <div className="h-10 bg-muted/50 flex items-center gap-2 px-4 border-b border-border">
                <div className="w-3 h-3 rounded-full bg-dataviz-red" />
                <div className="w-3 h-3 rounded-full bg-dataviz-yellow" />
                <div className="w-3 h-3 rounded-full bg-dataviz-green" />
              </div>
              <div className="p-6">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Faturamento', value: 'R$ 1.4M', color: 'blue' },
                    { label: 'Pedidos', value: '2.847', color: 'orange' },
                    { label: 'Ticket Médio', value: 'R$ 512', color: 'green' },
                    { label: 'Crescimento', value: '+23%', color: 'purple' },
                  ].map((metric, i) => (
                    <div key={i} className={`p-4 rounded-xl bg-dataviz-${metric.color}-light border-l-4 border-dataviz-${metric.color}`}>
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className="text-xl font-bold text-foreground">{metric.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-40 bg-muted/30 rounded-xl flex items-center justify-center">
                    <LineChart className="w-16 h-16 text-dataviz-blue opacity-50" />
                  </div>
                  <div className="h-40 bg-muted/30 rounded-xl flex items-center justify-center">
                    <PieChart className="w-16 h-16 text-dataviz-orange opacity-50" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Como funciona
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Em 3 passos simples, transforme qualquer planilha em um dashboard profissional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Upload,
                title: '1. Envie sua planilha',
                description: 'Excel, CSV ou link do Google Sheets. Qualquer formato, qualquer tamanho, qualquer bagunça.',
                color: 'blue',
              },
              {
                icon: Zap,
                title: '2. Análise automática',
                description: 'Nossa IA identifica colunas, organiza dados e encontra padrões sem você configurar nada.',
                color: 'orange',
              },
              {
                icon: BarChart3,
                title: '3. Visualize insights',
                description: 'Receba um dashboard completo com métricas, gráficos e tabelas organizadas.',
                color: 'green',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl p-8 border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-xl bg-dataviz-${feature.color}-light flex items-center justify-center mb-6`}>
                  <feature.icon className={`w-7 h-7 text-dataviz-${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Para qualquer tipo de dado
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Funciona com vendas, estoque, custos, contatos e muito mais
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'Controle de Vendas',
              'Gestão de Estoque',
              'Análise de Custos',
              'Lista de Clientes',
              'Produção',
              'Financeiro',
              'RH e Folha',
              'Qualquer planilha!',
            ].map((useCase, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border"
              >
                <CheckCircle2 className="w-5 h-5 text-dataviz-green flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{useCase}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-hero rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            <div className="relative z-10">
              <FileSpreadsheet className="w-16 h-16 text-primary-foreground/80 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Pronto para organizar seus dados?
              </h2>
              <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto mb-8">
                Comece grátis agora mesmo. Nenhum cartão de crédito necessário.
              </p>
              <Link to="/register">
                <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-semibold">
                  Criar conta grátis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img
              src="/logo-a4ia.png"
              alt="A4IA Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Seus dados estão seguros e protegidos</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 A4 IA data analytics. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
