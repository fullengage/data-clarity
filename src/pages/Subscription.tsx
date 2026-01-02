import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown, Zap, Shield, ArrowRight } from 'lucide-react';
import { PLANS } from '@/types/subscription';
import { cn } from '@/lib/utils';

export default function Subscription() {
    const { user } = useAuth();
    const { plan: currentPlanInfo, dashboardCount, isLoadingCount } = useSubscription();

    const handleUpgrade = (planId: string) => {
        window.open(`mailto:contato@dataclarity.com.br?subject=Upgrade para Plano ${planId.toUpperCase()}`, '_blank');
    };

    const getBadgeColor = (id: string) => {
        switch (id) {
            case 'free': return 'bg-slate-100 text-slate-600';
            case 'pro': return 'bg-primary/10 text-primary';
            case 'enterprise': return 'bg-dataviz-purple/10 text-dataviz-purple';
            default: return '';
        }
    };

    return (
        <AppLayout>
            <div className="p-8 max-w-6xl mx-auto">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-black text-foreground tracking-tight mb-3">Escolha seu Plano</h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        A escala do seu negócio define a escala da sua análise.
                        Comece grátis e evolua conforme sua necessidade.
                    </p>
                </div>

                {/* Grid de Planos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {(Object.values(PLANS) as any[]).map((p) => {
                        const isCurrent = user?.plan === p.id;
                        return (
                            <Card
                                key={p.id}
                                className={cn(
                                    "relative flex flex-col border-2 transition-all duration-300 hover:scale-[1.02]",
                                    isCurrent ? "border-primary shadow-xl ring-4 ring-primary/5" : "border-border/50 shadow-premium",
                                    p.id === 'pro' && !isCurrent && "border-primary/30"
                                )}
                            >
                                {isCurrent && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <Badge className="bg-primary text-white border-none px-4 py-1 text-xs font-bold shadow-lg">
                                            PLANO ATUAL
                                        </Badge>
                                    </div>
                                )}

                                {p.id === 'pro' && !isCurrent && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <Badge className="bg-amber-500 text-white border-none px-4 py-1 text-xs font-bold shadow-lg uppercase tracking-wider">
                                            Mais Popular
                                        </Badge>
                                    </div>
                                )}

                                <CardHeader className="text-center pt-8">
                                    <Badge className={cn("w-fit mx-auto mb-4 font-black uppercase text-[10px] tracking-[0.2em] border-none", getBadgeColor(p.id))}>
                                        {p.id}
                                    </Badge>
                                    <CardTitle className="text-3xl font-black">{p.name}</CardTitle>
                                    <CardDescription className="min-h-[40px] mt-2 leading-relaxed">
                                        {p.description}
                                    </CardDescription>
                                    <div className="mt-6 pt-4 border-t border-border/50">
                                        <span className="text-4xl font-black text-foreground">{p.price?.split('/')[0]}</span>
                                        <span className="text-muted-foreground text-sm font-medium">/{p.price?.split('/')[1] || 'mês'}</span>
                                    </div>
                                </CardHeader>

                                <CardContent className="flex-grow space-y-4 pt-4">
                                    <ul className="space-y-4">
                                        <li className="flex items-center gap-3 text-sm font-medium">
                                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-primary" />
                                            </div>
                                            <span>
                                                <strong>{p.limits.maxDashboards === Infinity ? 'Dashboards Ilimitados' : `${p.limits.maxDashboards} ${p.limits.maxDashboards === 1 ? 'Dashboard' : 'Dashboards'}`}</strong>
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-primary" />
                                            </div>
                                            <span>Uploads Ilimitados</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-primary" />
                                            </div>
                                            <span>{p.limits.maxUsers} {p.limits.maxUsers === 1 ? 'Usuário' : 'Usuários'}</span>
                                        </li>
                                        {[
                                            { label: 'IA de interpretação', key: 'aiInterpretration' },
                                            { label: 'Compartilhamento', key: 'sharing' },
                                            { label: 'Exportação PDF/Imagem', key: 'export' },
                                            { label: 'Suporte Prioritário', key: 'enterprise_only', enterprise: true }
                                        ].map((feat) => {
                                            const hasFeat = p.limits[feat.key as keyof typeof p.limits] || (feat.enterprise && p.id === 'enterprise');
                                            return (
                                                <li key={feat.label} className={cn("flex items-center gap-3 text-sm font-medium", !hasFeat && "opacity-30")}>
                                                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", hasFeat ? "bg-primary/10" : "bg-muted")}>
                                                        {hasFeat ? <Check className="w-3 h-3 text-primary" /> : <X className="w-3 h-3 text-muted-foreground" />}
                                                    </div>
                                                    <span>{feat.label}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </CardContent>

                                <CardFooter className="pb-8 pt-4">
                                    <Button
                                        disabled={isCurrent}
                                        onClick={() => handleUpgrade(p.id)}
                                        className={cn(
                                            "w-full h-12 font-bold transition-all active:scale-95",
                                            isCurrent ? "bg-muted text-muted-foreground border-border" :
                                                p.id === 'pro' ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" :
                                                    "variant-outline border-primary/20 text-primary hover:bg-primary/5"
                                        )}
                                    >
                                        {isCurrent ? 'Plano Ativado' : p.id === 'enterprise' ? 'Falar com Consultor' : 'Fazer Upgrade'}
                                        {!isCurrent && <ArrowRight className="w-4 h-4 ml-2" />}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>

                {/* Footer Motivation */}
                <div className="text-center p-10 rounded-3xl bg-muted/30 border border-border/50 max-w-4xl mx-auto">
                    <p className="text-xl font-medium italic text-muted-foreground leading-relaxed">
                        “Você pode explorar à vontade. Quando precisar crescer, o plano cresce com você.”
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-8 text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">
                        <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> IA Otimizada</span>
                        <span className="flex items-center gap-2 text-primary/60"><Shield className="w-4 h-4" /> Dados Criptografados</span>
                        <span className="flex items-center gap-2"><Crown className="w-4 h-4 font-black" /> Suporte 24/7</span>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
