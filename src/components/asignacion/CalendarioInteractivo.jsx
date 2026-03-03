/**
 * CalendarioInteractivo.js
 * Calendario mensual con:
 *  - Vista de eventos y asignaciones por día
 *  - Drag & drop de camareros a slots de eventos
 *  - Panel lateral contextual al seleccionar un día/evento
 */
import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronLeft, ChevronRight, AlertTriangle,
  Users, MapPin, Clock, X, GripVertical, Star, UserPlus, Calendar, CheckCircle2
} from 'lucide-react';
import ScoreBadge from './ScoreBadge';
import FiltrosAvanzadosCamareros, { aplicarFiltrosCamareros } from './FiltrosAvanzadosCamareros';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const ESTADO_COLORS = {
  pendiente:  { bg: 'bg-slate-100 text-slate-700',   dot: 'bg-slate-400' },
  enviado:    { bg: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-400' },
  confirmado: { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  alta:       { bg: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500' },
};

function getEventoColor(pedido, asigsPedido) {
  const needed = pedido.turnos?.length > 0
    ? pedido.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0)
    : (pedido.cantidad_camareros || 0);
  const pct = needed > 0 ? asigsPedido.length / needed : 0;
  if (pct >= 1) return { bg: 'bg-emerald-50', border: 'border-emerald-300', bar: 'bg-emerald-500', text: 'text-emerald-700' };
  if (pct > 0)  return { bg: 'bg-amber-50',   border: 'border-amber-300',   bar: 'bg-amber-400',   text: 'text-amber-700' };
  return               { bg: 'bg-red-50',     border: 'border-red-200',     bar: 'bg-red-400',     text: 'text-red-600' };
}

export default function CalendarioInteractivo({
  pedidos = [],
  camareros = [],
  asignaciones = [],
  disponibilidades = [],
  scoresAsignacion = {},
  onAsignar,           // fn(pedido, camarero, turnoIdx, posicionSlot)
  onDesasignar,        // fn(asignacion)
  onSelectPedido,      // fn(pedido) callback para abrir panel clásico
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    especialidad: '',
    nivel: '',
    turnoHorario: '',
    habilidad: '',
    soloDisponibles: true,
    valoracionMin: 0,
  });

  // ── Navegación ────────────────────────────────────────────────────────
  const dias = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end   = endOfWeek(endOfMonth(currentMonth),   { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // ── Índices rápidos ───────────────────────────────────────────────────
  const pedidosPorFecha = useMemo(() => {
    const idx = {};
    pedidos.forEach(p => {
      if (!idx[p.dia]) idx[p.dia] = [];
      idx[p.dia].push(p);
    });
    return idx;
  }, [pedidos]);

  const asignacionesPorPedido = useMemo(() => {
    const idx = {};
    asignaciones.forEach(a => {
      if (!idx[a.pedido_id]) idx[a.pedido_id] = [];
      idx[a.pedido_id].push(a);
    });
    return idx;
  }, [asignaciones]);

  // ── Datos del día seleccionado ────────────────────────────────────────
  const pedidosDia = useMemo(() => {
    if (!diaSeleccionado) return [];
    const fechaStr = format(diaSeleccionado, 'yyyy-MM-dd');
    return pedidosPorFecha[fechaStr] || [];
  }, [diaSeleccionado, pedidosPorFecha]);

  // ── Camareros filtrados para el panel lateral ─────────────────────────
  const camarerosDisponiblesFiltrados = useMemo(() => {
    if (!eventoSeleccionado) return [];
    const asigsPedido = asignacionesPorPedido[eventoSeleccionado.id] || [];
    const idsAsignados = new Set(asigsPedido.map(a => a.camarero_id));
    const noAsignados = camareros.filter(c => !idsAsignados.has(c.id));
    return aplicarFiltrosCamareros(noAsignados, filtros, asignaciones, eventoSeleccionado)
      .sort((a, b) => {
        const sa = scoresAsignacion[a.id]?.score || 0;
        const sb = scoresAsignacion[b.id]?.score || 0;
        return sb - sa;
      });
  }, [eventoSeleccionado, camareros, asignaciones, asignacionesPorPedido, filtros, scoresAsignacion]);

  // ── Calcular slots disponibles del evento ─────────────────────────────
  const slotsEvento = useMemo(() => {
    if (!eventoSeleccionado) return [];
    const asigs = asignacionesPorPedido[eventoSeleccionado.id] || [];
    const slots = [];

    if (eventoSeleccionado.turnos?.length > 0) {
      eventoSeleccionado.turnos.forEach((turno, ti) => {
        for (let pos = 0; pos < (turno.cantidad_camareros || 0); pos++) {
          const asig = asigs.find(a => a.turno_index === ti && a.posicion_slot === pos);
          slots.push({ turnoIdx: ti, posicion: pos, turno, asig,
            droppableId: `cal-slot-turno-${ti}-pos-${pos}-${eventoSeleccionado.id}` });
        }
      });
    } else {
      for (let pos = 0; pos < (eventoSeleccionado.cantidad_camareros || 0); pos++) {
        const asig = asigs.find(a => a.posicion_slot === pos && (a.turno_index === null || a.turno_index === undefined));
        slots.push({ turnoIdx: null, posicion: pos, turno: null, asig,
          droppableId: `cal-slot-general-${pos}-${eventoSeleccionado.id}` });
      }
    }
    return slots;
  }, [eventoSeleccionado, asignacionesPorPedido]);

  // ── Drag & Drop ───────────────────────────────────────────────────────
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    if (destination.droppableId === 'cal-camareros-panel') return;

    const camarero = camareros.find(c => c.id === draggableId);
    if (!camarero || !eventoSeleccionado) return;

    const slot = slotsEvento.find(s => s.droppableId === destination.droppableId);
    if (!slot) return;
    if (slot.asig) { toast.warning('Ese slot ya tiene un camarero asignado.'); return; }

    onAsignar?.(eventoSeleccionado, camarero, slot.turnoIdx, slot.posicion);
  };

  // ── Render día ────────────────────────────────────────────────────────
  const renderDia = (dia) => {
    const fechaStr = format(dia, 'yyyy-MM-dd');
    const eventos  = pedidosPorFecha[fechaStr] || [];
    const esHoy    = isSameDay(dia, new Date());
    const esMes    = dia.getMonth() === currentMonth.getMonth();
    const esSelec  = diaSeleccionado && isSameDay(dia, diaSeleccionado);

    const asigsDia = asignaciones.filter(a => a.fecha_pedido === fechaStr);
    const totalNecesario = eventos.reduce((s, p) => {
      return s + (p.turnos?.length > 0
        ? p.turnos.reduce((ss, t) => ss + (t.cantidad_camareros || 0), 0)
        : (p.cantidad_camareros || 0));
    }, 0);

    const pct = totalNecesario > 0 ? asigsDia.length / totalNecesario : -1;
    const conflictos = disponibilidades.filter(d =>
      d.fecha === fechaStr &&
      ['no_disponible', 'vacaciones', 'baja'].includes(d.tipo) &&
      asigsDia.some(a => a.camarero_id === d.camarero_id)
    ).length;

    let bgDay = 'bg-white hover:bg-slate-50';
    let borderDay = 'border-slate-200';
    if (eventos.length > 0) {
      if (pct >= 1)       { bgDay = 'bg-emerald-50 hover:bg-emerald-100'; borderDay = 'border-emerald-200'; }
      else if (pct > 0)   { bgDay = 'bg-amber-50 hover:bg-amber-100';     borderDay = 'border-amber-200'; }
      else                { bgDay = 'bg-red-50 hover:bg-red-100';         borderDay = 'border-red-200'; }
    }

    return (
      <div
        key={fechaStr}
        onClick={() => {
          if (!esMes) return;
          setDiaSeleccionado(isSameDay(dia, diaSeleccionado) ? null : dia);
          setEventoSeleccionado(null);
        }}
        className={`
          min-h-[110px] p-2 rounded-lg border transition-all cursor-pointer select-none
          ${bgDay} ${esSelec ? '!border-[#1e3a5f] !border-2 !shadow-md ring-2 ring-[#1e3a5f]/20' : borderDay}
          ${esHoy && !esSelec ? 'border-[#1e3a5f] border-[1.5px]' : ''}
          ${!esMes ? 'opacity-30 pointer-events-none' : ''}
        `}
      >
        {/* Número día */}
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-semibold ${esHoy ? 'bg-[#1e3a5f] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs' : 'text-slate-700'}`}>
            {format(dia, 'd')}
          </span>
          <div className="flex items-center gap-0.5">
            {conflictos > 0 && <AlertTriangle className="w-3 h-3 text-orange-400" />}
            {eventos.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1 h-4 font-bold">
                {eventos.length}
              </Badge>
            )}
          </div>
        </div>

        {/* Eventos del día */}
        <div className="space-y-0.5">
          {eventos.slice(0, 3).map(p => {
            const asigsPedido = asignacionesPorPedido[p.id] || [];
            const needed = p.turnos?.length > 0
              ? p.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0)
              : (p.cantidad_camareros || 0);
            const col = getEventoColor(p, asigsPedido);
            return (
              <div
                key={p.id}
                onClick={e => { e.stopPropagation(); setDiaSeleccionado(dia); setEventoSeleccionado(p); }}
                className={`text-[10px] rounded px-1.5 py-0.5 border font-medium truncate cursor-pointer transition-all
                  hover:shadow-sm hover:scale-[1.02] ${col.bg} ${col.border} ${col.text}`}
              >
                <span className="truncate">{p.cliente}</span>
                <span className="ml-1 opacity-70">{asigsPedido.length}/{needed}</span>
              </div>
            );
          })}
          {eventos.length > 3 && (
            <p className="text-[10px] text-slate-400 text-center">+{eventos.length - 3} más</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4">
        {/* ── Columna Calendario ── */}
        <Card className="flex-1 p-4 min-w-0">
          {/* Cabecera */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1e3a5f]" />
              Calendario interactivo
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs h-8">Hoy</Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-slate-700 min-w-[130px] text-center capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-3 text-xs mb-3 flex-wrap">
            {[['bg-emerald-400','Completo'],['bg-amber-400','Parcial'],['bg-red-400','Sin asignar']].map(([c,l]) => (
              <span key={l} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-sm ${c}`}/>{l}</span>
            ))}
            <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-orange-400"/>Conflicto</span>
          </div>

          {/* Grid días semana */}
          <div className="grid grid-cols-7 gap-1.5">
            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 pb-1">{d}</div>
            ))}
            {dias.map(dia => renderDia(dia))}
          </div>
        </Card>

        {/* ── Panel lateral contextual ── */}
        <AnimatePresence>
          {diaSeleccionado && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, x: 30, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 380 }}
              exit={{ opacity: 0, x: 30, width: 0 }}
              className="flex-shrink-0 overflow-hidden"
              style={{ width: 380 }}
            >
              <Card className="h-full flex flex-col p-0 overflow-hidden">
                {/* Header panel */}
                <div className="p-4 bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8f] text-white flex-shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-base">
                      {format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es })}
                    </h4>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8"
                      onClick={() => { setDiaSeleccionado(null); setEventoSeleccionado(null); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-white/70 text-xs">{pedidosDia.length} evento{pedidosDia.length !== 1 ? 's' : ''}</p>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-3">
                    {/* Lista de eventos del día */}
                    {pedidosDia.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-sm">Sin eventos este día</div>
                    )}

                    {pedidosDia.map(pedido => {
                      const asigsPedido = asignacionesPorPedido[pedido.id] || [];
                      const needed = pedido.turnos?.length > 0
                        ? pedido.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0)
                        : (pedido.cantidad_camareros || 0);
                      const col = getEventoColor(pedido, asigsPedido);
                      const isSelected = eventoSeleccionado?.id === pedido.id;

                      return (
                        <div key={pedido.id}
                          className={`rounded-xl border-2 overflow-hidden transition-all ${
                            isSelected ? 'border-[#1e3a5f] shadow-lg' : `${col.border} hover:border-[#1e3a5f]/40`
                          }`}
                        >
                          {/* Evento header */}
                          <div
                            className={`p-3 cursor-pointer ${col.bg}`}
                            onClick={() => setEventoSeleccionado(isSelected ? null : pedido)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">{pedido.cliente}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                                  {pedido.lugar_evento && (
                                    <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3"/>{pedido.lugar_evento}</span>
                                  )}
                                  {pedido.entrada && (
                                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3"/>{pedido.entrada}</span>
                                  )}
                                </div>
                              </div>
                              <div className="ml-2 flex flex-col items-end gap-1">
                                <span className={`text-xs font-bold ${col.text}`}>
                                  {asigsPedido.length}/{needed}
                                </span>
                                {asigsPedido.length >= needed && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                )}
                              </div>
                            </div>

                            {/* Barra progreso */}
                            <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${col.bar}`}
                                style={{ width: `${needed > 0 ? Math.min(100, (asigsPedido.length / needed) * 100) : 0}%` }} />
                            </div>

                            {/* Avatares asignados */}
                            {asigsPedido.length > 0 && (
                              <div className="flex items-center gap-0.5 mt-2">
                                {asigsPedido.slice(0, 5).map((a, i) => (
                                  <Avatar key={i} className="w-5 h-5 border border-white shadow-sm">
                                    <AvatarFallback className={`text-[8px] font-bold ${ESTADO_COLORS[a.estado]?.bg || 'bg-slate-100'}`}>
                                      {a.camarero_nombre?.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {asigsPedido.length > 5 && (
                                  <span className="text-[10px] text-slate-500 ml-1">+{asigsPedido.length - 5}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Panel DnD del evento seleccionado */}
                          {isSelected && (
                            <div className="bg-white p-3 border-t border-slate-100">
                              {/* Slots */}
                              <p className="text-xs font-semibold text-slate-500 mb-2">Slots de asignación</p>
                              <div className="grid grid-cols-2 gap-1.5 mb-3">
                                {slotsEvento.map(slot => (
                                  <Droppable key={slot.droppableId} droppableId={slot.droppableId}>
                                    {(prov, snap) => (
                                      <div
                                        ref={prov.innerRef}
                                        {...prov.droppableProps}
                                        className={`min-h-[56px] rounded-lg border-2 p-1.5 transition-all flex items-center justify-center text-xs
                                          ${slot.asig
                                            ? `${ESTADO_COLORS[slot.asig.estado]?.bg || 'bg-slate-50'} border-slate-200`
                                            : snap.isDraggingOver
                                            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 border-dashed scale-[1.03]'
                                            : 'border-dashed border-slate-200 hover:border-[#1e3a5f]/40 bg-slate-50'
                                          }`}
                                      >
                                        {slot.asig ? (
                                          <div className="w-full">
                                            <div className="flex items-center justify-between">
                                              <span className="font-semibold text-slate-800 truncate text-[11px]">
                                                {slot.asig.camarero_nombre?.split(' ')[0]}
                                              </span>
                                              <button
                                                onClick={() => onDesasignar?.(slot.asig)}
                                                className="text-slate-400 hover:text-red-500 ml-1"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </div>
                                            <Badge className={`text-[9px] h-4 px-1 mt-0.5 ${ESTADO_COLORS[slot.asig.estado]?.bg}`}>
                                              {slot.asig.estado}
                                            </Badge>
                                            {slot.turno && (
                                              <p className="text-[9px] text-slate-400 mt-0.5">{slot.turno.entrada}-{slot.turno.salida}</p>
                                            )}
                                          </div>
                                        ) : (
                                          <div className={`flex flex-col items-center gap-1 ${snap.isDraggingOver ? 'text-[#1e3a5f]' : 'text-slate-300'}`}>
                                            <UserPlus className="w-4 h-4" />
                                            <span className="text-[9px]">
                                              {slot.turno ? `T${slot.turnoIdx + 1}·${slot.turno.entrada}` : `Slot ${slot.posicion + 1}`}
                                            </span>
                                          </div>
                                        )}
                                        <div className="hidden">{prov.placeholder}</div>
                                      </div>
                                    )}
                                  </Droppable>
                                ))}
                              </div>

                              {/* Filtros avanzados */}
                              <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                Camareros disponibles ({camarerosDisponiblesFiltrados.length})
                              </p>
                              <FiltrosAvanzadosCamareros
                                filtros={filtros}
                                onFiltrosChange={setFiltros}
                                camareros={camareros}
                                pedido={pedido}
                              />

                              {/* Lista draggable de camareros */}
                              <Droppable droppableId="cal-camareros-panel" isDropDisabled={true}>
                                {(prov) => (
                                  <div
                                    ref={prov.innerRef}
                                    {...prov.droppableProps}
                                    className="space-y-1.5 mt-2 max-h-64 overflow-y-auto"
                                  >
                                    {camarerosDisponiblesFiltrados.length === 0 && (
                                      <p className="text-xs text-slate-400 text-center py-4">
                                        No hay camareros disponibles con esos filtros
                                      </p>
                                    )}
                                    {camarerosDisponiblesFiltrados.map((cam, idx) => (
                                      <Draggable key={cam.id} draggableId={cam.id} index={idx}>
                                        {(pDrag, snap) => (
                                          <div
                                            ref={pDrag.innerRef}
                                            {...pDrag.draggableProps}
                                            {...pDrag.dragHandleProps}
                                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing
                                              ${snap.isDragging
                                                ? 'border-[#1e3a5f] shadow-xl bg-blue-50 scale-105 rotate-1'
                                                : 'border-slate-200 bg-white hover:border-[#1e3a5f]/40 hover:shadow-sm'
                                              }`}
                                            style={pDrag.draggableProps.style}
                                          >
                                            <GripVertical className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <Avatar className="w-7 h-7 flex-shrink-0">
                                              <AvatarFallback className="text-[10px] font-bold bg-[#1e3a5f]/10 text-[#1e3a5f]">
                                                {cam.nombre?.substring(0, 2).toUpperCase()}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-semibold text-slate-800 truncate">{cam.nombre}</p>
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-slate-400 font-mono">#{cam.codigo}</span>
                                                {cam.valoracion_promedio > 0 && (
                                                  <span className="flex items-center gap-0.5 text-[10px] text-amber-600">
                                                    <Star className="w-2.5 h-2.5 fill-amber-400" />
                                                    {cam.valoracion_promedio.toFixed(1)}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <ScoreBadge scoreData={scoresAsignacion[cam.id]} />
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {prov.placeholder}
                                  </div>
                                )}
                              </Droppable>

                              {/* Botón abrir vista completa */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-3 text-xs border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
                                onClick={() => onSelectPedido?.(pedido)}
                              >
                                Abrir panel completo →
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DragDropContext>
  );
}