import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart3,
  LayoutDashboard,
  Plus,
  History,
  Settings,
  LogOut,
  ChevronRight,
  User,
  Shield,
  Crown
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Meus Dashboards', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Novo Dashboard', href: '/new', icon: Plus },
  { name: 'Histórico', href: '/history', icon: History },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const { can, role } = usePermissions();

  const filteredNavigation = navigation.filter(item => {
    if (item.href === '/new') return can('create_dashboard');
    return true;
  });

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col no-print">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center px-6 border-b border-border">
          <img
            src="/logo-a4ia.png"
            alt="A4IA Logo"
            className="h-15 w-auto object-contain"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-dataviz-blue-light flex items-center justify-center">
              <User className="w-5 h-5 text-dataviz-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                {role === 'admin' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-1">
            <Link
              to="/subscription"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Crown className="w-4 h-4 text-dataviz-yellow" />
              Plano e Assinatura
            </Link>
            <Link
              to="/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configurações
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
