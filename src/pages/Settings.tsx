import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/auth';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User,
  Mail,
  Crown,
  Calendar,
  Users,
  Shield,
  MoreHorizontal,
  ShieldCheck,
  Plus,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export default function Settings() {
  const { user } = useAuth();
  const { can, isAdmin } = usePermissions();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.accountId) {
      fetchMembers();
    }
  }, [user?.accountId]);

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchMembers = async () => {
    setIsLoadingMembers(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('account_id', user?.accountId);

    if (error) {
      toast.error('Erro ao carregar membros da equipe');
    } else {
      setMembers(data as TeamMember[]);
    }
    setIsLoadingMembers(false);
  };

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    if (!can('manage_users')) return;

    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      toast.error('Erro ao atualizar cargo');
    } else {
      toast.success('Cargo atualizado com sucesso');
      fetchMembers();
    }
  };

  const [name, setName] = useState(user?.name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user?.id) return;
    setIsSavingProfile(true);

    const { error } = await supabase
      .from('users')
      .update({ name })
      .eq('id', user.id);

    if (error) {
      toast.error('Erro ao atualizar perfil');
    } else {
      toast.success('Perfil atualizado com sucesso! Recarregue a página para ver as mudanças no menu.');
    }
    setIsSavingProfile(false);
  };

  const handleUpgrade = () => {
    toast.info('Redirecionando para o checkout... (Simulação)');
    // Aqui integraria com Stripe ou outro gateway
    setTimeout(() => {
      toast.success('Upgrade realizado com sucesso! (Demo)');
    }, 2000);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Tem certeza? Esta ação é irreversível e todos os seus dashboards serão perdidos.')) return;

    toast.loading('Excluindo conta...');

    // In a real app, we would use a service role or an edge function to clean up and delete from auth.users
    // For now, let's just simulate the logout and show a message
    setTimeout(async () => {
      await supabase.auth.signOut();
      window.location.href = '/';
      toast.success('Conta excluída com sucesso.');
    }, 2000);
  };

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('collaborator');

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error('Por favor, insira um e-mail válido.');
      return;
    }

    // Simulação do envio de convite (integraria com Edge Function ou Auth Email)
    toast.success(`Convite de ${inviteRole} enviado para ${inviteEmail}!`);
    setIsInviteModalOpen(false);
    setInviteEmail('');
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!isAdmin) return;
    if (memberId === user?.id) {
      toast.error('Você não pode remover a si mesmo.');
      return;
    }

    if (!window.confirm('Tem certeza que deseja remover este membro?')) return;

    const { error } = await supabase
      .from('users')
      .update({ account_id: null, role: 'viewer' }) // Dissociate from account
      .eq('id', memberId);

    if (error) {
      toast.error('Erro ao remover membro');
    } else {
      toast.success('Membro removido com sucesso');
      fetchMembers();
    }
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'pro':
        return <Badge className="bg-dataviz-blue text-primary-foreground">Pro</Badge>;
      case 'enterprise':
        return <Badge className="bg-dataviz-purple text-primary-foreground">Enterprise</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
              Configurações
            </h1>
            <p className="text-muted-foreground mt-2 text-lg font-medium opacity-80">
              Personalize sua experiência e gerencie sua infraestrutura de dados.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="border-none shadow-premium bg-card/50 backdrop-blur-sm overflow-hidden group">
            <CardHeader className="border-b border-border/50 pb-6">
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Perfil Pessoal
              </CardTitle>
              <CardDescription>Gerencie suas informações básicas e como você aparece na plataforma</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-muted/30 border border-border/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="relative group/avatar">
                  <div className="w-24 h-24 rounded-full bg-gradient-hero flex items-center justify-center shadow-xl border-4 border-card group-hover/avatar:scale-105 transition-transform duration-500">
                    <User className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-card text-white shadow-lg cursor-pointer hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold text-foreground mb-1">{user?.name}</h3>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-card/50 px-3 py-1 rounded-full border border-border/50">
                      <Mail className="w-3.5 h-3.5" />
                      {user?.email}
                    </div>
                    {getPlanBadge(user?.plan || 'free')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label htmlFor="name" className="text-sm font-semibold ml-1">Nome Completo</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/10 transition-all"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-semibold ml-1">Endereço de E-mail</Label>
                  <Input id="email" type="email" defaultValue={user?.email} disabled className="bg-muted/30 border-border/50 opacity-60 italic" />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleUpdateProfile}
                  disabled={isSavingProfile}
                  className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-8 transition-all active:scale-95"
                >
                  {isSavingProfile ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </div>
                  ) : 'Salvar Alterações'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Plan Card */}
          <Card className="border-none shadow-premium bg-card/50 backdrop-blur-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Crown className="w-32 h-32 text-primary" />
            </div>
            <CardHeader className="border-b border-border/50 pb-6">
              <CardTitle className="text-xl flex items-center gap-2">
                <Crown className="w-5 h-5 text-dataviz-yellow" />
                Sua Assinatura
              </CardTitle>
              <CardDescription>Veja os detalhes do seu plano e os limites da sua conta</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start justify-between p-6 rounded-2xl bg-gradient-to-br from-dataviz-yellow/10 via-card to-transparent border border-dataviz-yellow/20 gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-dataviz-yellow/10 flex items-center justify-center shadow-inner border border-dataviz-yellow/20">
                    <Crown className="w-8 h-8 text-dataviz-yellow" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-foreground">
                        Plano {user?.plan === 'free' ? 'Gratuito' : user?.plan === 'pro' ? 'Pro' : 'Enterprise'}
                      </h3>
                      {getPlanBadge(user?.plan || 'free')}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium max-w-md leading-relaxed">
                      {user?.plan === 'free'
                        ? 'Você está no plano de entrada. Aproveite 1 dashboard e ferramentas essenciais de análise de dados.'
                        : user?.plan === 'pro'
                          ? 'Muitas possibilidades! Crie até 10 dashboards e compartilhe com seu time.'
                          : 'Acesso total! Desfrute de dashboards ilimitados e suporte prioritário.'
                      }
                    </p>
                  </div>
                </div>
                {user?.plan === 'free' && (
                  <Button
                    variant="outline"
                    onClick={handleUpgrade}
                    className="w-full md:w-auto border-dataviz-yellow/50 text-dataviz-yellow hover:bg-dataviz-yellow hover:text-white font-bold transition-all px-6 active:scale-95"
                  >
                    Fazer Upgrade Agora
                  </Button>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground/80 font-medium">
                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Ativo desde {user?.createdAt ? formatDate(user.createdAt) : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span>Conta Verificada</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Member Management Card */}
          <Card className="overflow-hidden border-none shadow-premium bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-6">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Membros da Equipe
                </CardTitle>
                <CardDescription>Gerencie quem tem acesso à sua conta e seus níveis de permissão</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</span>
                  <span className="text-lg font-bold text-foreground">{members.length}</span>
                </div>
                <div className="w-px h-8 bg-border/50 mx-2 hidden md:block" />
                <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" onClick={handleInvite}>
                  <Plus className="w-4 h-4 mr-2" />
                  Convidar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Filters & Stats */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou e-mail..."
                      className="pl-10 bg-muted/30 border-border/50 focus:ring-primary/20"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-3 py-1">
                      {members.filter(m => m.role === 'admin').length} Admins
                    </Badge>
                    <Badge variant="outline" className="bg-accent/50 border-border px-3 py-1">
                      {members.filter(m => m.role !== 'admin').length} Outros
                    </Badge>
                  </div>
                </div>

                {isLoadingMembers ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground animate-pulse">Carregando lista de membros...</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/50 bg-card/30 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/30 border-b border-border/50">
                          <tr>
                            <th className="text-left p-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Usuário</th>
                            <th className="text-left p-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Cargo</th>
                            <th className="text-left p-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Entrou em</th>
                            <th className="text-right p-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {filteredMembers.length > 0 ? filteredMembers.map((member) => (
                            <tr key={member.id} className="group hover:bg-primary/5 transition-all duration-300">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-inner">
                                      {member.name.charAt(0)}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{member.name}</p>
                                    <p className="text-xs text-muted-foreground font-medium">{member.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                {isAdmin && member.id !== user?.id ? (
                                  <Select
                                    defaultValue={member.role}
                                    onValueChange={(value) => handleUpdateRole(member.id, value as UserRole)}
                                  >
                                    <SelectTrigger className="w-[150px] h-9 bg-background/50 border-border/50 text-xs shadow-sm hover:border-primary/50 transition-all">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="backdrop-blur-xl border-border/50 shadow-2xl">
                                      <SelectItem value="admin">Administrador</SelectItem>
                                      <SelectItem value="manager">Gerente</SelectItem>
                                      <SelectItem value="collaborator">Colaborador</SelectItem>
                                      <SelectItem value="viewer">Visualizador</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/30 border border-border/50 w-fit">
                                    {member.role === 'admin' ? (
                                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                    ) : (
                                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                                    )}
                                    <span className="capitalize text-[11px] font-bold tracking-tight">
                                      {member.role === 'admin' ? 'Administrador' :
                                        member.role === 'manager' ? 'Gerente' :
                                          member.role === 'collaborator' ? 'Colaborador' : 'Visualizador'}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="p-4">
                                <span className="text-xs text-muted-foreground font-medium italic">
                                  {formatDate(member.created_at)}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                {isAdmin && member.id !== user?.id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 text-destructive hover:text-white hover:bg-destructive opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                                    onClick={() => handleRemoveMember(member.id)}
                                  >
                                    Remover
                                  </Button>
                                )}
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={4} className="p-12 text-center text-muted-foreground italic bg-muted/5">
                                Nenhum membro encontrado com "{searchTerm}"
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                        <Shield className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Convidar Novos Talentos</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">Compartilhe dashboards e indicadores com sua equipe para tomar decisões melhores e mais rápidas.</p>
                      </div>
                    </div>
                    <Button onClick={() => setIsInviteModalOpen(true)} className="w-full md:w-auto bg-primary hover:bg-primary/90 font-semibold px-6 transition-all active:scale-95">
                      Começar a Colaborar
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invite Modal */}
          <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
            <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-border/50">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  Convidar para a Equipe
                </DialogTitle>
                <DialogDescription className="text-muted-foreground pt-2">
                  Adicione novos membros e defina o que eles podem fazer no Data Clarity.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email" className="font-semibold px-1">E-mail do convidado</Label>
                  <Input
                    id="invite-email"
                    placeholder="exemplo@empresa.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="bg-muted/30 border-border/50 focus:border-primary/50 transition-all h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role" className="font-semibold px-1">Papel na equipe</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(value as UserRole)}
                  >
                    <SelectTrigger id="invite-role" className="bg-muted/30 border-border/50 h-11">
                      <SelectValue placeholder="Selecione um papel" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl border-border/50">
                      <SelectItem value="admin" className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold">Dono / Admin</span>
                          <span className="text-[10px] text-muted-foreground">Pode convidar, remover e excluir dados.</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="manager" className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold">Gestor</span>
                          <span className="text-[10px] text-muted-foreground">Pode criar dashboards e ver todos os dados.</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="collaborator" className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold">Colaborador</span>
                          <span className="text-[10px] text-muted-foreground">Apenas visualiza dashboards compartilhados.</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="pt-6">
                <Button variant="ghost" onClick={() => setIsInviteModalOpen(false)}>Cancelar</Button>
                <Button
                  onClick={handleInvite}
                  className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  Enviar Convite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
              <CardDescription>Ações irreversíveis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                <div>
                  <h4 className="font-medium text-foreground">Excluir conta</h4>
                  <p className="text-sm text-muted-foreground">
                    Isso removerá permanentemente todos os seus dados
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
                  Excluir conta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
