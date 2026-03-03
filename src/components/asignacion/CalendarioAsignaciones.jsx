import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, AlertTriangle, AlertCircle, Search, UserCheck } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function CalendarioAsignaciones({ onSelectPedido }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [vistaDetalle, setVistaDetalle] = useState(true);
  const [filtroCamarero, setFiltroCamarero] = useState('');
  const [busquedaCamarero, setBusquedaCamarero] = useState('');

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-fecha_pedido', 2000)
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: disponibilidades = [] } = useQuery({
    queryKey: ['disponibilidades'],
    queryFn: () => base44.entities.Disponibilidad.list('-fecha', 500)
  });

  // Generar días del calendario
  const dias = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Calcular carga de trabajo por camarero
  const cargaPorCamarero = useMemo(() => {
    const carga = {};
    camareros.forEach(c => {
      carga[c.id] = { camarero: c, asignaciones: [], totalHoras: 0, dias: new Set() };
    });
    
    asignaciones.forEach(asig => {
      if (carga[asig.camarero_id]) {
        carga[asig.camarero_id].asignaciones.push(asig);
        carga[asig.camarero_id].dias.add(asig.fecha_pedido);
        
        // Calcular horas
        if (asig.hora_entrada && asig.hora_salida) {
          const [entH, entM] = asig.hora_entrada.split(':').map(Number);
          const [salH, salM] = asig.hora_salida.split(':').map(Number);
          let horas = (salH + salM/60) - (entH + entM/60);
          if (horas < 0) horas += 24;
          carga[asig.camarero_id].totalHoras += horas;
        }
      }
    });
    
    return carga;
  }, [camareros, asignaciones]);

  // Obtener datos por día
  const getDatosDia = (dia) => {
    const fechaStr = format(dia, 'yyyy-MM-dd');
    let pedidosDia = pedidos.filter(p => p.dia === fechaStr);
    
    // Aplicar filtro de estado
    if (filtroEstado !== 'todos') {
      pedidosDia = pedidosDia.filter(p => {
        const asigsPedido = asignaciones.filter(a => a.pedido_id === p.id);
        if (filtroEstado === 'completo') {
          const total = p.turnos?.length > 0 
            ? p.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0)
            : (p.cantidad_camareros || 0);
          return asigsPedido.length >= total;
        }
        if (filtroEstado === 'incompleto') {
          const total = p.turnos?.length > 0 
            ? p.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0)
            : (p.cantidad_camareros || 0);
          return asigsPedido.length < total;
        }
        if (filtroEstado === 'sin_asignar') {
          return asigsPedido.length === 0;
        }
        return true;
      });
    }
    
    let asignacionesDia = asignaciones.filter(a => a.fecha_pedido === fechaStr);
    
    // Aplicar filtro por camarero
    if (filtroCamarero) {
      asignacionesDia = asignacionesDia.filter(a => a.camarero_id === filtroCamarero);
      pedidosDia = pedidosDia.filter(p => 
        asignacionesDia.some(a => a.pedido_id === p.id)
      );
    }
    
    // Aplicar búsqueda de camarero
    if (busquedaCamarero) {
      const busqueda = busquedaCamarero.toLowerCase();
      asignacionesDia = asignacionesDia.filter(a => 
        a.camarero_nombre?.toLowerCase().includes(busqueda) ||
        a.camarero_codigo?.toLowerCase().includes(busqueda)
      );
      pedidosDia = pedidosDia.filter(p => 
        asignacionesDia.some(a => a.pedido_id === p.id)
      );
    }
    
    const totalCamareros = pedidosDia.reduce((sum, p) => {
      if (p.turnos?.length > 0) {
        return sum + p.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0);
      }
      return sum + (p.cantidad_camareros || 0);
    }, 0);

    const asignados = asignacionesDia.length;
    const pendientes = totalCamareros - asignados;
    
    // Detectar conflictos de disponibilidad
    const camarerosAsignados = new Set(asignacionesDia.map(a => a.camarero_id));
    const noDisponibles = disponibilidades.filter(d => 
      d.fecha === fechaStr && 
      (d.tipo === 'no_disponible' || d.tipo === 'vacaciones' || d.tipo === 'baja') &&
      camarerosAsignados.has(d.camarero_id)
    );
    
    const altaDemanda = totalCamareros > camareros.filter(c => c.disponible).length * 0.7;

    return {
      pedidos: pedidosDia,
      asignaciones: asignacionesDia,
      totalCamareros,
      asignados,
      pendientes,
      conflictos: noDisponibles.length,
      altaDemanda
    };
  };

  const mesAnterior = () => setCurrentMonth(subMonths(currentMonth, 1));
  const mesSiguiente = () => setCurrentMonth(addMonths(currentMonth, 1));
  const hoy = () => setCurrentMonth(new Date());

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#1e3a5f]" />
            Calendario de Asignaciones
          </h3>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={hoy}>
              Hoy
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={mesAnterior}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <Button variant="outline" size="icon" onClick={mesSiguiente}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filtros y Vista */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los eventos</SelectItem>
                <SelectItem value="completo">Completos</SelectItem>
                <SelectItem value="incompleto">Incompletos</SelectItem>
                <SelectItem value="sin_asignar">Sin asignar</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filtroCamarero} onValueChange={setFiltroCamarero}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue placeholder="Filtrar por camarero" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todos los camareros</SelectItem>
                {camareros.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre} ({c.codigo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={busquedaCamarero}
                onChange={(e) => setBusquedaCamarero(e.target.value)}
                placeholder="Buscar camarero..."
                className="pl-8 h-9 w-48"
              />
            </div>
            
            <Button 
              variant={vistaDetalle ? "default" : "outline"} 
              size="sm"
              onClick={() => setVistaDetalle(!vistaDetalle)}
            >
              {vistaDetalle ? 'Vista Simple' : 'Vista Detallada'}
            </Button>
          </div>

          {/* Resumen carga de trabajo */}
          {vistaDetalle && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Camareros activos: {Object.values(cargaPorCamarero).filter(c => c.asignaciones.length > 0).length}/{camareros.length}</span>
            </div>
          )}
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
          <span className="text-slate-600">Alta demanda</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-orange-500" />
          <span className="text-slate-600">Conflictos disponibilidad</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-slate-300"></div>
          <span className="text-slate-600">Sin eventos</span>
        </div>
      </div>

      {/* Calendario */}
      <div className="grid grid-cols-7 gap-2">
        {/* Headers */}
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
            if (datos.altaDemanda) {
              colorFondo = 'bg-red-50';
              colorBorde = 'border-red-300';
            } else if (datos.pendientes === 0) {
              colorFondo = 'bg-emerald-50';
              colorBorde = 'border-emerald-300';
            } else if (datos.asignados > 0) {
              colorFondo = 'bg-amber-50';
              colorBorde = 'border-amber-300';
            }
          }

          return (
            <div
              key={dia.toString()}
              className={`
                ${vistaDetalle ? 'min-h-[160px]' : 'min-h-[100px]'} p-2 rounded-lg border transition-all
                ${esHoy ? 'border-[#1e3a5f] border-2 shadow-md' : colorBorde}
                ${!esMesActual ? 'opacity-40' : ''}
                ${colorFondo}
                hover:shadow-sm cursor-pointer relative
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${esHoy ? 'text-[#1e3a5f]' : 'text-slate-700'}`}>
                  {format(dia, 'd')}
                </span>
                <div className="flex items-center gap-1">
                  {datos.conflictos > 0 && (
                    <AlertTriangle className="w-3 h-3 text-orange-500" title="Conflictos de disponibilidad" />
                  )}
                  {tieneEventos && (
                    <Badge variant="outline" className="text-xs px-1 h-5">
                      {datos.pedidos.length}
                    </Badge>
                  )}
                </div>
              </div>

              {tieneEventos && (
                <div className="space-y-1">
                  {vistaDetalle && (
                    <div className="text-xs text-slate-600 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {datos.asignados}/{datos.totalCamareros}
                      </span>
                      {datos.altaDemanda && (
                        <AlertCircle className="w-3 h-3 text-red-500" title="Alta demanda" />
                      )}
                    </div>
                  )}
                  
                  {datos.pedidos.slice(0, vistaDetalle ? 3 : 2).map(pedido => {
                    const asigsPedido = datos.asignaciones.filter(a => a.pedido_id === pedido.id);
                    const totalNeeded = pedido.turnos?.length > 0 
                      ? pedido.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0)
                      : (pedido.cantidad_camareros || 0);
                    const porcentaje = totalNeeded > 0 ? Math.round((asigsPedido.length / totalNeeded) * 100) : 0;
                    
                    return (
                      <div 
                        key={pedido.id} 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPedido?.(pedido);
                        }}
                        className="text-xs bg-white rounded p-1.5 border border-slate-200 hover:bg-slate-50 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-semibold text-slate-700 truncate flex-1">{pedido.cliente}</p>
                          {vistaDetalle && (
                            <span className={`text-xs font-bold ml-1 ${
                              porcentaje === 100 ? 'text-emerald-600' :
                              porcentaje > 0 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {porcentaje}%
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {asigsPedido.length}/{totalNeeded}
                          </span>
                          {pedido.entrada && (
                            <span className="text-[10px] text-slate-400">
                              {pedido.entrada}
                            </span>
                          )}
                        </div>
                        
                        {/* Avatares de camareros asignados */}
                        {vistaDetalle && asigsPedido.length > 0 && (
                          <div className="flex items-center gap-0.5 mt-1.5 -ml-0.5">
                            {asigsPedido.slice(0, 3).map((asig, idx) => (
                              <div 
                                key={idx} 
                                className="relative group/avatar"
                                title={asig.camarero_nombre}
                              >
                                <Avatar className="w-5 h-5 border border-white shadow-sm">
                                  <AvatarFallback className={`text-[8px] font-semibold ${
                                    asig.estado === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                                    asig.estado === 'alta' ? 'bg-blue-100 text-blue-700' :
                                    asig.estado === 'enviado' ? 'bg-orange-100 text-orange-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {asig.camarero_nombre?.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {asig.estado === 'confirmado' && (
                                  <UserCheck className="w-2 h-2 text-emerald-600 absolute -bottom-0.5 -right-0.5 bg-white rounded-full" />
                                )}
                              </div>
                            ))}
                            {asigsPedido.length > 3 && (
                              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[8px] font-bold border border-white">
                                +{asigsPedido.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {datos.pedidos.length > (vistaDetalle ? 3 : 2) && (
                    <p className="text-xs text-slate-500 text-center">
                      +{datos.pedidos.length - (vistaDetalle ? 3 : 2)} más
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}