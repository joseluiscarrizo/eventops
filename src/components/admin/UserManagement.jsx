import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRole } from '@/contexts/RoleContext';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Users, Plus, Search, Loader2, UserX, Mail, Shield, RefreshCw } from 'lucide-react';

const ROLE_CONFIG = {
  admin: { label: 'Admin Level 1', color: 'bg-red-100 text-red-700' },
  admin_level2: { label: 'Admin Level 2', color: 'bg-purple-100 text-purple-700' },
  coordinador: { label: 'Coordinador', color: 'bg-blue-100 text-blue-700' },
  camarero: { label: 'Camarero', color: 'bg-emerald-100 text-emerald-700' },
  USER: { label: 'Usuario', color: 'bg-slate-100 text-slate-600' },
};

function RoleBadge({ role }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG['USER'];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

export const UserManagement = () => {
  const { isAdminLevel1 } = useRole();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [formData, setFormData] = useState({ email: '', full_name: '', role: 'camarero' });

  const { data: usuarios = [], isLoading, refetch } = useQuery({
    queryKey: ['usuarios-admin'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getUser', {});
        return res?.data?.users || res?.data || [];
      } catch (e) {
        console.warn('Error obteniendo usuarios:', e);
        return [];
      }
    },
    enabled: isAdminLevel1,
    staleTime: 30000
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke('createUser', data);
      if (!res?.data?.success && !res?.data?.user) {
        throw new Error(res?.data?.error || 'Error al crear usuario');
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success('Usuario creado exitosamente');
      setFormData({ email: '', full_name: '', role: 'camarero' });
      setShowCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] });
    },
    onError: (error) => {
      toast.error('Error al crear usuario: ' + error.message);
    }
  });

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!formData.email || !formData.full_name) {
      toast.error('Email y nombre son obligatorios');
      return;
    }
    createMutation.mutate(formData);
  };

  const usuariosFiltrados = usuarios.filter(u => {
    if (!busqueda) return true;
    const term = busqueda.toLowerCase();
    return (
      (u.email || '').toLowerCase().includes(term) ||
      (u.full_name || u.name || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
    );
  });

  if (!isAdminLevel1) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Acceso restringido a Admin Level 1</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#1e3a5f]" />
            Gestión de Usuarios
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {isLoading ? 'Cargando...' : `${usuarios.length} usuario(s) registrados`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button className="bg-[#1e3a5f] hover:bg-[#152a45]" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, email o rol..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            <span className="ml-3 text-slate-400">Cargando usuarios...</span>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <UserX className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">
              {busqueda ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
            </p>
            {!busqueda && (
              <Button className="mt-4 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />Crear primer usuario
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuariosFiltrados.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-[#1e3a5f] font-semibold text-sm">
                        {(usuario.full_name || usuario.name || usuario.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">{usuario.full_name || usuario.name || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="text-sm">{usuario.email}</span>
                    </div>
                  </TableCell>
                  <TableCell><RoleBadge role={usuario.role} /></TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${usuario.disabled ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                      {usuario.disabled ? 'Inactivo' : 'Activo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <UserX className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Desactivar usuario?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción desactivará la cuenta de <strong>{usuario.full_name || usuario.email}</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => toast.info('Para desactivar usuarios, usa el panel de Base44.')}>
                            Desactivar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="usuario@ejemplo.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo *</Label>
              <Input id="full_name" type="text" placeholder="Nombre Apellido" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                <SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="camarero">Camarero</SelectItem>
                  <SelectItem value="coordinador">Coordinador</SelectItem>
                  {isAdminLevel1 && <SelectItem value="admin_level2">Admin Level 2</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateDialog(false)} disabled={createMutation.isPending}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]" disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</> : <><Plus className="w-4 h-4 mr-2" />Crear Usuario</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
