import { useRole } from '@/contexts/RoleContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Calendar, UserCheck, Clock, ChevronRight, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function KpiCard({ titulo, valor, icono: Icono, color, loading, subtitulo }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-500 text-sm font-medium">{titulo}</h3>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icono className="w-4 h-4 text-white" />
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 mt-2">
          <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
          <span className="text-slate-300 text-2xl font-bold">...</span>
        </div>
      ) : (
        <p className="text-3xl font-bold text-slate-800 mt-1">{valor ?? 0}</p>
      )}
      {subtitulo && <p className="text-xs text-slate-400 mt-1">{subtitulo}</p>}
    </Card>
  );
}

export const AdminDashboard = () => {
  const { isAdminLevel1 } = useRole();
  const navigate = useNavigate();
  const hoy = new Date().toISOString().split('T')[0];

  const { data: camareros = [], isLoading: loadingCamareros } = useQuery({
    queryKey: ['admin-camareros'],
    queryFn: () => base44.entities.Camarero.list(),
    enabled: isAdminLevel1,
    staleTime: 60000
  });

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['admin-pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500),
    enabled: isAdminLevel1,
    staleTime: 60000
  });

  const { data: coordinadores = [], isLoading: loadingCoordinadores } = useQuery({
    queryKey: ['admin-coordinadores'],
    queryFn: () => base44.entities.Coordinador.list(),
    enabled: isAdminLevel1,
    staleTime: 60000
  });

  const { data: asignaciones = [], isLoading: loadingAsignaciones } = useQuery({
    queryKey: ['admin-asignaciones-pendientes'],
    queryFn: () => base44.entities.AsignacionCamarero.filter({ estado: 'pendiente' }),
    enabled: isAdminLevel1,
    staleTime: 30000
  });

  if (!isAdminLevel1) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Acceso denegado</p>
          <p className="text-slate-400 text-sm">No tienes permisos para ver este panel</p>
        </div>
      </div>
    );
  }

  const eventosActivos = pedidos.filter(p => p.dia >= hoy);
  const eventosHoy = pedidos.filter(p => p.dia === hoy);
  const camarerosDisponibles = camareros.filter(c => c.disponible && !c.en_reserva);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          Panel de Administración
        </h1>
        <p className="text-slate-500 mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          titulo="Camareros Totales"
          valor={camareros.length}
          icono={Users}
          color="bg-blue-500"
          loading={loadingCamareros}
          subtitulo={`${camarerosDisponibles.length} disponibles ahora`}
        />
        <KpiCard
          titulo="Eventos Próximos"
          valor={eventosActivos.length}
          icono={Calendar}
          color="bg-emerald-500"
          loading={loadingPedidos}
          subtitulo={eventosHoy.length > 0 ? `${eventosHoy.length} evento(s) hoy` : 'Ninguno hoy'}
        />
        <KpiCard
          titulo="Coordinadores"
          valor={coordinadores.length}
          icono={UserCheck}
          color="bg-purple-500"
          loading={loadingCoordinadores}
          subtitulo="Coordinadores activos"
        />
        <KpiCard
          titulo="Asignaciones Pendientes"
          valor={asignaciones.length}
          icono={Clock}
          color={asignaciones.length > 0 ? "bg-amber-500" : "bg-slate-400"}
          loading={loadingAsignaciones}
          subtitulo={asignaciones.length > 0 ? "Requieren confirmación" : "Todo al día"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1e3a5f]" />
            Gestionar Usuarios
          </h2>
          <div className="space-y-2">
            <Button className="w-full bg-[#1e3a5f] hover:bg-[#152a45] justify-between" onClick={() => navigate('/camareros')}>
              <span>🍽️ Gestionar camareros</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/coordinadores')}>
              <span>📋 Gestionar coordinadores</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#1e3a5f]" />
            Operaciones
          </h2>
          <div className="space-y-2">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 justify-between" onClick={() => navigate('/pedidos')}>
              <span>📦 Ver pedidos y eventos</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/informes')}>
              <span>📊 Ver informes</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>

      {asignaciones.length > 0 && (
        <Card className="mt-6 p-4 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-800 font-medium">{asignaciones.length} asignación(es) pendiente(s) de confirmación</p>
              <p className="text-amber-600 text-sm">Revisa las asignaciones que requieren respuesta</p>
            </div>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => navigate('/pedidos')}>
              Revisar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
