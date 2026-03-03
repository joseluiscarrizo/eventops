import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleProvider, useRole } from '@/contexts/RoleContext';

const TestComponent = () => {
  const { currentUser, hasPermission, isAdminLevel1 } = useRole();

  return (
    <div>
      <p>User: {currentUser?.name}</p>
      <p>Role: {currentUser?.role}</p>
      <p>Is Admin L1: {isAdminLevel1 ? 'Yes' : 'No'}</p>
    </div>
  );
};

describe('RoleContext', () => {
  it('should provide user role information', () => {
    const mockUser = {
      id: '1',
      name: 'Test User',
      role: 'ADMIN_LEVEL_1'
    };

    render(
      <RoleProvider initialUser={mockUser}>
        <TestComponent />
      </RoleProvider>
    );

    expect(screen.getByText('User: Test User')).toBeInTheDocument();
    expect(screen.getByText('Role: ADMIN_LEVEL_1')).toBeInTheDocument();
    expect(screen.getByText('Is Admin L1: Yes')).toBeInTheDocument();
  });

  it('should check permissions correctly for ADMIN_LEVEL_1', () => {
    const mockUser = { id: '1', name: 'Admin', role: 'ADMIN_LEVEL_1' };

    const PermissionTest = () => {
      const { hasPermission } = useRole();
      return (
        <div>
          <p>Can create users: {hasPermission('CREATE', 'users') ? 'Yes' : 'No'}</p>
          <p>Can delete: {hasPermission('DELETE', 'settings') ? 'Yes' : 'No'}</p>
        </div>
      );
    };

    render(
      <RoleProvider initialUser={mockUser}>
        <PermissionTest />
      </RoleProvider>
    );

    expect(screen.getByText('Can create users: Yes')).toBeInTheDocument();
    expect(screen.getByText('Can delete: Yes')).toBeInTheDocument();
  });

  it('should deny permissions for USER role', () => {
    const mockUser = { id: '2', name: 'Normal User', role: 'USER' };

    const PermissionTest = () => {
      const { hasPermission, isUser, isAdminLevel1, isAdminLevel2 } = useRole();
      return (
        <div>
          <p>Can create users: {hasPermission('CREATE', 'users') ? 'Yes' : 'No'}</p>
          <p>Is User: {isUser ? 'Yes' : 'No'}</p>
          <p>Is Admin L1: {isAdminLevel1 ? 'Yes' : 'No'}</p>
          <p>Is Admin L2: {isAdminLevel2 ? 'Yes' : 'No'}</p>
        </div>
      );
    };

    render(
      <RoleProvider initialUser={mockUser}>
        <PermissionTest />
      </RoleProvider>
    );

    expect(screen.getByText('Can create users: No')).toBeInTheDocument();
    expect(screen.getByText('Is User: Yes')).toBeInTheDocument();
    expect(screen.getByText('Is Admin L1: No')).toBeInTheDocument();
    expect(screen.getByText('Is Admin L2: No')).toBeInTheDocument();
  });

  it('should correctly identify ADMIN_LEVEL_2 role', () => {
    const mockUser = { id: '3', name: 'Manager', role: 'ADMIN_LEVEL_2' };

    const RoleTest = () => {
      const { isAdmin, isAdminLevel1, isAdminLevel2 } = useRole();
      return (
        <div>
          <p>Is Admin: {isAdmin ? 'Yes' : 'No'}</p>
          <p>Is Admin L1: {isAdminLevel1 ? 'Yes' : 'No'}</p>
          <p>Is Admin L2: {isAdminLevel2 ? 'Yes' : 'No'}</p>
        </div>
      );
    };

    render(
      <RoleProvider initialUser={mockUser}>
        <RoleTest />
      </RoleProvider>
    );

    expect(screen.getByText('Is Admin: Yes')).toBeInTheDocument();
    expect(screen.getByText('Is Admin L1: No')).toBeInTheDocument();
    expect(screen.getByText('Is Admin L2: Yes')).toBeInTheDocument();
  });

  it('should handle canManageUser correctly', () => {
    const mockUser = { id: 'user-1', name: 'User', role: 'USER' };

    const ManageTest = () => {
      const { canManageUser } = useRole();
      return (
        <div>
          <p>Can manage self: {canManageUser('user-1') ? 'Yes' : 'No'}</p>
          <p>Can manage other: {canManageUser('user-2') ? 'Yes' : 'No'}</p>
        </div>
      );
    };

    render(
      <RoleProvider initialUser={mockUser}>
        <ManageTest />
      </RoleProvider>
    );

    expect(screen.getByText('Can manage self: Yes')).toBeInTheDocument();
    expect(screen.getByText('Can manage other: No')).toBeInTheDocument();
  });

  it('should throw error when useRole is used outside RoleProvider', () => {
    const consoleError = console.error;
    console.error = () => {};

    const BadComponent = () => {
      useRole();
      return null;
    };

    try {
      expect(() => render(<BadComponent />)).toThrow('useRole must be used within RoleProvider');
    } finally {
      console.error = consoleError;
    }
  });
});
