import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  BellOff, 
  Calendar, 
  MessageSquare, 
  Clock, 
  Trash2, 
  CheckCircle2,
  AlertTriangle,
  Info,
  Moon
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const iconosPorTipo = {
  nueva_asignacion: Calendar,
  cambio_horario: Clock,
  cancelacion: BellOff,
  recordatorio: Bell,
  mensaje: MessageSquare,
  tarea_pendiente: CheckCircle2,
  alerta: AlertTriangle,
  sistema: Info
};

const coloresPorPrioridad = {
  baja: 'bg-slate-100 text-slate-700',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-amber-100 text-amber-700',
  urgente: 'bg-red-100 text-red-700'
};

export default function HistorialNotificaciones() {
  const [filtro, setFiltro] = useState('todas');
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: historial = [], isLoading } = useQuery({
    queryKey: ['historial-notificaciones', user?.id],
    queryFn: () => base44.entities.HistorialNotificacion.filter(
      { user_id: user.id },
      '-created_date',
      100
    ),
    enabled: !!user?.id
  });

  const marcarLeidaMutation = useMutation({
    mutationFn: (id) => base44.entities.HistorialNotificacion.update(id, { leida: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historial-notificaciones'] });
    }
  });

  const eliminarMutation = useMutation({
    mutationFn: (id) => base44.entities.HistorialNotificacion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historial-notificaciones'] });
    }
  });

  const marcarTodasLeidasMutation = useMutation({
    mutationFn: async () => {
      const noLeidas = historial.filter(n => !n.leida);
      await Promise.all(noLeidas.map(n => 
        base44.entities.HistorialNotificacion.update(n.id, { leida: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historial-notificaciones'] });
    }
  });

  const historialFiltrado = historial.filter(notif => {
    if (filtro === 'todas') return true;
    if (filtro === 'no_leidas') return !notif.leida;
    if (filtro === 'bloqueadas') return notif.bloqueada_no_molestar;
    return notif.prioridad === filtro;
  });

  const noLeidas = historial.filter(n => !n.leida).length;

  if (isLoading || !user) {
    return (
      <div className="text-center py-8 text-slate-500">
        Cargando historial...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={filtro} onValueChange={setFiltro}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="todas">
              Todas ({historial.length})
            </TabsTrigger>
            <TabsTrigger value="no_leidas">
              No Leídas ({noLeidas})
            </TabsTrigger>
            <TabsTrigger value="urgente">Urgentes</TabsTrigger>
            <TabsTrigger value="bloqueadas">
              <Moon className="w-4 h-4 mr-1" />
              Bloqueadas
            </TabsTrigger>
          </TabsList>

          {noLeidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => marcarTodasLeidasMutation.mutate()}
              disabled={marcarTodasLeidasMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Marcar todas leídas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[500px] pr-4">
          {historialFiltrado.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay notificaciones en esta categoría</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historialFiltrado.map((notif) => {
                const IconoTipo = iconosPorTipo[notif.tipo] || Bell;
                const colorPrioridad = coloresPorPrioridad[notif.prioridad] || coloresPorPrioridad.media;

                return (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-lg border transition-all ${
                      notif.leida 
                        ? 'bg-white border-slate-200' 
                        : 'bg-blue-50 border-blue-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colorPrioridad}`}>
                        <IconoTipo className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`font-medium ${notif.leida ? 'text-slate-700' : 'text-slate-900'}`}>
                            {notif.titulo}
                          </h4>
                          <div className="flex items-center gap-2 shrink-0">
                            {notif.bloqueada_no_molestar && (
                              <Badge variant="outline" className="text-xs">
                                <Moon className="w-3 h-3 mr-1" />
                                Bloqueada
                              </Badge>
                            )}
                            <Badge className={`text-xs ${colorPrioridad}`}>
                              {notif.prioridad}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-slate-600 mb-2">
                          {notif.mensaje}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            {format(new Date(notif.created_date), "d 'de' MMMM, HH:mm", { locale: es })}
                          </span>

                          <div className="flex items-center gap-2">
                            {!notif.leida && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => marcarLeidaMutation.mutate(notif.id)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Marcar leída
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarMutation.mutate(notif.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Tabs>
    </div>
  );
}