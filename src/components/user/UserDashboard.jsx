import { useRole } from '@/contexts/RoleContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const UserDashboard = () => {
  const { currentUser } = useRole();
  const navigate = useNavigate();
  const hoy = new Date().toISOString().split('T')[0];

  const { data: asignaciones = [], isLoading: loadingAsignaciones } = useQuery({
    queryKey: ['user-asignaciones', currentUser?.id],
    queryFn: () => base44.entities.AsignacionCamarero.filter({ camarero_id: currentUser?.id }),
    enabled: !!currentUser?.id,
    staleTime: 30000
  });

  const asignacionesFuturas = asignaciones.filter(a => a.dia >= hoy);
  const proximaAsignacion = asignacionesFuturas.sort((x, y) => (x.dia > y.dia ? 1 : -1))[0];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Mi Dashboard</h1>
        <p className="text-slate-500 mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium">Mis Eventos</h3>
            <div className="p-2 rounded-lg bg-blue-500">
              <Calendar className="w-4 h-4 text-white" />
            </div>
          </div>
          {loadingAsignaciones ? (
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
              <span className="text-slate-300 text-2xl font-bold">...</span>
            </div>
          ) : (
            <p className="text-3xl font-bold text-slate-800 mt-1">{asignacionesFuturas.length}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">Próximos eventos asignados</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium">Total Participaciones</h3>
            <div className="p-2 rounded-lg bg-emerald-500">
              <Clock className="w-4 h-4 text-white" />
            </div>
          </div>
          {loadingAsignaciones ? (
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
              <span className="text-slate-300 text-2xl font-bold">...</span>
            </div>
          ) : (
            <p className="text-3xl font-bold text-slate-800 mt-1">{asignaciones.length}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">Eventos totales asignados</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium">Próximo Evento</h3>
            <div className="p-2 rounded-lg bg-purple-500">
              <Calendar className="w-4 h-4 text-white" />
            </div>
          </div>
          {loadingAsignaciones ? (
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
            </div>
          ) : proximaAsignacion ? (
            <p className="text-sm font-semibold text-slate-800 mt-1">
              {format(parseISO(proximaAsignacion.dia), "d 'de' MMMM", { locale: es })}
            </p>
          ) : (
            <p className="text-sm text-slate-400 mt-1">Sin asignaciones próximas</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-600" />
            Mi Perfil
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Nombre</label>
              <p className="text-slate-800 font-medium mt-0.5">{currentUser?.name || currentUser?.full_name || '—'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Email</label>
              <p className="text-slate-800 mt-0.5">{currentUser?.email || '—'}</p>
            </div>
            {currentUser?.phone && (
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Teléfono</label>
                <p className="text-slate-800 mt-0.5">{currentUser.phone}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-600" />
            Acciones Rápidas
          </h2>
          <div className="space-y-2">
            <Button className="w-full bg-[#1e3a5f] hover:bg-[#152a45] justify-between" onClick={() => navigate('/confirmar-servicio')}>
              <span>✅ Confirmar servicios</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/disponibilidad')}>
              <span>📅 Mi disponibilidad</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/perfil-camarero')}>
              <span>👤 Mi perfil completo</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
