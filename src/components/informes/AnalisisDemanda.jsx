import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, TrendingUp, Clock, Calendar } from 'lucide-react';
import { format, parseISO, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORES_DIA = ['#1e3a5f', '#2d5a8f', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
const _COLORES_HORA = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#f59e0b', '#fbbf24', '#fcd34d'];

export default function AnalisisDemanda() {
  const [fechaInicio, setFechaInicio] = useState(format(new Date(2025, 0, 1), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [_tipoEvento, _setTipoEvento] = useState('todos');

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 1000)
  });

  const { data: _asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 3000)
  });

  // Filtrar pedidos por rango de fechas
  const pedidosFiltrados = useMemo(() => {
    const inicio = parseISO(fechaInicio);
    const fin = parseISO(fechaFin);
    
    return pedidos.filter(p => {
      if (!p.dia) return false;
      const fecha = parseISO(p.dia);
      return fecha >= inicio && fecha <= fin;
    });
  }, [pedidos, fechaInicio, fechaFin]);

  // Análisis por día de la semana
  const demandaPorDia = useMemo(() => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const conteo = Array(7).fill(0).map(() => ({ eventos: 0, camareros: 0, horas: 0 }));

    pedidosFiltrados.forEach(p => {
      const diaSemana = getDay(parseISO(p.dia));
      conteo[diaSemana].eventos += 1;
      conteo[diaSemana].camareros += p.cantidad_camareros || 0;
      conteo[diaSemana].horas += (p.t_horas || 0) * (p.cantidad_camareros || 1);
    });

    return dias.map((dia, index) => ({
      dia,
      eventos: conteo[index].eventos,
      camareros: conteo[index].camareros,
      horas: Math.round(conteo[index].horas * 10) / 10
    }));
  }, [pedidosFiltrados]);

  // Análisis por hora del día (basado en hora de entrada)
  const demandaPorHora = useMemo(() => {
    const conteoHoras = Array(24).fill(0).map(() => ({ eventos: 0, camareros: 0 }));

    pedidosFiltrados.forEach(p => {
      if (p.turnos?.length > 0) {
        p.turnos.forEach(turno => {
          if (turno.entrada) {
            const [hora] = turno.entrada.split(':').map(Number);
            if (hora >= 0 && hora < 24) {
              conteoHoras[hora].eventos += 1;
              conteoHoras[hora].camareros += turno.cantidad_camareros || 0;
            }
          }
        });
      } else if (p.entrada) {
        const [hora] = p.entrada.split(':').map(Number);
        if (hora >= 0 && hora < 24) {
          conteoHoras[hora].eventos += 1;
          conteoHoras[hora].camareros += p.cantidad_camareros || 0;
        }
      }
    });

    return conteoHoras.map((datos, hora) => ({
      hora: `${hora}:00`,
      eventos: datos.eventos,
      camareros: datos.camareros
    })).filter(d => d.eventos > 0);
  }, [pedidosFiltrados]);

  // Análisis por tipo de camisa (proxy de tipo de evento)
  const demandaPorTipo = useMemo(() => {
    const tipos = {};
    
    pedidosFiltrados.forEach(p => {
      const tipo = p.camisa || 'Sin especificar';
      if (!tipos[tipo]) {
        tipos[tipo] = { eventos: 0, camareros: 0, horas: 0 };
      }
      tipos[tipo].eventos += 1;
      tipos[tipo].camareros += p.cantidad_camareros || 0;
      tipos[tipo].horas += (p.t_horas || 0) * (p.cantidad_camareros || 1);
    });

    return Object.entries(tipos).map(([tipo, datos]) => ({
      tipo: tipo === 'blanca' ? 'Formal (Camisa Blanca)' : tipo === 'negra' ? 'Informal (Camisa Negra)' : tipo,
      value: datos.eventos,
      camareros: datos.camareros,
      horas: Math.round(datos.horas * 10) / 10
    }));
  }, [pedidosFiltrados]);

  // Picos de demanda (top 10 días con más eventos)
  const picosDemanda = useMemo(() => {
    const porDia = {};
    
    pedidosFiltrados.forEach(p => {
      const fecha = p.dia;
      if (!porDia[fecha]) {
        porDia[fecha] = { fecha, eventos: 0, camareros: 0, horas: 0 };
      }
      porDia[fecha].eventos += 1;
      porDia[fecha].camareros += p.cantidad_camareros || 0;
      porDia[fecha].horas += (p.t_horas || 0) * (p.cantidad_camareros || 1);
    });

    return Object.values(porDia)
      .sort((a, b) => b.camareros - a.camareros)
      .slice(0, 10)
      .map(d => ({
        ...d,
        fechaFormato: format(parseISO(d.fecha), 'dd MMM yyyy', { locale: es }),
        diaSemana: format(parseISO(d.fecha), 'EEEE', { locale: es })
      }));
  }, [pedidosFiltrados]);

  // Estadísticas generales
  const estadisticas = useMemo(() => {
    const totalEventos = pedidosFiltrados.length;
    const totalCamareros = pedidosFiltrados.reduce((sum, p) => sum + (p.cantidad_camareros || 0), 0);
    const totalHoras = pedidosFiltrados.reduce((sum, p) => sum + ((p.t_horas || 0) * (p.cantidad_camareros || 1)), 0);
    const promedioCamareros = totalEventos > 0 ? totalCamareros / totalEventos : 0;
    const promedioHoras = totalEventos > 0 ? totalHoras / totalEventos : 0;
    
    // Día con más demanda
    const diaMasDemanda = demandaPorDia.reduce((max, d) => d.camareros > max.camareros ? d : max, demandaPorDia[0] || {});
    
    // Hora pico
    const horaPico = demandaPorHora.reduce((max, h) => h.camareros > max.camareros ? h : max, demandaPorHora[0] || {});

    return {
      totalEventos,
      totalCamareros,
      totalHoras: Math.round(totalHoras * 10) / 10,
      promedioCamareros: Math.round(promedioCamareros * 10) / 10,
      promedioHoras: Math.round(promedioHoras * 10) / 10,
      diaMasDemanda: diaMasDemanda?.dia || '-',
      horaPico: horaPico?.hora || '-'
    };
  }, [pedidosFiltrados, demandaPorDia, demandaPorHora]);

  const exportarCSV = () => {
    const filas = [
      ['ANÁLISIS DE DEMANDA DE SERVICIOS'],
      ['Período:', `${fechaInicio} a ${fechaFin}`],
      [],
      ['ESTADÍSTICAS GENERALES'],
      ['Total Eventos', estadisticas.totalEventos],
      ['Total Camareros Asignados', estadisticas.totalCamareros],
      ['Total Horas Trabajadas', estadisticas.totalHoras],
      ['Promedio Camareros/Evento', estadisticas.promedioCamareros],
      ['Promedio Horas/Evento', estadisticas.promedioHoras],
      ['Día con Más Demanda', estadisticas.diaMasDemanda],
      ['Hora Pico', estadisticas.horaPico],
      [],
      ['DEMANDA POR DÍA DE LA SEMANA'],
      ['Día', 'Eventos', 'Camareros', 'Horas'],
      ...demandaPorDia.map(d => [d.dia, d.eventos, d.camareros, d.horas]),
      [],
      ['DEMANDA POR HORA'],
      ['Hora', 'Eventos', 'Camareros'],
      ...demandaPorHora.map(h => [h.hora, h.eventos, h.camareros]),
      [],
      ['DEMANDA POR TIPO'],
      ['Tipo', 'Eventos', 'Camareros', 'Horas'],
      ...demandaPorTipo.map(t => [t.tipo, t.value, t.camareros, t.horas]),
      [],
      ['PICOS DE DEMANDA (TOP 10)'],
      ['Fecha', 'Día Semana', 'Eventos', 'Camareros', 'Horas'],
      ...picosDemanda.map(p => [p.fechaFormato, p.diaSemana, p.eventos, p.camareros, p.horas])
    ];

    const csv = filas.map(fila => fila.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analisis_demanda_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Desde</label>
            <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Hasta</label>
            <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-40" />
          </div>
          <Button variant="outline" onClick={exportarCSV} className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </Card>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Total Eventos</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{estadisticas.totalEventos}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Camareros</span>
          </div>
          <p className="text-2xl font-bold text-[#1e3a5f]">{estadisticas.totalCamareros}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Horas Totales</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{estadisticas.totalHoras}h</p>
        </Card>
        <Card className="p-4 bg-blue-50">
          <div className="text-xs text-blue-600 mb-1">Promedio Cam./Evento</div>
          <p className="text-2xl font-bold text-blue-700">{estadisticas.promedioCamareros}</p>
        </Card>
        <Card className="p-4 bg-purple-50">
          <div className="text-xs text-purple-600 mb-1">Promedio Hrs/Evento</div>
          <p className="text-2xl font-bold text-purple-700">{estadisticas.promedioHoras}h</p>
        </Card>
        <Card className="p-4 bg-amber-50">
          <div className="text-xs text-amber-600 mb-1">Día Más Demanda</div>
          <p className="text-lg font-bold text-amber-700">{estadisticas.diaMasDemanda}</p>
        </Card>
        <Card className="p-4 bg-emerald-50">
          <div className="text-xs text-emerald-600 mb-1">Hora Pico</div>
          <p className="text-lg font-bold text-emerald-700">{estadisticas.horaPico}</p>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Demanda por Día de la Semana</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandaPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" fontSize={12} angle={-45} textAnchor="end" height={80} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="eventos" fill="#1e3a5f" name="Eventos" />
                <Bar dataKey="camareros" fill="#10b981" name="Camareros" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Distribución por Tipo de Evento</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demandaPorTipo}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ tipo, value, percent }) => `${tipo}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {demandaPorTipo.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORES_DIA[index % COLORES_DIA.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Demanda por Hora del Día</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demandaPorHora}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hora" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="eventos" stroke="#1e3a5f" strokeWidth={2} name="Eventos" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="camareros" stroke="#10b981" strokeWidth={2} name="Camareros" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Picos de Demanda (Top 10 Días)</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {picosDemanda.map((pico, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div>
                  <p className="font-medium text-slate-800">{pico.fechaFormato}</p>
                  <p className="text-xs text-slate-500">{pico.diaSemana}</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Eventos</p>
                    <p className="font-bold text-[#1e3a5f]">{pico.eventos}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Camareros</p>
                    <p className="font-bold text-emerald-600">{pico.camareros}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Horas</p>
                    <p className="font-bold text-amber-600">{pico.horas}h</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Insights */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Insights de Demanda</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Día de Mayor Demanda</p>
              <p className="text-sm text-blue-700">
                Los {estadisticas.diaMasDemanda}s concentran la mayor cantidad de eventos y requerimiento de personal
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg">
            <Clock className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-900">Hora Pico</p>
              <p className="text-sm text-emerald-700">
                La mayoría de eventos comienzan alrededor de las {estadisticas.horaPico}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-medium text-purple-900">Promedio de Recursos</p>
              <p className="text-sm text-purple-700">
                Cada evento requiere en promedio {estadisticas.promedioCamareros} camareros durante {estadisticas.promedioHoras} horas
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
            <Calendar className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Distribución de Eventos</p>
              <p className="text-sm text-amber-700">
                Total de {estadisticas.totalEventos} eventos gestionados en el período seleccionado
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}