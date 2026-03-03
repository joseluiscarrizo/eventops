import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Calendar, Clock, Users, MapPin, Layers, TrendingUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const estadosConfig = {
  planificado: {
    label: 'Planificado',
    color: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200'
  },
  en_curso: {
    label: 'En Curso',
    color: 'bg-amber-500',
    bgLight: 'bg-amber-50',
    border: 'border-amber-200'
  },
  finalizado: {
    label: 'Finalizado',
    color: 'bg-emerald-500',
    bgLight: 'bg-emerald-50',
    border: 'border-emerald-200'
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-slate-500',
    bgLight: 'bg-slate-50',
    border: 'border-slate-200'
  }
};

export default function TableroEventos() {
  const [vistaActual, setVistaActual] = useState('semana'); // dia, semana
  const [fechaSeleccionada, _setFechaSeleccionada] = useState(new Date());

  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500),
    staleTime: 5 * 60 * 1000, // Datos válidos por 5 minutos
    cacheTime: 10 * 60 * 1000
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 1000),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre'),
    staleTime: 10 * 60 * 1000, // Los camareros no cambian frecuentemente
    cacheTime: 20 * 60 * 1000
  });

  const updateEstadoMutation = useMutation({
    mutationFn: ({ id, estado }) => base44.entities.Pedido.update(id, { estado_evento: estado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Estado actualizado');
    }
  });

  // Calcular carga de trabajo por camarero
  const cargaTrabajoCamareros = useMemo(() => {
    const inicioSemana = startOfWeek(fechaSeleccionada, { locale: es });
    const finSemana = endOfWeek(fechaSeleccionada, { locale: es });

    const carga = {};

    camareros.forEach(camarero => {
      carga[camarero.id] = {
        nombre: camarero.nombre,
        eventos: 0,
        horas: 0,
        porDia: {}
      };
    });

    asignaciones.forEach(asignacion => {
      const pedido = pedidos.find(p => p.id === asignacion.pedido_id);
      if (!pedido || !pedido.dia) return;

      const fechaPedido = parseISO(pedido.dia);
      if (fechaPedido >= inicioSemana && fechaPedido <= finSemana) {
        if (carga[asignacion.camarero_id]) {
          carga[asignacion.camarero_id].eventos += 1;
          carga[asignacion.camarero_id].horas += pedido.t_horas || 0;

          const diaKey = format(fechaPedido, 'yyyy-MM-dd');
          if (!carga[asignacion.camarero_id].porDia[diaKey]) {
            carga[asignacion.camarero_id].porDia[diaKey] = 0;
          }
          carga[asignacion.camarero_id].porDia[diaKey] += 1;
        }
      }
    });

    return Object.values(carga).filter(c => c.eventos > 0).sort((a, b) => b.horas - a.horas);
  }, [camareros, asignaciones, pedidos, fechaSeleccionada]);

  // Agrupar pedidos por estado
  const pedidosPorEstado = useMemo(() => {
    const grupos = {
      planificado: [],
      en_curso: [],
      finalizado: [],
      cancelado: []
    };

    pedidos.forEach(pedido => {
      const estado = pedido.estado_evento || 'planificado';
      if (grupos[estado]) {
        grupos[estado].push(pedido);
      }
    });

    return grupos;
  }, [pedidos]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const nuevoEstado = destination.droppableId;

    updateEstadoMutation.mutate({
      id: draggableId,
      estado: nuevoEstado
    });
  };

  const getAsignacionesPedido = (pedidoId) => {
    return asignaciones.filter(a => a.pedido_id === pedidoId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <Layers className="w-8 h-8 text-[#1e3a5f]" />
            Tablero de Eventos
          </h1>
          <p className="text-slate-500 mt-1">Gestiona el estado de tus eventos arrastrando y soltando</p>
        </div>

        {/* Carga de Trabajo */}
        <Card className="p-6 mb-6 bg-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#1e3a5f]" />
              Carga de Trabajo - {format(fechaSeleccionada, 'MMMM yyyy', { locale: es })}
            </h3>
            <div className="flex gap-2">
              <Button
                variant={vistaActual === 'dia' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVistaActual('dia')}
              >
                Día
              </Button>
              <Button
                variant={vistaActual === 'semana' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVistaActual('semana')}
              >
                Semana
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {cargaTrabajoCamareros.slice(0, 12).map(carga => (
              <div key={carga.nombre} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-medium text-sm text-slate-800 truncate">{carga.nombre}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-600">{carga.eventos} eventos</span>
                  <Badge variant="outline" className="text-xs">{carga.horas}h</Badge>
                </div>
              </div>
            ))}
          </div>

          {cargaTrabajoCamareros.length === 0 && (
            <p className="text-center text-slate-400 py-4">No hay carga de trabajo en esta semana</p>
          )}
        </Card>

        {/* Tablero Kanban */}
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {Object.entries(estadosConfig).map(([estado, config]) => {
                const pedidosEstado = pedidosPorEstado[estado] || [];
                
                return (
                  <div key={estado} className="flex flex-col">
                    <div className={`${config.color} text-white rounded-t-xl px-4 py-3 flex items-center justify-between`}>
                      <h3 className="font-semibold">{config.label}</h3>
                      <Badge variant="secondary" className="bg-white/20 text-white">
                        {pedidosEstado.length}
                      </Badge>
                    </div>

                    <Droppable droppableId={estado}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`${config.bgLight} ${config.border} border-x border-b rounded-b-xl p-3 min-h-[500px] space-y-3 ${
                            snapshot.isDraggingOver ? 'bg-opacity-70' : ''
                          }`}
                        >
                          {pedidosEstado.map((pedido, index) => {
                            const asignacionesPedido = getAsignacionesPedido(pedido.id);
                            
                            return (
                              <Draggable key={pedido.id} draggableId={pedido.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white rounded-lg p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow ${
                                      snapshot.isDragging ? 'shadow-xl rotate-2' : ''
                                    }`}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <h4 className="font-semibold text-slate-800 text-sm">{pedido.cliente}</h4>
                                      <Badge variant="outline" className="text-xs">
                                        {asignacionesPedido.length}/{pedido.cantidad_camareros || 0}
                                      </Badge>
                                    </div>

                                    <div className="space-y-1.5 text-xs text-slate-600">
                                      <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3" />
                                        {pedido.dia ? format(parseISO(pedido.dia), 'dd MMM', { locale: es }) : '-'}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        {pedido.entrada || '-'} - {pedido.salida || '-'}
                                      </div>
                                      {pedido.lugar_evento && (
                                        <div className="flex items-center gap-1.5">
                                          <MapPin className="w-3 h-3" />
                                          <span className="truncate">{pedido.lugar_evento}</span>
                                        </div>
                                      )}
                                    </div>

                                    {asignacionesPedido.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                          <Users className="w-3 h-3" />
                                          {asignacionesPedido.slice(0, 2).map(a => a.camarero_nombre).join(', ')}
                                          {asignacionesPedido.length > 2 && ` +${asignacionesPedido.length - 2}`}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}