import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Calendar, 
  Users,
  Clock,
  MapPin,
  TrendingUp,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, isToday, isTomorrow, differenceInHours, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';

export default function DashboardCoordinador() {
  const [filtroAlertas, setFiltroAlertas] = useState('todas'); // todas, urgentes, pedidos, cancelaciones
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch data
  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos-dashboard'],
    queryFn: () => base44.entities.Pedido.list('dia', 300),
    refetchInterval: 30000 // cada 30s
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros-dashboard'],
    queryFn: () => base44.entities.Camarero.list('nombre'),
    refetchInterval: 60000 // cada minuto
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones-dashboard'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 1000),
    refetchInterval: 30000
  });

  const { data: tareas = [] } = useQuery({
    queryKey: ['tareas-dashboard'],
    queryFn: () => base44.entities.Tarea.list('-created_date', 500),
    refetchInterval: 60000
  });

  // Cálculos y filtros
  const hoy = new Date();
  const eventosHoy = pedidos.filter(p => isToday(parseISO(p.dia)) && p.estado_evento !== 'cancelado');
  const eventosManana = pedidos.filter(p => isTomorrow(parseISO(p.dia)) && p.estado_evento !== 'cancelado');
  const eventosSemana = pedidos.filter(p => {
    const fecha = parseISO(p.dia);
    const diff = differenceInHours(fecha, hoy) / 24;
    return diff >= 0 && diff <= 7 && p.estado_evento !== 'cancelado';
  });

  const camarerosDisponibles = camareros.filter(c => c.estado_actual === 'disponible');
  const camarerosOcupados = camareros.filter(c => c.estado_actual === 'ocupado');
  const camarerosNoDisponibles = camareros.filter(c => c.estado_actual === 'no_disponible');

  const asignacionesPendientes = asignaciones.filter(a => a.estado === 'pendiente');
  const asignacionesConfirmadas = asignaciones.filter(a => a.estado === 'confirmado');

  const tareasPendientes = tareas.filter(t => !t.completada);

  // Alertas urgentes
  const alertas = [];

  // 1. Pedidos incompletos próximos
  pedidos.forEach(pedido => {
    if (pedido.estado_evento === 'cancelado') return;
    
    const fechaPedido = parseISO(pedido.dia);
    const horasHasta = differenceInHours(fechaPedido, hoy);
    
    if (horasHasta > 0 && horasHasta < 48) {
      const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
      const necesarios = pedido.turnos?.length > 0
        ? pedido.turnos.reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0)
        : (pedido.cantidad_camareros || 0);
      const asignados = asignacionesPedido.length;

      if (asignados < necesarios) {
        alertas.push({
          id: `incompleto-${pedido.id}`,
          tipo: 'pedido_incompleto',
          prioridad: horasHasta < 12 ? 'urgente' : 'alta',
          titulo: `⚠️ Pedido Incompleto: ${pedido.cliente}`,
          descripcion: `Faltan ${necesarios - asignados} camareros. Evento en ${Math.round(horasHasta)}h`,
          pedido_id: pedido.id,
          fecha: pedido.dia,
          accion: 'asignar'
        });
      }
    }
  });

  // 2. Pedidos cancelados recientes
  pedidos.forEach(pedido => {
    if (pedido.estado_evento === 'cancelado') {
      const fechaCancelacion = new Date(pedido.updated_date);
      const horasDesdeCancelacion = differenceInHours(hoy, fechaCancelacion);
      
      if (horasDesdeCancelacion < 24) {
        alertas.push({
          id: `cancelado-${pedido.id}`,
          tipo: 'cancelacion',
          prioridad: 'alta',
          titulo: `❌ Pedido Cancelado: ${pedido.cliente}`,
          descripcion: `Cancelado hace ${Math.round(horasDesdeCancelacion)}h`,
          pedido_id: pedido.id,
          fecha: pedido.dia
        });
      }
    }
  });

  // 3. Asignaciones sin confirmar próximas
  asignacionesPendientes.forEach(asig => {
    const pedido = pedidos.find(p => p.id === asig.pedido_id);
    if (pedido && pedido.dia) {
      const horasHasta = differenceInHours(parseISO(pedido.dia), hoy);
      if (horasHasta > 0 && horasHasta < 24) {
        alertas.push({
          id: `sin-confirmar-${asig.id}`,
          tipo: 'sin_confirmar',
          prioridad: 'media',
          titulo: `⏰ Asignación Sin Confirmar`,
          descripcion: `${asig.camarero_nombre} - ${pedido.cliente} (${Math.round(horasHasta)}h)`,
          pedido_id: pedido.id,
          fecha: pedido.dia
        });
      }
    }
  });

  // Ordenar alertas por prioridad
  alertas.sort((a, b) => {
    const prioridades = { urgente: 3, alta: 2, media: 1 };
    return prioridades[b.prioridad] - prioridades[a.prioridad];
  });

  const alertasFiltradas = alertas.filter(a => {
    if (filtroAlertas === 'todas') return true;
    if (filtroAlertas === 'urgentes') return a.prioridad === 'urgente';
    if (filtroAlertas === 'pedidos') return a.tipo === 'pedido_incompleto';
    if (filtroAlertas === 'cancelaciones') return a.tipo === 'cancelacion';
    return true;
  });

  // Calendario
  const dias = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getDatosDia = (dia) => {
    const fechaStr = format(dia, 'yyyy-MM-dd');
    const pedidosDia = pedidos.filter(p => p.dia === fechaStr && p.estado_evento !== 'cancelado');
    const asignacionesDia = asignaciones.filter(a => a.fecha_pedido === fechaStr);
    
    const totalCamareros = pedidosDia.reduce((sum, p) => {
      if (p.turnos?.length > 0) {
        return sum + p.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0);
      }
      return sum + (p.cantidad_camareros || 0);
    }, 0);

    const asignados = asignacionesDia.length;
    const pendientes = totalCamareros - asignados;

    return { pedidos: pedidosDia, totalCamareros, asignados, pendientes };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-[#1e3a5f]" />
            Dashboard Coordinador
          </h1>
          <p className="text-slate-500 mt-1">Visión general y gestión de eventos</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Eventos Hoy</p>
                  <p className="text-3xl font-bold text-emerald-600">{eventosHoy.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-emerald-500 opacity-50" />
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="p-4 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Mañana</p>
                  <p className="text-3xl font-bold text-blue-600">{eventosManana.length}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-4 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Esta Semana</p>
                  <p className="text-3xl font-bold text-purple-600">{eventosSemana.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Alertas</p>
                  <p className="text-3xl font-bold text-amber-600">{alertas.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-500 opacity-50" />
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Disponibles</p>
                  <p className="text-3xl font-bold text-emerald-600">{camarerosDisponibles.length}</p>
                </div>
                <UserCheck className="w-8 h-8 text-emerald-500 opacity-50" />
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="p-4 border-l-4 border-l-[#1e3a5f]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Ocupados</p>
                  <p className="text-3xl font-bold text-[#1e3a5f]">{camarerosOcupados.length}</p>
                </div>
                <Users className="w-8 h-8 text-[#1e3a5f] opacity-50" />
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendario Mensual */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#1e3a5f]" />
                Calendario de Eventos
              </h2>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                  Hoy
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </span>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Leyenda */}
            <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-500"></div>
                <span className="text-slate-600">Completo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-500"></div>
                <span className="text-slate-600">Parcial</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-slate-600">Sin asignar</span>
              </div>
            </div>

            {/* Grid del Calendario */}
            <div className="grid grid-cols-7 gap-2">
              {/* Headers días */}
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(dia => (
                <div key={dia} className="text-center text-sm font-semibold text-slate-500 pb-2">
                  {dia}
                </div>
              ))}

              {/* Días */}
              {dias.map(dia => {
                const esHoy = isSameDay(dia, new Date());
                const esMesActual = dia.getMonth() === currentMonth.getMonth();
                const datos = getDatosDia(dia);
                const tieneEventos = datos.pedidos.length > 0;
                
                let colorFondo = 'bg-slate-50';
                let colorBorde = 'border-slate-200';
                
                if (tieneEventos) {
                  if (datos.pendientes === 0) {
                    colorFondo = 'bg-emerald-50';
                    colorBorde = 'border-emerald-300';
                  } else if (datos.asignados > 0) {
                    colorFondo = 'bg-amber-50';
                    colorBorde = 'border-amber-300';
                  } else {
                    colorFondo = 'bg-red-50';
                    colorBorde = 'border-red-300';
                  }
                }

                return (
                  <div
                    key={dia.toString()}
                    className={`
                      min-h-[90px] p-2 rounded-lg border transition-all
                      ${esHoy ? 'border-[#1e3a5f] border-2 shadow-md' : colorBorde}
                      ${!esMesActual ? 'opacity-40' : ''}
                      ${colorFondo}
                      ${tieneEventos ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${esHoy ? 'text-[#1e3a5f]' : 'text-slate-700'}`}>
                        {format(dia, 'd')}
                      </span>
                      {tieneEventos && (
                        <Badge variant="outline" className="text-xs px-1 h-5">
                          {datos.pedidos.length}
                        </Badge>
                      )}
                    </div>

                    {tieneEventos && (
                      <div className="space-y-1">
                        <div className="text-xs text-slate-600 flex items-center justify-center gap-1 bg-white/50 rounded py-1">
                          <Users className="w-3 h-3" />
                          <span className="font-semibold">{datos.asignados}/{datos.totalCamareros}</span>
                        </div>
                        {datos.pedidos.slice(0, 2).map(pedido => (
                          <Link 
                            key={pedido.id} 
                            to={createPageUrl('TiempoReal')}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="text-xs bg-white rounded p-1 border border-slate-200 hover:bg-slate-50 hover:shadow transition-all cursor-pointer truncate">
                              <p className="font-medium text-slate-700 truncate">{pedido.cliente}</p>
                            </div>
                          </Link>
                        ))}
                        {datos.pedidos.length > 2 && (
                          <p className="text-xs text-slate-500 text-center">
                            +{datos.pedidos.length - 2}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Estado de Camareros */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-[#1e3a5f]" />
              Estado Camareros
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-emerald-800">Disponibles</span>
                  <Badge className="bg-emerald-600">{camarerosDisponibles.length}</Badge>
                </div>
                <div className="text-xs text-emerald-700 space-y-1">
                  {camarerosDisponibles.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center justify-between">
                      <span>{c.nombre}</span>
                      <span className="text-emerald-600">●</span>
                    </div>
                  ))}
                  {camarerosDisponibles.length > 5 && (
                    <Link to={createPageUrl('Camareros')}>
                      <p className="text-emerald-600 hover:underline cursor-pointer">
                        Ver {camarerosDisponibles.length - 5} más...
                      </p>
                    </Link>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-800">Ocupados</span>
                  <Badge className="bg-[#1e3a5f]">{camarerosOcupados.length}</Badge>
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  {camarerosOcupados.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center justify-between">
                      <span>{c.nombre}</span>
                      <span className="text-[#1e3a5f]">●</span>
                    </div>
                  ))}
                  {camarerosOcupados.length > 5 && (
                    <Link to={createPageUrl('Camareros')}>
                      <p className="text-[#1e3a5f] hover:underline cursor-pointer">
                        Ver {camarerosOcupados.length - 5} más...
                      </p>
                    </Link>
                  )}
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-red-800">No Disponibles</span>
                  <Badge className="bg-red-600">{camarerosNoDisponibles.length}</Badge>
                </div>
                <div className="text-xs text-red-700">
                  {camarerosNoDisponibles.length === 0 ? (
                    <p className="italic">Ninguno</p>
                  ) : (
                    camarerosNoDisponibles.slice(0, 3).map(c => (
                      <div key={c.id}>{c.nombre}</div>
                    ))
                  )}
                </div>
              </div>

              <Link to={createPageUrl('Camareros')}>
                <Button className="w-full bg-[#1e3a5f] hover:bg-[#152a45]">
                  Ver Todos los Camareros
                </Button>
              </Link>
            </div>
          </Card>

          {/* Eventos Próximos */}
          <Card className="lg:col-span-2 p-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-[#1e3a5f]" />
              Eventos Próximos (7 días)
            </h2>

            <ScrollArea className="h-[400px]">
              {eventosSemana.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <Calendar className="w-16 h-16 mb-3" />
                  <p className="text-lg font-medium">No hay eventos próximos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {eventosSemana.map(evento => {
                    const asignacionesEvento = asignaciones.filter(a => a.pedido_id === evento.id);
                    const necesarios = evento.turnos?.length > 0
                      ? evento.turnos.reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0)
                      : (evento.cantidad_camareros || 0);
                    const asignados = asignacionesEvento.length;
                    const porcentaje = necesarios > 0 ? (asignados / necesarios) * 100 : 0;
                    const esHoy = isToday(new Date(evento.dia));
                    const esManana = isTomorrow(new Date(evento.dia));

                    return (
                      <div
                        key={evento.id}
                        className={`p-4 rounded-lg border ${
                          esHoy ? 'bg-emerald-50 border-emerald-200' :
                          esManana ? 'bg-blue-50 border-blue-200' :
                          'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {esHoy && <Badge className="bg-emerald-600">HOY</Badge>}
                              {esManana && <Badge className="bg-blue-600">MAÑANA</Badge>}
                              <Badge className={
                                porcentaje === 100 ? 'bg-emerald-100 text-emerald-700' :
                                porcentaje >= 50 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }>
                                {asignados}/{necesarios} camareros
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-slate-800">{evento.cliente}</h3>
                            <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(evento.dia), "dd MMM yyyy", { locale: es })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {evento.entrada} - {evento.salida}
                              </span>
                              {evento.lugar_evento && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {evento.lugar_evento}
                                </span>
                              )}
                            </div>
                          </div>
                          <Link to={createPageUrl('Asignacion')}>
                            <Button size="sm" variant="outline">
                              Gestionar
                            </Button>
                          </Link>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              porcentaje === 100 ? 'bg-emerald-600' :
                              porcentaje >= 50 ? 'bg-amber-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Accesos Rápidos */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Accesos Rápidos</h2>
            
            <div className="space-y-3">
              <Link to={createPageUrl('Asignacion')}>
                <Button className="w-full justify-start bg-[#1e3a5f] hover:bg-[#152a45]">
                  <Users className="w-4 h-4 mr-2" />
                  Gestionar Asignaciones
                </Button>
              </Link>

              <Link to={createPageUrl('Pedidos')}>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Ver Todos los Pedidos
                </Button>
              </Link>

              <Link to={createPageUrl('Camareros')}>
                <Button className="w-full justify-start" variant="outline">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Gestionar Camareros
                </Button>
              </Link>

              <Link to={createPageUrl('TiempoReal')}>
                <Button className="w-full justify-start" variant="outline">
                  <Clock className="w-4 h-4 mr-2" />
                  Seguimiento en Vivo
                </Button>
              </Link>

              <Link to={createPageUrl('Informes')}>
                <Button className="w-full justify-start" variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Ver Informes
                </Button>
              </Link>
            </div>

            {/* Estadísticas Rápidas */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="font-semibold text-slate-700 mb-3">Resumen General</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Asignaciones Pendientes:</span>
                  <span className="font-semibold text-amber-600">{asignacionesPendientes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Asignaciones Confirmadas:</span>
                  <span className="font-semibold text-emerald-600">{asignacionesConfirmadas.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tareas Pendientes:</span>
                  <span className="font-semibold text-blue-600">{tareasPendientes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Eventos Activos:</span>
                  <span className="font-semibold text-[#1e3a5f]">
                    {pedidos.filter(p => p.estado_evento !== 'cancelado' && p.estado_evento !== 'finalizado').length}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}