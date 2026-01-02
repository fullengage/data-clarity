import { useAuth } from '@/hooks/useAuth';
import { Action, ROLE_PERMISSIONS } from '@/types/auth';

export function usePermissions() {
    const { user } = useAuth();

    const can = (action: Action, resourceOwnerId?: string): boolean => {
        if (!user || !user.role) return false;

        const rolePermissions = ROLE_PERMISSIONS[user.role];
        if (!rolePermissions || !Array.isArray(rolePermissions)) return false;

        const hasBasePermission = rolePermissions.includes(action);
        if (!hasBasePermission) return false;

        // Special checks for ownership if needed
        if (resourceOwnerId && user.role !== 'admin' && user.role !== 'manager') {
            // For some actions, even if you have the permission, you might only be able to do it on your own resources
            const ownershipSensitiveActions: Action[] = ['edit_dashboard', 'delete_dashboard', 'manage_sources'];

            if (ownershipSensitiveActions.includes(action)) {
                return user.id === resourceOwnerId;
            }
        }

        return true;
    };

    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'manager';
    const isCollaborator = user?.role === 'collaborator';
    const isViewer = user?.role === 'viewer';

    return {
        can,
        isAdmin,
        isManager,
        isCollaborator,
        isViewer,
        role: user?.role
    };
}
