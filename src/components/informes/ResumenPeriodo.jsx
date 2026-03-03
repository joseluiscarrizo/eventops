import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Clock, Users, TrendingUp, FileSpreadsheet } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ExportadorExcel } from './ExportadorExcel';

export default function ResumenPeriodo() {
  const [periodo, setPeriodo] = useState('semana');
  const [fechaInicio, setFechaInicio] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 2000)
  });

  // Filtrar pedidos por período
  const pedidosFiltrados = useMemo(() => {
    let inicio, fin;
    const hoy = new Date();

    if (periodo === 'dia') {
      inicio = fin = hoy;
    } else if (periodo === 'semana') {
      inicio = startOfWeek(hoy, { weekStartsOn: 1 });
      fin = endOfWeek(hoy, { weekStartsOn: 1 });
    } else if (periodo === 'mes') {
      inicio = startOfMonth(hoy);
      fin = endOfMonth(hoy);
    } else {
      inicio = parseISO(fechaInicio);
      fin = parseISO(fechaFin);
    }

    return pedidos.filter(p => {
      if (!p.dia) return false;
      const fecha = parseISO(p.dia);
      return isWithinInterval(fecha, { start: inicio, end: fin });
    });
  }, [pedidos, periodo, fechaInicio, fechaFin]);

  // Estadísticas generales
  const stats = useMemo(() => {
    const totalPedidos = pedidosFiltrados.length;
    const totalCamareros = pedidosFiltrados.reduce((acc, p) => acc + (p.cantidad_camareros || 0), 0);
    const totalHoras = pedidosFiltrados.reduce((acc, p) => acc + ((p.t_horas || 0) * (p.cantidad_camareros || 1)), 0);
    
    const asignacionesPeriodo = asignaciones.filter(a => 
      pedidosFiltrados.some(p => p.id === a.pedido_id)
    );
    
    const confirmados = asignacionesPeriodo.filter(a => a.estado === 'confirmado' || a.estado === 'alta').length;
    const enviados = asignacionesPeriodo.filter(a => a.estado === 'enviado').length;
    const pendientes = asignacionesPeriodo.filter(a => a.estado === 'pendiente').length;
    
    const tasaConfirmacion = asignacionesPeriodo.length > 0 
      ? Math.round((confirmados / asignacionesPeriodo.length) * 100) 
      : 0;

    return { totalPedidos, totalCamareros, totalHoras, confirmados, enviados, pendientes, tasaConfirmacion };
  }, [pedidosFiltrados, asignaciones]);

  // Datos para gráfico por día
  const datosPorDia = useMemo(() => {
    const porDia = {};
    pedidosFiltrados.forEach(p => {
      const dia = p.dia;
      if (!porDia[dia]) {
        porDia[dia] = { fecha: dia, pedidos: 0, horas: 0, camareros: 0 };
      }
      porDia[dia].pedidos += 1;
      porDia[dia].horas += (p.t_horas || 0) * (p.cantidad_camareros || 1);
      porDia[dia].camareros += p.cantidad_camareros || 0;
    });
    
    return Object.values(porDia)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map(d => ({
        ...d,
        fechaCorta: format(parseISO(d.fecha), 'dd MMM', { locale: es })
      }));
  }, [pedidosFiltrados]);

  // Datos por cliente
  const datosPorCliente = useMemo(() => {
    const porCliente = {};
    pedidosFiltrados.forEach(p => {
      const cliente = p.cliente || 'Sin nombre';
      if (!porCliente[cliente]) {
        porCliente[cliente] = { cliente, pedidos: 0, horas: 0, camareros: 0 };
      }
      porCliente[cliente].pedidos += 1;
      porCliente[cliente].horas += (p.t_horas || 0) * (p.cantidad_camareros || 1);
      porCliente[cliente].camareros += p.cantidad_camareros || 0;
    });
    return Object.values(porCliente).sort((a, b) => b.pedidos - a.pedidos);
  }, [pedidosFiltrados]);

  const exportarExcel = () => {
    ExportadorExcel.exportarResumenPeriodo(pedidosFiltrados, stats, datosPorCliente, periodo, fechaInicio, fechaFin);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Período</label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dia">Hoy</SelectItem>
                <SelectItem value="semana">Esta Semana</SelectItem>
                <SelectItem value="mes">Este Mes</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {periodo === 'personalizado' && (
            <>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Desde</label>
                <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-40" />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Hasta</label>
                <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-40" />
              </div>
            </>
          )}
          
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={exportarExcel} size="sm">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <ClipboardList className="w-4 h-4" />
            <span className="text-xs">Pedidos</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.totalPedidos}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Camareros</span>
          </div>
          <p className="text-2xl font-bold text-[#1e3a5f]">{stats.totalCamareros}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Horas Totales</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.totalHoras.toFixed(1)}h</p>
        </Card>
        <Card className="p-4 bg-emerald-50">
          <div className="text-xs text-emerald-600 mb-1">Confirmados</div>
          <p className="text-2xl font-bold text-emerald-700">{stats.confirmados}</p>
        </Card>
        <Card className="p-4 bg-orange-50">
          <div className="text-xs text-orange-600 mb-1">Enviados</div>
          <p className="text-2xl font-bold text-orange-700">{stats.enviados}</p>
        </Card>
        <Card className="p-4 bg-slate-100">
          <div className="text-xs text-slate-600 mb-1">Pendientes</div>
          <p className="text-2xl font-bold text-slate-700">{stats.pendientes}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Tasa Confirm.</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.tasaConfirmacion}%</p>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Pedidos por Día</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fechaCorta" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="pedidos" fill="#1e3a5f" name="Pedidos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Horas por Día</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fechaCorta" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="horas" stroke="#10b981" strokeWidth={2} name="Horas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tabla por cliente */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h3 className="font-semibold text-slate-800">Resumen por Cliente</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-center">Pedidos</TableHead>
              <TableHead className="text-center">Camareros</TableHead>
              <TableHead className="text-center">Horas Totales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {datosPorCliente.slice(0, 10).map(c => (
              <TableRow key={c.cliente}>
                <TableCell className="font-medium">{c.cliente}</TableCell>
                <TableCell className="text-center">{c.pedidos}</TableCell>
                <TableCell className="text-center">{c.camareros}</TableCell>
                <TableCell className="text-center">{c.horas.toFixed(1)}h</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}