import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, User, Shield } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_ROLES = [
  {
    value: 'user',
    label: 'User',
    description: 'Acceso básico: ver asignaciones, confirmar/rechazar',
    icon: User,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Acceso completo: gestión de usuarios, ver reportes, etc.',
    icon: Shield,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badgeClass: 'bg-purple-100 text-purple-700',
  },
];

export default function RoleAttributeManager({ user, isAdmin = false }) {
  const currentRole = user?.role || 'user';
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges = selectedRole !== currentRole;

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    try {
      await base44.auth.updateMe({ role: selectedRole });
      toast.success('Rol actualizado correctamente');
    } catch (error) {
      toast.error('Error al actualizar el rol: ' + (error.message || 'Error desconocido'));
      setSelectedRole(currentRole);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedRole(currentRole);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol actual</span>
        <Badge className={AVAILABLE_ROLES.find(r => r.value === currentRole)?.badgeClass || 'bg-slate-100 text-slate-700'}>
          {AVAILABLE_ROLES.find(r => r.value === currentRole)?.label || currentRole}
        </Badge>
      </div>

      <div className="space-y-2">
        {AVAILABLE_ROLES.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.value;
          const canToggle = isAdmin || role.value === 'user';

          return (
            <div
              key={role.value}
              className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                isSelected
                  ? `${role.bg} ${role.border}`
                  : 'bg-white border-slate-200'
              } ${canToggle ? 'cursor-pointer' : 'opacity-60'}`}
              onClick={() => canToggle && setSelectedRole(role.value)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? role.bg : 'bg-slate-100'}`}>
                  <Icon className={`w-4 h-4 ${isSelected ? role.color : 'text-slate-500'}`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isSelected ? role.color : 'text-slate-700'}`}>
                    {role.label}
                  </p>
                  <p className="text-xs text-slate-500">{role.description}</p>
                </div>
              </div>
              <Switch
                checked={isSelected}
                onCheckedChange={(checked) => {
                  if (!canToggle) return;
                  if (checked) {
                    setSelectedRole(role.value);
                  }
                }}
                disabled={!canToggle}
              />
            </div>
          );
        })}
      </div>

      {!isAdmin && (
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          Solo los administradores pueden cambiar roles de usuario
        </p>
      )}

      {hasChanges && isAdmin && (
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar Rol'}
          </Button>
        </div>
      )}
    </div>
  );
}
