import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText as FileIcon, Calendar, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExportadorExcel } from './ExportadorExcel';

export default function InformeCliente() {
  const [modo, setModo] = useState('periodo'); // 'periodo' | 'evento'
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedPedido, setSelectedPedido] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes');

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const clientes = [...new Set(pedidos.map(p => p.cliente).filter(Boolean))].sort();

  const pedidosCliente = pedidos.filter(p => p.cliente === selectedCliente);

  const pedidosClienteFiltrados = pedidosCliente.filter(p => {
    if (!p.dia) return false;
    const fecha = new Date(p.dia);
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
    return true; // todos
  });

  // --- Modo PERÍODO: resumen agregado ---
  const resumenPeriodo = (() => {
    const eventos = pedidosClienteFiltrados;
    const totalEventos = eventos.length;
    const totalCamareros = eventos.reduce((sum, p) => {
      return sum + (p.turnos?.length > 0
        ? p.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0)
        : (p.cantidad_camareros || 0));
    }, 0);
    const totalHoras = eventos.reduce((sum, p) => {
      return sum + (p.turnos?.length > 0
        ? p.turnos.reduce((s, t) => s + ((t.t_horas || 0) * (t.cantidad_camareros || 0)), 0)
        : ((p.t_horas || 0) * (p.cantidad_camareros || 0)));
    }, 0);
    return { totalEventos, totalCamareros, totalHoras, eventos };
  })();

  // --- Modo EVENTO: detalle de un pedido ---
  const pedido = pedidos.find(p => p.id === selectedPedido);
  const datosEvento = pedido ? {
    dia: pedido.dia,
    cantidad_camareros: pedido.turnos?.length > 0
      ? pedido.turnos.reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0)
      : (pedido.cantidad_camareros || 0),
    total_horas: pedido.turnos?.length > 0
      ? pedido.turnos.reduce((sum, t) => sum + ((t.t_horas || 0) * (t.cantidad_camareros || 0)), 0)
      : ((pedido.t_horas || 0) * (pedido.cantidad_camareros || 0)),
    turnos: pedido.turnos || []
  } : null;

  const exportarExcel = () => {
    if (!datosEvento || !pedido) return;
    ExportadorExcel.exportarInformeCliente(pedido, datosEvento, selectedCliente);
  };

  const handleModoChange = (nuevoModo) => {
    setModo(nuevoModo);
    setSelectedPedido('');
    setFiltroPeriodo('mes');
  };

  const handleClienteChange = (v) => {
    setSelectedCliente(v);
    setSelectedPedido('');
  };

  return (
    <div className="space-y-6">
      {/* Selector de modo */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => handleModoChange('periodo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            modo === 'periodo'
              ? 'bg-white text-[#1e3a5f] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Rendimiento por período
        </button>
        <button
          onClick={() => handleModoChange('evento')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            modo === 'evento'
              ? 'bg-white text-[#1e3a5f] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Detalle de evento
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Seleccionar Cliente</label>
          <Select value={selectedCliente} onValueChange={handleClienteChange}>
            <SelectTrigger>
              <SelectValue placeholder="Elegir cliente..." />
            </SelectTrigger>
            <SelectContent>
              {clientes.map(cliente => (
                <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Modo PERÍODO: selector de período */}
        {modo === 'periodo' && selectedCliente && (
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Período</label>
            <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Esta semana</SelectItem>
                <SelectItem value="mes">Este mes</SelectItem>
                <SelectItem value="todos">Todos los eventos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Modo EVENTO: selector de evento */}
        {modo === 'evento' && selectedCliente && (
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Seleccionar Evento{' '}
              {pedidosCliente.length > 0 && (
                <span className="text-slate-400 font-normal">({pedidosCliente.length})</span>
              )}
            </label>
            <Select value={selectedPedido} onValueChange={setSelectedPedido}>
              <SelectTrigger>
                <SelectValue placeholder="Elegir evento..." />
              </SelectTrigger>
              <SelectContent>
                {pedidosCliente.length === 0 ? (
                  <SelectItem value="__empty__" disabled>Sin eventos</SelectItem>
                ) : pedidosCliente.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.dia ? format(new Date(p.dia), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'} — {p.lugar_evento || 'Sin ubicación'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* --- RESULTADO MODO PERÍODO --- */}
      {modo === 'periodo' && selectedCliente && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{selectedCliente}</h3>
                <p className="text-sm text-slate-500">
                  {filtroPeriodo === 'semana' ? 'Esta semana' : filtroPeriodo === 'mes' ? 'Este mes' : 'Todos los eventos'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Eventos</p>
                <p className="text-2xl font-bold text-slate-800">{resumenPeriodo.totalEventos}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Total Camareros</p>
                <p className="text-2xl font-bold text-[#1e3a5f]">{resumenPeriodo.totalCamareros}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Total Horas</p>
                <p className="text-2xl font-bold text-emerald-600">{resumenPeriodo.totalHoras.toFixed(2)}h</p>
              </div>
            </div>

            {resumenPeriodo.eventos.length > 0 ? (
              <div className="border-t pt-6">
                <h4 className="font-semibold text-slate-800 mb-4">Eventos del período</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead className="text-center">Camareros</TableHead>
                      <TableHead className="text-right">Horas Totales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumenPeriodo.eventos.map(p => {
                      const horas = p.turnos?.length > 0
                        ? p.turnos.reduce((s, t) => s + ((t.t_horas || 0) * (t.cantidad_camareros || 0)), 0)
                        : ((p.t_horas || 0) * (p.cantidad_camareros || 0));
                      const camareros = p.turnos?.length > 0
                        ? p.turnos.reduce((s, t) => s + (t.cantidad_camareros || 0), 0)
                        : (p.cantidad_camareros || 0);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.dia ? format(new Date(p.dia), 'dd MMM yyyy', { locale: es }) : '-'}
                          </TableCell>
                          <TableCell className="text-slate-600">{p.lugar_evento || '-'}</TableCell>
                          <TableCell className="text-center">{camareros}</TableCell>
                          <TableCell className="text-right font-semibold">{horas.toFixed(2)}h</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-slate-400 py-6">Sin eventos en este período</p>
            )}
          </div>
        </Card>
      )}

      {/* --- RESULTADO MODO EVENTO --- */}
      {modo === 'evento' && datosEvento && pedido && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{pedido.cliente}</h3>
                <p className="text-sm text-slate-500">{pedido.lugar_evento || 'Sin ubicación'}</p>
              </div>
              <Button onClick={exportarExcel} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Día del Evento</p>
                <p className="text-xl font-bold text-slate-800">
                  {datosEvento.dia ? format(new Date(datosEvento.dia), 'dd MMM yyyy', { locale: es }) : '-'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Total Camareros</p>
                <p className="text-xl font-bold text-[#1e3a5f]">{datosEvento.cantidad_camareros}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Total Horas Trabajadas</p>
                <p className="text-xl font-bold text-emerald-600">{datosEvento.total_horas.toFixed(2)}h</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-semibold text-slate-800 mb-4">Detalle de Turnos</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turno</TableHead>
                    <TableHead className="text-center">Camareros</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead className="text-center">Horas</TableHead>
                    <TableHead className="text-right">Total Horas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datosEvento.turnos.length > 0 ? (
                    datosEvento.turnos.map((turno, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">Turno {index + 1}</TableCell>
                        <TableCell className="text-center">{turno.cantidad_camareros || 0}</TableCell>
                        <TableCell className="font-mono text-sm">{turno.entrada || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{turno.salida || '-'}</TableCell>
                        <TableCell className="text-center">{turno.t_horas || 0}h</TableCell>
                        <TableCell className="text-right font-semibold">
                          {((turno.t_horas || 0) * (turno.cantidad_camareros || 0)).toFixed(2)}h
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="font-medium">Turno Único</TableCell>
                      <TableCell className="text-center">{pedido.cantidad_camareros || 0}</TableCell>
                      <TableCell className="font-mono text-sm">{pedido.entrada || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{pedido.salida || '-'}</TableCell>
                      <TableCell className="text-center">{pedido.t_horas || 0}h</TableCell>
                      <TableCell className="text-right font-semibold">{datosEvento.total_horas.toFixed(2)}h</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      )}

      {/* Placeholder */}
      {((modo === 'periodo' && !selectedCliente) || (modo === 'evento' && !selectedPedido)) && (
        <Card className="p-12 text-center text-slate-400">
          <FileIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>
            {modo === 'periodo'
              ? 'Selecciona un cliente para ver el rendimiento del período'
              : 'Selecciona un cliente y un evento para ver el detalle'}
          </p>
        </Card>
      )}
    </div>
  );
}