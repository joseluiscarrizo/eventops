import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, TrendingUp, Clock, CheckCircle, Star, FileSpreadsheet } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ExportadorExcel } from './ExportadorExcel';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

export default function RendimientoCamareros() {
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 2000)
  });

  // Calcular rendimiento por camarero
  const rendimientoCamareros = useMemo(() => {
    const inicio = parseISO(fechaInicio);
    const fin = parseISO(fechaFin);

    return camareros.map(camarero => {
      const asignacionesCamarero = asignaciones.filter(a => {
        if (a.camarero_id !== camarero.id) return false;
        if (!a.fecha_pedido) return true;
        const fecha = parseISO(a.fecha_pedido);
        return fecha >= inicio && fecha <= fin;
      });

      const pedidosAsignados = asignacionesCamarero.length;
      const confirmados = asignacionesCamarero.filter(a => a.estado === 'confirmado' || a.estado === 'alta').length;
      const enviados = asignacionesCamarero.filter(a => a.estado === 'enviado').length;
      const altas = asignacionesCamarero.filter(a => a.estado === 'alta').length;
      const pendientes = asignacionesCamarero.filter(a => a.estado === 'pendiente').length;

      // Calcular horas trabajadas
      let horasTrabajadas = 0;
      asignacionesCamarero.forEach(a => {
        const pedido = pedidos.find(p => p.id === a.pedido_id);
        if (pedido) {
          horasTrabajadas += pedido.t_horas || 0;
        }
      });

      const tasaConfirmacion = pedidosAsignados > 0 
        ? Math.round((confirmados / pedidosAsignados) * 100) 
        : 0;

      return {
        id: camarero.id,
        nombre: camarero.nombre,
        codigo: camarero.codigo,
        especialidad: camarero.especialidad,
        disponible: camarero.disponible,
        pedidosAsignados,
        horasTrabajadas,
        confirmados,
        enviados,
        altas,
        pendientes,
        tasaConfirmacion
      };
    }).sort((a, b) => b.horasTrabajadas - a.horasTrabajadas);
  }, [camareros, asignaciones, pedidos, fechaInicio, fechaFin]);

  // Filtrar por búsqueda
  const rendimientoFiltrado = rendimientoCamareros.filter(r =>
    r.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.codigo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Top 5 camareros por horas
  const topCamareros = rendimientoCamareros.slice(0, 5);

  // Distribución de estados
  const distribucionEstados = useMemo(() => {
    const totales = rendimientoCamareros.reduce((acc, r) => ({
      confirmados: acc.confirmados + r.confirmados,
      enviados: acc.enviados + r.enviados,
      altas: acc.altas + r.altas,
      pendientes: acc.pendientes + r.pendientes
    }), { confirmados: 0, enviados: 0, altas: 0, pendientes: 0 });

    return [
      { name: 'Confirmados', value: totales.confirmados, color: '#10b981' },
      { name: 'Enviados', value: totales.enviados, color: '#f59e0b' },
      { name: 'Alta', value: totales.altas, color: '#3b82f6' },
      { name: 'Pendientes', value: totales.pendientes, color: '#94a3b8' }
    ].filter(d => d.value > 0);
  }, [rendimientoCamareros]);

  // Estadísticas globales
  const statsGlobales = useMemo(() => {
    const totalHoras = rendimientoCamareros.reduce((acc, r) => acc + r.horasTrabajadas, 0);
    const totalPedidos = rendimientoCamareros.reduce((acc, r) => acc + r.pedidosAsignados, 0);
    const promedioHoras = camareros.length > 0 ? totalHoras / camareros.length : 0;
    const tasaGlobal = totalPedidos > 0 
      ? Math.round((rendimientoCamareros.reduce((acc, r) => acc + r.confirmados, 0) / totalPedidos) * 100)
      : 0;
    return { totalHoras, totalPedidos, promedioHoras, tasaGlobal };
  }, [rendimientoCamareros, camareros]);

  const exportarExcel = () => {
    ExportadorExcel.exportarRendimientoCamareros(rendimientoFiltrado, statsGlobales, fechaInicio, fechaFin);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar camarero..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Desde</label>
            <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Hasta</label>
            <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-40" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportarExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Horas Totales</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{statsGlobales.totalHoras.toFixed(1)}h</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Promedio/Camarero</span>
          </div>
          <p className="text-2xl font-bold text-[#1e3a5f]">{statsGlobales.promedioHoras.toFixed(1)}h</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs">Total Asignaciones</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{statsGlobales.totalPedidos}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Star className="w-4 h-4" />
            <span className="text-xs">Tasa Confirmación</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{statsGlobales.tasaGlobal}%</p>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Top 5 Camareros (por horas)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCamareros} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="nombre" type="category" fontSize={12} width={100} />
                <Tooltip />
                <Bar dataKey="horasTrabajadas" fill="#1e3a5f" name="Horas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Distribución de Estados</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribucionEstados}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {distribucionEstados.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tabla de rendimiento */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h3 className="font-semibold text-slate-800">Rendimiento por Camarero</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Camarero</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead className="text-center">Pedidos</TableHead>
                <TableHead className="text-center">Horas</TableHead>
                <TableHead className="text-center">Confirmados</TableHead>
                <TableHead className="text-center">Enviados</TableHead>
                <TableHead className="text-center">Alta</TableHead>
                <TableHead className="text-center">Pendientes</TableHead>
                <TableHead>Tasa Confirmación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rendimientoFiltrado.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{r.nombre}</span>
                      <span className="text-xs text-slate-400 ml-2">#{r.codigo}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {r.especialidad?.replace('_', ' ') || 'general'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">{r.pedidosAsignados}</TableCell>
                  <TableCell className="text-center font-medium">{r.horasTrabajadas.toFixed(1)}h</TableCell>
                  <TableCell className="text-center">
                    <span className="text-emerald-600 font-medium">{r.confirmados}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-orange-600 font-medium">{r.enviados}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-blue-600 font-medium">{r.altas}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-slate-500">{r.pendientes}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={r.tasaConfirmacion} className="h-2 w-20" />
                      <span className="text-sm font-medium">{r.tasaConfirmacion}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}