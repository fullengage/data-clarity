import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, BarChart3, Edit2, Download, CheckCircle2, ArrowRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const STEPS: OnboardingStep[] = [
    {
        title: 'Bem-vindo ao Data Clarity!',
        description: 'Transforme seus dados brutos em insights poderosos em segundos. Vamos te mostrar o básico para você dominar sua nova central de inteligência.',
        icon: <BarChart3 className="w-12 h-12 text-white" />,
        color: 'bg-dataviz-blue',
    },
    {
        title: 'Assistente de IA',
        description: 'Use a Barra de IA no topo para criar novos cards. Basta pedir o que você precisa, como "Quero ver o faturamento por região", e a IA fará o resto.',
        icon: <Sparkles className="w-12 h-12 text-white" />,
        color: 'bg-indigo-600',
    },
    {
        title: 'Edição e Personalização',
        description: 'Todos os cards e tabelas são editáveis. Clique no ícone de lápis para ajustar gráficos ou edite células da planilha diretamente.',
        icon: <Edit2 className="w-12 h-12 text-white" />,
        color: 'bg-amber-500',
    },
    {
        title: 'Compartilhe e Exporte',
        description: 'Gere relatórios em PDF perfeitos para impressão ou copie o link do dashboard para compartilhar com sua equipe em um clique.',
        icon: <Download className="w-12 h-12 text-white" />,
        color: 'bg-green-500',
    },
];

export default function OnboardingTour() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem('dataclarity_onboarding_seen');
        if (!hasSeenOnboarding) {
            setIsOpen(true);
        }
    }, []);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem('dataclarity_onboarding_seen', 'true');
        setIsOpen(false);
    };

    const step = STEPS[currentStep];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl">
                <div className={cn("h-48 flex items-center justify-center transition-colors duration-500", step.color)}>
                    <div className="animate-scale-in">
                        {step.icon}
                    </div>
                </div>

                <div className="p-8">
                    <div className="flex gap-1.5 mb-6 justify-center">
                        {STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-300",
                                    idx === currentStep ? "w-8 bg-dataviz-blue" : "w-1.5 bg-slate-200"
                                )}
                            />
                        ))}
                    </div>

                    <DialogHeader className="text-center">
                        <DialogTitle className="text-2xl font-bold text-slate-900 mb-2">
                            {step.title}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 text-lg leading-relaxed">
                            {step.description}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="mt-10 sm:justify-between items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={currentStep === 0}
                            className={cn("text-slate-400 hover:text-slate-600", currentStep === 0 && "opacity-0")}
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Anterior
                        </Button>

                        <Button
                            onClick={handleNext}
                            className={cn(
                                "rounded-xl px-8 h-12 text-lg font-semibold shadow-lg transition-all",
                                currentStep === STEPS.length - 1
                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                    : "bg-dataviz-blue hover:bg-dataviz-blue/90 text-white"
                            )}
                        >
                            {currentStep === STEPS.length - 1 ? (
                                <>
                                    Começar agora
                                    <CheckCircle2 className="w-5 h-5 ml-2" />
                                </>
                            ) : (
                                <>
                                    Próximo
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
