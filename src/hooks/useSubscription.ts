import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { PLANS, PlanType } from '@/types/subscription';

export function useSubscription() {
    const { user } = useAuth();
    const [dashboardCount, setDashboardCount] = useState<number | null>(null);
    const [isLoadingCount, setIsLoadingCount] = useState(true);

    // Admins are always treated as enterprise (unlimited)
    const isAdmin = user?.role === 'admin';
    const effectivePlan = isAdmin ? 'enterprise' : ((user?.plan as PlanType) || 'free');
    const currentPlan = PLANS[effectivePlan];

    useEffect(() => {
        if (user?.id) {
            fetchDashboardCount();
        } else {
            setIsLoadingCount(false);
        }
    }, [user?.id]);

    const fetchDashboardCount = async () => {
        if (!user?.id) return;

        setIsLoadingCount(true);
        try {
            // Count dashboards by joining with datasets and filtering by user_id
            const { count, error } = await supabase
                .from('dashboards')
                .select('id, datasets!inner(user_id)', { count: 'exact', head: true })
                .eq('datasets.user_id', user.id);

            if (error) throw error;
            setDashboardCount(count || 0);
        } catch (error) {
            console.error('Error fetching dashboard count:', error);
        } finally {
            setIsLoadingCount(false);
        }
    };


    const hasReachedDashboardLimit = () => {
        // Admins never have limits
        if (isAdmin) return false;
        if (dashboardCount === null) return false;
        return dashboardCount >= currentPlan.limits.maxDashboards;
    };

    return {
        plan: currentPlan,
        dashboardCount,
        isLoadingCount,
        hasReachedDashboardLimit,
        fetchDashboardCount,
    };
}
