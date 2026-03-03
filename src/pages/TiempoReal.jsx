import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Search, Calendar, RefreshCw, Star, Users, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import ValoracionCamarero from '../components/camareros/ValoracionCamarero';
import HojaAsistencia from '../components/tiemporeal/HojaAsistencia';
import EnviarWhatsApp from '../components/whatsapp/EnviarWhatsApp';
import WhatsAppEventos from '../components/whatsapp/WhatsAppEventos';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import PullToRefresh from '../components/ui/PullToRefresh';

const estadoColors = {
  pendiente: 'bg-slate-100',
  enviado: 'bg-orange-200',
  confirmado: 'bg-emerald-200',
  alta: 'bg-blue-200'
};

export default function TiempoReal() {
  const [busqueda, setBusqueda] = useState('');
  const [vistaCalendario, setVistaCalendario] = useState('dia'); // 'dia', 'semana', 'mes'
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [_filtroFecha, _setFiltroFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [valoracionModal, setValoracionModal] = useState({ open: false, camarero: null, pedido: null });
  const [detalleEventoModal, setDetalleEventoModal] = useState({ open: false, pedido: null });

  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 200),
    refetchInterval: 10000 // Refrescar cada 10 segundos
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: asignaciones = [], isLoading: loadingAsignaciones } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 1000),
    refetchInterval: 5000 // Refrescar cada 5 segundos
  });

  const createAsignacionMutation = useMutation({
    mutationFn: (data) => base44.entities.AsignacionCamarero.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
    },
    onError: (error) => {
      console.error('Error al crear asignación:', error);
      toast.error('Error al crear asignación: ' + (error.message || 'Error desconocido'));
    }
  });

  const updateAsignacionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AsignacionCamarero.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['asignaciones'] });
      const previous = queryClient.getQueryData(['asignaciones']);
      queryClient.setQueryData(['asignaciones'], (old = []) =>
        old.map(a => a.id === id ? { ...a, ...data } : a)
      );
      return { previous };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['asignaciones'], ctx.previous);
      toast.error('Error al actualizar asignación: ' + (error.message || 'Error desconocido'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
    }
  });

  // Calcular rango de fechas según vista
  const rangoFechas = useMemo(() => {
    if (vistaCalendario === 'dia') {
      return { inicio: fechaSeleccionada, fin: fechaSeleccionada };
    } else if (vistaCalendario === 'semana') {
      return {
        inicio: startOfWeek(fechaSeleccionada, { weekStartsOn: 1 }),
        fin: endOfWeek(fechaSeleccionada, { weekStartsOn: 1 })
      };
    } else {
      return {
        inicio: startOfMonth(fechaSeleccionada),
        fin: endOfMonth(fechaSeleccionada)
      };
    }
  }, [vistaCalendario, fechaSeleccionada]);

  // Días a mostrar en el calendario
  const diasCalendario = useMemo(() => {
    return eachDayOfInterval({ start: rangoFechas.inicio, end: rangoFechas.fin });
  }, [rangoFechas]);

  // Eventos agrupados por día
  const eventosPorDia = useMemo(() => {
    const grupos = {};
    diasCalendario.forEach(dia => {
      const diaStr = format(dia, 'yyyy-MM-dd');
      grupos[diaStr] = pedidos.filter(p => p.dia === diaStr);
    });
    return grupos;
  }, [pedidos, diasCalendario]);

  // Generar filas: una por cada slot de camarero de cada pedido
  const filas = useMemo(() => {
    const result = [];
    
    const pedidosFiltrados = pedidos.filter(p => {
      const matchBusqueda = !busqueda || 
        p.cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.lugar_evento?.toLowerCase().includes(busqueda.toLowerCase());
      
      // Filtrar por rango de fechas del calendario
      if (p.dia) {
        const fechaPedido = parseISO(p.dia);
        const enRango = fechaPedido >= rangoFechas.inicio && fechaPedido <= rangoFechas.fin;
        if (!enRango) return false;
      }
      
      return matchBusqueda;
    }).sort((a, b) => (a.dia || '').localeCompare(b.dia || ''));

    pedidosFiltrados.forEach(pedido => {
      const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
      const cantidadSlots = pedido.cantidad_camareros || 1;

      for (let i = 0; i < cantidadSlots; i++) {
        const asignacion = asignacionesPedido[i];
        result.push({
          pedido,
          slot: i + 1,
          asignacion: asignacion || null
        });
      }
    });

    return result;
  }, [pedidos, asignaciones, busqueda, rangoFechas]);

  // Obtener camareros disponibles para un pedido
  const getCamarerosDisponibles = (pedido, asignacionActual) => {
    const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
    const idsAsignados = asignacionesPedido.map(a => a.camarero_id);
    
    return camareros.filter(c => {
      if (asignacionActual && c.id === asignacionActual.camarero_id) return true;
      if (idsAsignados.includes(c.id)) return false;
      return c.disponible;
    });
  };

  const handleAsignarCamarero = (pedido, camarero) => {
    createAsignacionMutation.mutate({
      pedido_id: pedido.id,
      camarero_id: camarero.id,
      camarero_nombre: camarero.nombre,
      camarero_codigo: camarero.codigo,
      estado: 'pendiente',
      fecha_pedido: pedido.dia,
      hora_entrada: pedido.entrada,
      hora_salida: pedido.salida
    });
  };

  const handleCambiarEstado = (asignacionId, nuevoEstado) => {
    updateAsignacionMutation.mutate({ id: asignacionId, data: { estado: nuevoEstado } });
  };

  const isLoading = loadingPedidos || loadingAsignaciones;

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    await queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
    await queryClient.invalidateQueries({ queryKey: ['camareros'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              <Clock className="w-8 h-8 text-[#1e3a5f]" />
              Tiempo Real
            </h1>
            <p className="text-slate-500 mt-1">Vista en tiempo real de todos los pedidos y asignaciones</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Actualizando automáticamente
          </div>
        </div>

        <Tabs defaultValue="asignaciones" className="w-full">
          <TabsList className="mb-5 bg-white border border-slate-200 shadow-sm">
            <TabsTrigger value="asignaciones" className="gap-2">
              <Users className="w-4 h-4" />
              Asignaciones
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp">
            <WhatsAppEventos
              pedidos={pedidos}
              asignaciones={asignaciones}
              camareros={camareros}
            />
          </TabsContent>

          <TabsContent value="asignaciones">

        {/* Eventos Próximos */}
        <Card className="mb-6 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#1e3a5f]" />
              Próximos Eventos (ordenados por fecha)
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pedidos
                .filter(p => p.dia)
                .sort((a, b) => a.dia.localeCompare(b.dia))
                .slice(0, 6)
                .map(pedido => {
                  const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
                  return (
                    <Card 
                      key={pedido.id} 
                      className={`p-3 hover:shadow-md transition-shadow cursor-pointer ${
                        asignacionesPedido.length === pedido.cantidad_camareros && 
                        asignacionesPedido.every(a => a.estado === 'confirmado' || a.estado === 'alta')
                          ? 'border-2 border-emerald-500 bg-emerald-50'
                          : asignacionesPedido.some(a => a.estado === 'pendiente' || a.estado === 'enviado')
                          ? 'border-2 border-red-500 bg-red-50'
                          : 'border border-slate-200'
                      }`}
                      onClick={() => setDetalleEventoModal({ open: true, pedido })}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-slate-800 text-sm">{pedido.cliente}</h4>
                          <p className="text-xs text-slate-500">{pedido.lugar_evento || 'Sin ubicación'}</p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-[#1e3a5f]/10 text-[#1e3a5f]">
                          {asignacionesPedido.length}/{pedido.cantidad_camareros || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(pedido.dia), 'dd MMM yyyy', { locale: es })}
                      </div>
                    </Card>
                    );
                    })}
                    </div>
                    </div>
                    </Card>

                    {/* Modal de Detalle del Evento */}
                    <Dialog open={detalleEventoModal.open} onOpenChange={(open) => setDetalleEventoModal({ open, pedido: null })}>
                    <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#1e3a5f]" />
                    {detalleEventoModal.pedido?.cliente}
                    </DialogTitle>
                    </DialogHeader>

                    {detalleEventoModal.pedido && (
                    <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium">Lugar:</span> {detalleEventoModal.pedido.lugar_evento}
                      </div>
                      <div>
                        <span className="font-medium">Fecha:</span> {detalleEventoModal.pedido.dia}
                      </div>
                      <div>
                        <span className="font-medium">Horario:</span> {detalleEventoModal.pedido.entrada} - {detalleEventoModal.pedido.salida}
                      </div>
                      <div>
                        <span className="font-medium">Camisa:</span> {detalleEventoModal.pedido.camisa || 'No especificado'}
                      </div>
                    </div>
                    </div>

                    <div>
                    <h4 className="font-semibold mb-3">Camareros Asignados</h4>
                    <div className="space-y-2">
                      {asignaciones.filter(a => a.pedido_id === detalleEventoModal.pedido.id).map(asignacion => {
                        const camarero = camareros.find(c => c.id === asignacion.camarero_id);
                        if (!camarero) return null;

                        return (
                          <div key={asignacion.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-medium">{camarero.nombre}</p>
                                <p className="text-xs text-slate-500">{camarero.telefono}</p>
                              </div>
                            </div>
                            <div className={`px-3 py-1 rounded text-sm font-medium ${
                              asignacion.estado === 'confirmado' || asignacion.estado === 'alta'
                                ? 'bg-emerald-100 text-emerald-700'
                                : asignacion.estado === 'enviado'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {asignacion.estado}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                    <HojaAsistencia
                      pedido={detalleEventoModal.pedido}
                      asignaciones={asignaciones.filter(a => a.pedido_id === detalleEventoModal.pedido.id)}
                      camareros={camareros}
                    />
                    <EnviarWhatsApp
                      pedido={detalleEventoModal.pedido}
                      asignaciones={asignaciones.filter(a => a.pedido_id === detalleEventoModal.pedido.id)}
                      camareros={camareros}
                    />
                    </div>
                    </div>
                    </ScrollArea>
                    )}
                    </DialogContent>
                    </Dialog>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm">
          <span className="text-sm font-medium text-slate-700">Estados:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-300"></div>
            <span className="text-sm text-slate-600">Enviado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-300"></div>
            <span className="text-sm text-slate-600">Confirmado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-300"></div>
            <span className="text-sm text-slate-600">Alta</span>
          </div>
        </div>

        {/* Calendario de Navegación */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Controles de navegación */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Select value={vistaCalendario} onValueChange={setVistaCalendario}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dia">📅 Día</SelectItem>
                    <SelectItem value="semana">📆 Semana</SelectItem>
                    <SelectItem value="mes">🗓️ Mes</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex gap-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (vistaCalendario === 'dia') {
                        setFechaSeleccionada(new Date(fechaSeleccionada.setDate(fechaSeleccionada.getDate() - 1)));
                      } else if (vistaCalendario === 'semana') {
                        setFechaSeleccionada(new Date(fechaSeleccionada.setDate(fechaSeleccionada.getDate() - 7)));
                      } else {
                        setFechaSeleccionada(new Date(fechaSeleccionada.setMonth(fechaSeleccionada.getMonth() - 1)));
                      }
                    }}
                  >
                    ‹
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setFechaSeleccionada(new Date())}
                  >
                    Hoy
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (vistaCalendario === 'dia') {
                        setFechaSeleccionada(new Date(fechaSeleccionada.setDate(fechaSeleccionada.getDate() + 1)));
                      } else if (vistaCalendario === 'semana') {
                        setFechaSeleccionada(new Date(fechaSeleccionada.setDate(fechaSeleccionada.getDate() + 7)));
                      } else {
                        setFechaSeleccionada(new Date(fechaSeleccionada.setMonth(fechaSeleccionada.getMonth() + 1)));
                      }
                    }}
                  >
                    ›
                  </Button>
                </div>

                <span className="text-sm font-medium text-slate-700">
                  {vistaCalendario === 'dia' && format(fechaSeleccionada, 'dd MMMM yyyy', { locale: es })}
                  {vistaCalendario === 'semana' && `${format(rangoFechas.inicio, 'dd MMM', { locale: es })} - ${format(rangoFechas.fin, 'dd MMM yyyy', { locale: es })}`}
                  {vistaCalendario === 'mes' && format(fechaSeleccionada, 'MMMM yyyy', { locale: es })}
                </span>
              </div>

              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar cliente o lugar..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Calendario visual */}
            <div className="grid gap-2" style={{ 
              gridTemplateColumns: vistaCalendario === 'mes' 
                ? 'repeat(7, minmax(0, 1fr))' 
                : `repeat(${diasCalendario.length}, minmax(0, 1fr))`
            }}>
              {diasCalendario.map(dia => {
                const diaStr = format(dia, 'yyyy-MM-dd');
                const eventos = eventosPorDia[diaStr] || [];
                const esHoy = isSameDay(dia, new Date());
                const estaSeleccionado = isSameDay(dia, fechaSeleccionada);

                return (
                  <button
                    key={diaStr}
                    onClick={() => setFechaSeleccionada(dia)}
                    className={`p-2 rounded-lg border-2 transition-all hover:shadow-md ${
                      estaSeleccionado 
                        ? 'border-[#1e3a5f] bg-[#1e3a5f]/10' 
                        : esHoy 
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-medium text-slate-600">
                      {vistaCalendario === 'mes' ? format(dia, 'EEE', { locale: es }) : format(dia, 'EEE dd', { locale: es })}
                    </div>
                    <div className={`text-lg font-bold ${estaSeleccionado ? 'text-[#1e3a5f]' : 'text-slate-800'}`}>
                      {format(dia, 'd')}
                    </div>
                    {eventos.length > 0 && (
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-semibold text-slate-600">{eventos.length}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Tabla */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-[#1e3a5f]" />
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100">
                    <TableHead className="font-semibold w-28">Día</TableHead>
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="font-semibold">Lugar Evento</TableHead>
                    <TableHead className="font-semibold w-56">Camarero</TableHead>
                    <TableHead className="font-semibold w-24 text-center">Entrada</TableHead>
                    <TableHead className="font-semibold w-24 text-center">Salida</TableHead>
                    <TableHead className="font-semibold w-36">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((fila, _index) => {
                    const bgColor = fila.asignacion ? estadoColors[fila.asignacion.estado] : 'bg-white';
                    
                    return (
                      <TableRow key={`${fila.pedido.id}-${fila.slot}`} className={`${bgColor} border-b`}>
                        <TableCell className="font-medium">
                          {fila.pedido.dia ? format(new Date(fila.pedido.dia), 'dd MMM', { locale: es }) : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{fila.pedido.cliente}</TableCell>
                        <TableCell>{fila.pedido.lugar_evento || '-'}</TableCell>
                        <TableCell>
                          {fila.asignacion ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {fila.asignacion.camarero_nombre}
                                <span className="text-xs text-slate-500 ml-1">
                                  (#{fila.asignacion.camarero_codigo})
                                </span>
                              </span>
                              {fila.asignacion.estado === 'alta' && (
                                <button
                                  onClick={() => {
                                    const cam = camareros.find(c => c.id === fila.asignacion.camarero_id);
                                    if (cam) setValoracionModal({ open: true, camarero: cam, pedido: fila.pedido });
                                  }}
                                  className="text-amber-500 hover:text-amber-600"
                                  title="Valorar camarero"
                                >
                                  <Star className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <Select onValueChange={(camareroId) => {
                              const camarero = camareros.find(c => c.id === camareroId);
                              if (camarero) handleAsignarCamarero(fila.pedido, camarero);
                            }}>
                              <SelectTrigger className="h-8 text-sm bg-white">
                                <SelectValue placeholder="Seleccionar camarero..." />
                              </SelectTrigger>
                              <SelectContent>
                                {getCamarerosDisponibles(fila.pedido, null).map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nombre} (#{c.codigo})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {fila.pedido.entrada || '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {fila.pedido.salida || '-'}
                        </TableCell>
                        <TableCell>
                          {fila.asignacion ? (
                            <Select 
                              value={fila.asignacion.estado}
                              onValueChange={(v) => handleCambiarEstado(fila.asignacion.id, v)}
                            >
                              <SelectTrigger className={`h-8 text-sm ${
                                fila.asignacion.estado === 'enviado' ? 'bg-orange-300 border-orange-400' :
                                fila.asignacion.estado === 'confirmado' ? 'bg-emerald-300 border-emerald-400' :
                                fila.asignacion.estado === 'alta' ? 'bg-blue-300 border-blue-400' :
                                'bg-white'
                              }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="enviado">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    Enviado
                                  </span>
                                </SelectItem>
                                <SelectItem value="confirmado">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Confirmado
                                  </span>
                                </SelectItem>
                                <SelectItem value="alta">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Alta
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-sm text-slate-400">Sin asignar</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                        No hay pedidos para mostrar
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Resumen */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Filas</p>
            <p className="text-2xl font-bold text-slate-800">{filas.length}</p>
          </Card>
          <Card className="p-4 bg-orange-50">
            <p className="text-sm text-orange-600">Enviados</p>
            <p className="text-2xl font-bold text-orange-700">
              {filas.filter(f => f.asignacion?.estado === 'enviado').length}
            </p>
          </Card>
          <Card className="p-4 bg-emerald-50">
            <p className="text-sm text-emerald-600">Confirmados</p>
            <p className="text-2xl font-bold text-emerald-700">
              {filas.filter(f => f.asignacion?.estado === 'confirmado').length}
            </p>
          </Card>
          <Card className="p-4 bg-blue-50">
            <p className="text-sm text-blue-600">Alta</p>
            <p className="text-2xl font-bold text-blue-700">
              {filas.filter(f => f.asignacion?.estado === 'alta').length}
            </p>
          </Card>
        </div>

          </TabsContent>
        </Tabs>

      {/* Modal de valoración */}
      {valoracionModal.camarero && (
        <ValoracionCamarero
          open={valoracionModal.open}
          onClose={() => setValoracionModal({ open: false, camarero: null, pedido: null })}
          camarero={valoracionModal.camarero}
          pedido={valoracionModal.pedido}
        />
      )}
      </div>
      </div>
    </PullToRefresh>
  );
}