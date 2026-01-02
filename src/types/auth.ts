export type UserRole = 'admin' | 'manager' | 'collaborator' | 'viewer';

export type Action =
    | 'view_dashboard'
    | 'create_dashboard'
    | 'edit_dashboard'
    | 'delete_dashboard'
    | 'manage_users'
    | 'view_sources'
    | 'manage_sources'
    | 'view_account_settings'
    | 'use_ai_analysis';

export interface Permissions {
    can: Action[];
}

export const ROLE_PERMISSIONS: Record<UserRole, Action[]> = {
    admin: [
        'view_dashboard', 'create_dashboard', 'edit_dashboard', 'delete_dashboard',
        'manage_users', 'view_sources', 'manage_sources', 'view_account_settings',
        'use_ai_analysis'
    ],
    manager: [
        'view_dashboard', 'create_dashboard', 'edit_dashboard', 'delete_dashboard',
        'view_sources', 'manage_sources', 'use_ai_analysis'
    ],
    collaborator: [
        'view_dashboard', 'use_ai_analysis'
    ],
    viewer: [
        'view_dashboard'
    ]
};
