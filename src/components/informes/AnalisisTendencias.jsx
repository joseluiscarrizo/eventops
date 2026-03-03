import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Users, Star, Clock, Target, Download } from 'lucide-react';
import { format, startOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, ComposedChart } from 'recharts';

export default function AnalisisTendencias() {
  const [mesesAtras, setMesesAtras] = useState(6);
  const [metrica, setMetrica] = useState('eventos');

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 1000)
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 3000)
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: valoraciones = [] } = useQuery({
    queryKey: ['valoraciones'],
    queryFn: () => base44.entities.Valoracion.list('-created_date', 1000)
  });

  // Análisis de tendencias mensuales
  const tendenciasMensuales = useMemo(() => {
    const fechaInicio = startOfMonth(subMonths(new Date(), mesesAtras - 1));
    const fechaFin = new Date();
    const meses = eachMonthOfInterval({ start: fechaInicio, end: fechaFin });

    return meses.map(mes => {
      const mesStr = format(mes, 'yyyy-MM');
      const pedidosMes = pedidos.filter(p => p.dia?.startsWith(mesStr));
      const asignacionesMes = asignaciones.filter(a => a.fecha_pedido?.startsWith(mesStr));

      const totalEventos = pedidosMes.length;
      const totalCamareros = asignacionesMes.length;
      const totalHoras = pedidosMes.reduce((sum, p) => {
        if (p.turnos?.length > 0) {
          return sum + p.turnos.reduce((s, t) => s + ((t.t_horas || 0) * (t.cantidad_camareros || 0)), 0);
        }
        return sum + ((p.t_horas || 0) * (p.cantidad_camareros || 0));
      }, 0);

      const confirmados = asignacionesMes.filter(a => a.estado === 'confirmado' || a.estado === 'alta').length;
      const tasaConfirmacion = asignacionesMes.length > 0 ? (confirmados / asignacionesMes.length) * 100 : 0;

      // Valoraciones del mes
      const valoracionesMes = valoraciones.filter(v => v.created_date?.startsWith(mesStr));
      const valoracionPromedio = valoracionesMes.length > 0
        ? valoracionesMes.reduce((sum, v) => sum + (v.puntuacion || 0), 0) / valoracionesMes.length
        : 0;

      // Clientes únicos
      const clientesUnicos = new Set(pedidosMes.map(p => p.cliente).filter(Boolean)).size;

      return {
        mes: format(mes, 'MMM yyyy', { locale: es }),
        mesCorto: format(mes, 'MMM', { locale: es }),
        totalEventos,
        totalCamareros,
        totalHoras,
        tasaConfirmacion: Math.round(tasaConfirmacion),
        valoracionPromedio: Math.round(valoracionPromedio * 10) / 10,
        clientesUnicos,
        horasPromedio: totalEventos > 0 ? Math.round((totalHoras / totalEventos) * 10) / 10 : 0
      };
    });
  }, [pedidos, asignaciones, valoraciones, mesesAtras]);

  // KPIs y comparación con mes anterior
  const kpisActuales = useMemo(() => {
    if (tendenciasMensuales.length < 2) return null;
    
    const mesActual = tendenciasMensuales[tendenciasMensuales.length - 1];
    const mesAnterior = tendenciasMensuales[tendenciasMensuales.length - 2];

    const calcularCambio = (actual, anterior) => {
      if (anterior === 0) return actual > 0 ? 100 : 0;
      return ((actual - anterior) / anterior) * 100;
    };

    return {
      eventos: {
        valor: mesActual.totalEventos,
        cambio: calcularCambio(mesActual.totalEventos, mesAnterior.totalEventos)
      },
      horas: {
        valor: mesActual.totalHoras,
        cambio: calcularCambio(mesActual.totalHoras, mesAnterior.totalHoras)
      },
      confirmacion: {
        valor: mesActual.tasaConfirmacion,
        cambio: calcularCambio(mesActual.tasaConfirmacion, mesAnterior.tasaConfirmacion)
      },
      satisfaccion: {
        valor: mesActual.valoracionPromedio,
        cambio: calcularCambio(mesActual.valoracionPromedio, mesAnterior.valoracionPromedio)
      },
      clientes: {
        valor: mesActual.clientesUnicos,
        cambio: calcularCambio(mesActual.clientesUnicos, mesAnterior.clientesUnicos)
      }
    };
  }, [tendenciasMensuales]);

  // Utilización de recursos
  const utilizacionRecursos = useMemo(() => {
    return tendenciasMensuales.map(mes => ({
      mes: mes.mesCorto,
      disponibles: camareros.filter(c => c.disponible).length,
      asignados: mes.totalCamareros,
      utilizacion: camareros.length > 0 
        ? Math.round((mes.totalCamareros / (camareros.length * 20)) * 100) // Asumiendo 20 días laborables
        : 0
    }));
  }, [tendenciasMensuales, camareros]);

  const exportarDatos = () => {
    const headers = ['Mes', 'Eventos', 'Camareros', 'Horas', 'Tasa Confirmación', 'Valoración Promedio', 'Clientes Únicos'];
    const rows = tendenciasMensuales.map(m => [
      m.mes, m.totalEventos, m.totalCamareros, m.totalHoras.toFixed(1),
      `${m.tasaConfirmacion}%`, m.valoracionPromedio.toFixed(1), m.clientesUnicos
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analisis_tendencias_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const KPICard = ({ icon: Icon, label, valor, cambio, formato = '' }) => {
    const isPositivo = cambio >= 0;
    const TrendIcon = isPositivo ? TrendingUp : TrendingDown;

    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-slate-500 mb-2">
          <Icon className="w-4 h-4" />
          <span className="text-xs">{label}</span>
        </div>
        <div className="flex items-end justify-between">
          <p className="text-2xl font-bold text-slate-800">
            {formato === '%' ? `${valor}%` : formato === 'h' ? `${valor}h` : valor}
          </p>
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositivo ? 'text-emerald-600' : 'text-red-600'}`}>
            <TrendIcon className="w-4 h-4" />
            {Math.abs(cambio).toFixed(1)}%
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Período</label>
            <Select value={mesesAtras.toString()} onValueChange={(v) => setMesesAtras(parseInt(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
                <SelectItem value="24">24 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={exportarDatos} className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </Card>

      {/* KPIs con tendencia */}
      {kpisActuales && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard icon={Target} label="Eventos" valor={kpisActuales.eventos.valor} cambio={kpisActuales.eventos.cambio} />
          <KPICard icon={Clock} label="Horas Trabajadas" valor={kpisActuales.horas.valor.toFixed(0)} cambio={kpisActuales.horas.cambio} formato="h" />
          <KPICard icon={Users} label="Tasa Confirmación" valor={kpisActuales.confirmacion.valor} cambio={kpisActuales.confirmacion.cambio} formato="%" />
          <KPICard icon={Star} label="Satisfacción" valor={kpisActuales.satisfaccion.valor} cambio={kpisActuales.satisfaccion.cambio} />
          <KPICard icon={Users} label="Clientes Activos" valor={kpisActuales.clientes.valor} cambio={kpisActuales.clientes.cambio} />
        </div>
      )}

      {/* Gráfico principal de tendencias */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Tendencias de Operación</h3>
          <Select value={metrica} onValueChange={setMetrica}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eventos">Eventos</SelectItem>
              <SelectItem value="horas">Horas Trabajadas</SelectItem>
              <SelectItem value="confirmacion">Tasa Confirmación</SelectItem>
              <SelectItem value="satisfaccion">Satisfacción Cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={tendenciasMensuales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mesCorto" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              {metrica === 'eventos' && (
                <>
                  <Area type="monotone" dataKey="totalEventos" fill="#1e3a5f" fillOpacity={0.1} stroke="#1e3a5f" strokeWidth={2} name="Eventos" />
                  <Line type="monotone" dataKey="clientesUnicos" stroke="#10b981" strokeWidth={2} name="Clientes Únicos" dot={{ r: 4 }} />
                </>
              )}
              {metrica === 'horas' && (
                <Bar dataKey="totalHoras" fill="#1e3a5f" name="Horas Totales" />
              )}
              {metrica === 'confirmacion' && (
                <Line type="monotone" dataKey="tasaConfirmacion" stroke="#10b981" strokeWidth={3} name="Tasa Confirmación %" dot={{ r: 5 }} />
              )}
              {metrica === 'satisfaccion' && (
                <Line type="monotone" dataKey="valoracionPromedio" stroke="#f59e0b" strokeWidth={3} name="Satisfacción (1-5)" dot={{ r: 5 }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Utilización de recursos y satisfacción */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Utilización de Personal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilizacionRecursos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="asignados" fill="#1e3a5f" name="Asignaciones" />
                <Bar dataKey="utilizacion" fill="#10b981" name="Utilización %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Satisfacción del Cliente</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tendenciasMensuales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mesCorto" fontSize={12} />
                <YAxis domain={[0, 5]} fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="valoracionPromedio" fill="#f59e0b" fillOpacity={0.3} stroke="#f59e0b" strokeWidth={2} name="Valoración Promedio" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-500">
              Valoración actual: <span className="font-bold text-amber-600 text-lg">
                {tendenciasMensuales[tendenciasMensuales.length - 1]?.valoracionPromedio || 0}/5
              </span>
            </p>
          </div>
        </Card>
      </div>

      {/* Insights y recomendaciones */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Insights Clave</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kpisActuales && (
            <>
              {kpisActuales.eventos.cambio > 10 && (
                <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-900">Crecimiento Significativo</p>
                    <p className="text-sm text-emerald-700">Los eventos aumentaron un {kpisActuales.eventos.cambio.toFixed(1)}% este mes</p>
                  </div>
                </div>
              )}
              {kpisActuales.confirmacion.valor < 70 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Tasa de Confirmación Baja</p>
                    <p className="text-sm text-red-700">Solo el {kpisActuales.confirmacion.valor}% de asignaciones confirmadas</p>
                  </div>
                </div>
              )}
              {kpisActuales.satisfaccion.valor >= 4 && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <Star className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Excelente Satisfacción</p>
                    <p className="text-sm text-amber-700">Valoración promedio de {kpisActuales.satisfaccion.valor}/5</p>
                  </div>
                </div>
              )}
              {kpisActuales.clientes.cambio > 20 && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Base de Clientes en Crecimiento</p>
                    <p className="text-sm text-blue-700">+{kpisActuales.clientes.cambio.toFixed(0)}% clientes nuevos</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}