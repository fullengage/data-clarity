import { Link } from 'react-router-dom';
import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    TrendingUp,
    DollarSign,
    Factory,
    Users,
    Package,
    Search,
    Sparkles,
    ArrowRight,
} from 'lucide-react';
import { DASHBOARD_TEMPLATES } from '@/lib/templateConfig';
import { DashboardTemplate } from '@/types/template';
import { cn } from '@/lib/utils';

// Mapa de ícones
const ICON_MAP: Record<string, any> = {
    TrendingUp,
    DollarSign,
    Factory,
    Users,
    Package,
};

export default function TemplateGallery() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Filtrar templates
    const filteredTemplates = DASHBOARD_TEMPLATES.filter(template => {
        const matchesSearch =
            template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory = !selectedCategory || template.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    // Categorias únicas
    const categories = Array.from(new Set(DASHBOARD_TEMPLATES.map(t => t.category)));

    return (
        <AppLayout>
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/60 mb-6 shadow-xl">
                            <Sparkles className="w-10 h-10 text-primary-foreground" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-4">
                            O que você quer analisar hoje?
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Escolha um modelo de dashboard e envie sua planilha.
                            <br />
                            <span className="font-medium text-foreground">A gente cuida do resto.</span>
                        </p>
                    </div>

                    {/* Search & Filters */}
                    <div className="mb-10 space-y-4">
                        {/* Search Bar */}
                        <div className="relative max-w-xl mx-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Buscar por vendas, financeiro, estoque..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 h-14 text-base rounded-2xl border-2 focus:border-primary shadow-lg"
                            />
                        </div>

                        {/* Category Filters */}
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button
                                variant={selectedCategory === null ? 'default' : 'outline'}
                                onClick={() => setSelectedCategory(null)}
                                className="rounded-full"
                            >
                                Todos
                            </Button>
                            {categories.map(category => (
                                <Button
                                    key={category}
                                    variant={selectedCategory === category ? 'default' : 'outline'}
                                    onClick={() => setSelectedCategory(category)}
                                    className="rounded-full capitalize"
                                >
                                    {category}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Templates Grid */}
                    {filteredTemplates.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-muted-foreground text-lg">
                                Nenhum template encontrado para "{searchQuery}"
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTemplates.map(template => (
                                <TemplateCard key={template.id} template={template} />
                            ))}
                        </div>
                    )}

                    {/* Footer Hint */}
                    <div className="mt-16 text-center">
                        <p className="text-sm text-muted-foreground">
                            💡 <span className="font-medium">Dica:</span> Não se preocupe se sua planilha estiver bagunçada.
                            Nossa IA organiza tudo automaticamente!
                        </p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

// Template Card Component
function TemplateCard({ template }: { template: DashboardTemplate }) {
    const IconComponent = ICON_MAP[template.icon] || Sparkles;

    return (
        <Link to={`/new/${template.id}`}>
            <div className="group relative h-full">
                {/* Card */}
                <div className={cn(
                    "relative h-full rounded-2xl border-2 border-border bg-card",
                    "hover:border-primary/50 hover:shadow-2xl hover:-translate-y-1",
                    "transition-all duration-300 overflow-hidden"
                )}>
                    {/* Gradient Header */}
                    <div className={cn(
                        "h-32 bg-gradient-to-br p-6 relative overflow-hidden",
                        template.gradient
                    )}>
                        {/* Decorative circles */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full" />

                        {/* Icon */}
                        <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                            <IconComponent className="w-8 h-8 text-white" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                            {template.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {template.description}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {template.tags.slice(0, 3).map(tag => (
                                <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-xs px-2 py-0.5"
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </div>

                        {/* Metrics Preview */}
                        <div className="space-y-2 mb-6">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                KPIs inclusos:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {template.defaultMetrics.slice(0, 4).map(metric => (
                                    <div
                                        key={metric.id}
                                        className="text-xs px-2 py-1 rounded-md bg-muted/50 text-foreground/70"
                                    >
                                        {metric.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTA Button */}
                        <Button
                            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            variant="outline"
                        >
                            Usar este modelo
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </div>
            </div>
        </Link>
    );
}
