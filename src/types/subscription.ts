export type PlanType = 'free' | 'pro' | 'enterprise';

export interface PlanLimits {
    maxDashboards: number;
    maxUsers: number;
    unlimitedUploads: boolean;
    aiInterpretration: boolean;
    smartCards: boolean;
    sharing: boolean;
    export: boolean;
    fullHistory: boolean;
}

export interface Plan {
    id: PlanType;
    name: string;
    description: string;
    price?: string;
    limits: PlanLimits;
}

export const PLANS: Record<PlanType, Plan> = {
    free: {
        id: 'free',
        name: 'Gratuito',
        description: 'Ideal para experimentar o Data Clarity com seus primeiros dados.',
        price: 'R$ 0/mês',
        limits: {
            maxDashboards: 1,
            maxUsers: 1,
            unlimitedUploads: true,
            aiInterpretration: true,
            smartCards: true,
            sharing: false,
            export: false,
            fullHistory: false,
        }
    },
    pro: {
        id: 'pro',
        name: 'Profissional',
        description: 'Para profissionais que precisam de mais poder e dashboards.',
        price: 'R$ 49/mês',
        limits: {
            maxDashboards: 10,
            maxUsers: 3,
            unlimitedUploads: true,
            aiInterpretration: true,
            smartCards: true,
            sharing: true,
            export: true,
            fullHistory: true,
        }
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Dashboards ilimitados e recursos avançados para empresas de alto crescimento.',
        price: 'Sob consulta',
        limits: {
            maxDashboards: Infinity,
            maxUsers: 10,
            unlimitedUploads: true,
            aiInterpretration: true,
            smartCards: true,
            sharing: true,
            export: true,
            fullHistory: true,
        }
    }
};
