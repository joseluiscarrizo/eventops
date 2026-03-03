import { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Circle, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const tipoConfig = {
  confirmar_asistencia: { icon: CheckCircle2, label: 'Confirmar Asistencia', color: 'text-blue-600' },
  recoger_uniforme: { icon: Circle, label: 'Recoger Uniforme', color: 'text-purple-600' },
  revisar_detalles: { icon: Clock, label: 'Revisar Detalles', color: 'text-amber-600' },
  confirmar_transporte: { icon: Circle, label: 'Confirmar Transporte', color: 'text-emerald-600' },
  reportar_llegada: { icon: Circle, label: 'Reportar Llegada', color: 'text-blue-600' },
  reportar_incidencias: { icon: AlertTriangle, label: 'Reportar Incidencias', color: 'text-red-600' },
  completar_servicio: { icon: CheckCircle2, label: 'Completar Servicio', color: 'text-green-600' }
};

const prioridadColors = {
  baja: 'bg-slate-100 text-slate-600',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-amber-100 text-amber-700',
  urgente: 'bg-red-100 text-red-700'
};

export default function TareasPendientes({ camareroId, pedidoId = null, compact = false }) {
  const queryClient = useQueryClient();

  const { data: tareas = [], isLoading } = useQuery({
    queryKey: ['tareas', camareroId, pedidoId],
    queryFn: () => {
      if (pedidoId) {
        return base44.entities.Tarea.filter({ camarero_id: camareroId, pedido_id: pedidoId }, 'orden');
      }
      return base44.entities.Tarea.filter({ camarero_id: camareroId }, '-created_date', 50);
    },
    enabled: !!camareroId
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 100),
    enabled: !pedidoId
  });

  const completarTareaMutation = useMutation({
    mutationFn: (tareaId) => base44.entities.Tarea.update(tareaId, {
      completada: true,
      fecha_completada: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      toast.success('Tarea completada');
    }
  });

  // Agrupar tareas por pedido
  const tareasPorPedido = useMemo(() => {
    if (pedidoId) {
      return [{ pedidoId, tareas }];
    }

    const grupos = {};
    tareas.forEach(t => {
      if (!grupos[t.pedido_id]) {
        grupos[t.pedido_id] = [];
      }
      grupos[t.pedido_id].push(t);
    });

    return Object.entries(grupos).map(([pedidoId, tareas]) => ({
      pedidoId,
      pedido: pedidos.find(p => p.id === pedidoId),
      tareas: tareas.sort((a, b) => (a.orden || 0) - (b.orden || 0))
    }));
  }, [tareas, pedidos, pedidoId]);

  const calcularProgreso = (tareasPedido) => {
    if (tareasPedido.length === 0) return 0;
    const completadas = tareasPedido.filter(t => t.completada).length;
    return Math.round((completadas / tareasPedido.length) * 100);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-slate-400">Cargando tareas...</div>;
  }

  if (tareas.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="text-slate-500">No tienes tareas pendientes</p>
      </Card>
    );
  }

  if (compact) {
    // Vista compacta para dashboard
    const pendientes = tareas.filter(t => !t.completada);
    return (
      <div className="space-y-2">
        {pendientes.slice(0, 3).map(tarea => {
          const config = tipoConfig[tarea.tipo];
          const Icon = config?.icon || Circle;
          return (
            <motion.div
              key={tarea.id}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-[#1e3a5f] transition-colors cursor-pointer"
              onClick={() => completarTareaMutation.mutate(tarea.id)}
            >
              <Icon className={`w-5 h-5 ${config?.color}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{tarea.titulo}</p>
                {tarea.fecha_limite && (
                  <p className="text-xs text-slate-500">
                    {format(parseISO(tarea.fecha_limite), 'dd MMM', { locale: es })}
                  </p>
                )}
              </div>
              <CheckCircle2 className="w-5 h-5 text-slate-300" />
            </motion.div>
          );
        })}
        {pendientes.length > 3 && (
          <p className="text-xs text-center text-slate-500">+{pendientes.length - 3} más</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tareasPorPedido.map(({ pedidoId, pedido, tareas: tareasPedido }) => {
        const progreso = calcularProgreso(tareasPedido);
        const pendientes = tareasPedido.filter(t => !t.completada).length;

        return (
          <Card key={pedidoId} className="overflow-hidden">
            {/* Header con info del pedido */}
            {pedido && (
              <div className="p-4 bg-slate-50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">{pedido.cliente}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {pedido.dia ? format(parseISO(pedido.dia), 'dd MMM yyyy', { locale: es }) : '-'}
                      <span>•</span>
                      <span>{pedido.lugar_evento}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#1e3a5f]">{progreso}%</p>
                    <p className="text-xs text-slate-500">{pendientes} pendientes</p>
                  </div>
                </div>
                <Progress value={progreso} className="h-2 mt-3" />
              </div>
            )}

            {/* Lista de tareas */}
            <ScrollArea className={pedido ? "max-h-96" : ""}>
              <div className="divide-y divide-slate-100">
                <AnimatePresence>
                  {tareasPedido.map(tarea => {
                    const config = tipoConfig[tarea.tipo];
                    const Icon = config?.icon || Circle;
                    const isAtrasada = tarea.fecha_limite && isPast(parseISO(tarea.fecha_limite)) && !tarea.completada;

                    return (
                      <motion.div
                        key={tarea.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className={`p-4 hover:bg-slate-50 transition-colors ${
                          tarea.completada ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => !tarea.completada && completarTareaMutation.mutate(tarea.id)}
                            disabled={tarea.completada}
                            className={`mt-1 transition-colors ${
                              tarea.completada 
                                ? 'text-emerald-500 cursor-default' 
                                : 'text-slate-300 hover:text-[#1e3a5f] cursor-pointer'
                            }`}
                          >
                            {tarea.completada ? (
                              <CheckCircle2 className="w-6 h-6 fill-emerald-500" />
                            ) : (
                              <Circle className="w-6 h-6" />
                            )}
                          </button>

                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className={`font-medium ${
                                  tarea.completada ? 'line-through text-slate-500' : 'text-slate-800'
                                }`}>
                                  {tarea.titulo}
                                </h4>
                                {tarea.descripcion && (
                                  <p className="text-sm text-slate-500 mt-1">{tarea.descripcion}</p>
                                )}
                              </div>
                              {tarea.prioridad !== 'media' && (
                                <Badge variant="outline" className={`${prioridadColors[tarea.prioridad]} text-xs`}>
                                  {tarea.prioridad}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Icon className={`w-3 h-3 ${config?.color}`} />
                                {config?.label}
                              </span>
                              {tarea.fecha_limite && (
                                <span className={`flex items-center gap-1 ${isAtrasada ? 'text-red-600 font-medium' : ''}`}>
                                  <Clock className="w-3 h-3" />
                                  {format(parseISO(tarea.fecha_limite), 'dd MMM', { locale: es })}
                                  {isAtrasada && ' (Atrasada)'}
                                </span>
                              )}
                              {tarea.completada && tarea.fecha_completada && (
                                <span className="text-emerald-600">
                                  ✓ {format(parseISO(tarea.fecha_completada), 'dd MMM HH:mm', { locale: es })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </Card>
        );
      })}
    </div>
  );
}