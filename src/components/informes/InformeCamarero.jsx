import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, User, CalendarDays, Building2, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExportadorExcel } from './ExportadorExcel';

const MODOS = [
  { id: 'periodo', label: 'Por período', icon: CalendarDays },
  { id: 'cliente', label: 'Por cliente', icon: Building2 },
  { id: 'coordinador', label: 'Por coordinador', icon: UserCog },
];

const PERIODOS = [
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'todos', label: 'Todos' },
];

export default function InformeCamarero() {
  const [modo, setModo] = useState('periodo');
  const [selectedCamarero, setSelectedCamarero] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroCoordinador, setFiltroCoordinador] = useState('');

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
    queryFn: () => base44.entities.AsignacionCamarero.list('-fecha_pedido', 2000)
  });

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores'],
    queryFn: () => base44.entities.Coordinador.list('nombre')
  });

  const camarero = camareros.find(c => c.id === selectedCamarero);

  // Clientes únicos de los pedidos
  const clientes = [...new Set(pedidos.map(p => p.cliente).filter(Boolean))].sort();

  // Asignaciones del camarero enriquecidas con datos del pedido
  const asignacionesBase = asignaciones
    .filter(a => a.camarero_id === selectedCamarero)
    .map(a => {
      const pedido = pedidos.find(p => p.id === a.pedido_id);
      if (!pedido) return null;
      let horas = pedido.turnos?.length > 0
        ? pedido.turnos.reduce((sum, t) => sum + (t.t_horas || 0), 0)
        : (pedido.t_horas || 0);
      return {
        dia: pedido.dia,
        cliente: pedido.cliente,
        lugar_evento: pedido.lugar_evento,
        coordinador_nombre: pedido.coordinador_nombre || '',
        horas
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.dia || '').localeCompare(a.dia || ''));

  // Aplicar filtro según modo
  const asignacionesFiltradas = asignacionesBase.filter(a => {
    if (modo === 'periodo') {
      if (!a.dia) return false;
      const fecha = new Date(a.dia);
      const hoy = new Date();
      if (filtroPeriodo === 'semana') {
        const inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - hoy.getDay());
        inicio.setHours(0, 0, 0, 0);
        const fin = new Date(inicio);
        fin.setDate(inicio.getDate() + 6);
        return fecha >= inicio && fecha <= fin;
      }
      if (filtroPeriodo === 'mes') {
        return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
      }
      return true;
    }
    if (modo === 'cliente') {
      return filtroCliente ? a.cliente === filtroCliente : true;
    }
    if (modo === 'coordinador') {
      if (!filtroCoordinador) return true;
      const coord = coordinadores.find(c => c.id === filtroCoordinador);
      return coord ? a.coordinador_nombre === coord.nombre : true;
    }
    return true;
  });

  const totalHoras = asignacionesFiltradas.reduce((sum, a) => sum + a.horas, 0);
  const totalEventos = asignacionesFiltradas.length;

  const handleModoChange = (nuevoModo) => {
    setModo(nuevoModo);
    setFiltroCliente('');
    setFiltroCoordinador('');
    setFiltroPeriodo('mes');
  };

  const exportarExcel = () => {
    if (!camarero || asignacionesFiltradas.length === 0) return;
    ExportadorExcel.exportarInformeCamarero(camarero, asignacionesFiltradas, totalEventos, totalHoras);
  };

  // Etiqueta del filtro activo para el subtítulo
  const subtitulo = (() => {
    if (modo === 'periodo') return PERIODOS.find(p => p.value === filtroPeriodo)?.label || '';
    if (modo === 'cliente') return filtroCliente ? `Cliente: ${filtroCliente}` : 'Todos los clientes';
    if (modo === 'coordinador') {
      const coord = coordinadores.find(c => c.id === filtroCoordinador);
      return coord ? `Coordinador: ${coord.nombre}` : 'Todos los coordinadores';
    }
    return '';
  })();

  return (
    <div className="space-y-6">
      {/* Selector de camarero */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">Seleccionar Camarero</label>
        <Select value={selectedCamarero} onValueChange={v => { setSelectedCamarero(v); }}>
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Elegir camarero..." />
          </SelectTrigger>
          <SelectContent>
            {camareros.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre} {c.codigo ? `(#${c.codigo})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCamarero && (
        <>
          {/* Selector de modo */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-fit">
            {MODOS.map(m => (
              <button
                key={m.id}
                onClick={() => handleModoChange(m.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  modo === m.id
                    ? 'bg-white text-[#1e3a5f] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <m.icon className="w-4 h-4" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Filtro dinámico según modo */}
          <div className="max-w-xs">
            {modo === 'periodo' && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Período</label>
                <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIODOS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {modo === 'cliente' && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Cliente</label>
                <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                  <SelectTrigger><SelectValue placeholder="Todos los clientes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos</SelectItem>
                    {clientes.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {modo === 'coordinador' && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Coordinador</label>
                <Select value={filtroCoordinador} onValueChange={setFiltroCoordinador}>
                  <SelectTrigger><SelectValue placeholder="Todos los coordinadores" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos</SelectItem>
                    {coordinadores.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Resultado */}
          {asignacionesFiltradas.length > 0 ? (
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{camarero?.nombre}</h3>
                    <p className="text-sm text-slate-500">{subtitulo}</p>
                  </div>
                  <Button onClick={exportarExcel} variant="outline" size="sm">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-500">Total Eventos</p>
                    <p className="text-2xl font-bold text-[#1e3a5f]">{totalEventos}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-500">Total Horas Trabajadas</p>
                    <p className="text-2xl font-bold text-emerald-600">{totalHoras.toFixed(2)}h</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-semibold text-slate-800 mb-4">Historial de Eventos</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Día</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Lugar del Evento</TableHead>
                        {modo === 'coordinador' && <TableHead>Coordinador</TableHead>}
                        <TableHead className="text-right">Horas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {asignacionesFiltradas.map((asig, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {asig.dia ? format(new Date(asig.dia), 'dd MMM yyyy', { locale: es }) : '-'}
                          </TableCell>
                          <TableCell>{asig.cliente || '-'}</TableCell>
                          <TableCell className="text-slate-600">{asig.lugar_evento || '-'}</TableCell>
                          {modo === 'coordinador' && <TableCell>{asig.coordinador_nombre || '-'}</TableCell>}
                          <TableCell className="text-right font-semibold">{asig.horas.toFixed(2)}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center text-slate-400">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay eventos con los filtros seleccionados</p>
            </Card>
          )}
        </>
      )}

      {!selectedCamarero && (
        <Card className="p-12 text-center text-slate-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Selecciona un camarero para ver el informe</p>
        </Card>
      )}
    </div>
  );
}