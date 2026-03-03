// Updated rbacValidator with corrected TypeScript generics syntax and proper type definitions.

// Define types for roles and permissions
interface Role {
    name: string;
    permissions: string[];
}

interface Permissions {
    [key: string]: boolean;
}

// Function to validate user role against required permissions
function validateRole(role: Role, permissions: Permissions): boolean {
    return role.permissions.every(permission => permissions[permission]);
}

export { validateRole };