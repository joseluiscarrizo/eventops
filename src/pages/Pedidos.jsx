import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ClipboardList, Sparkles, Calendar, MapPin, Ban, Copy, Repeat, Download, Upload, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import AIExtractor from '../components/pedidos/AIExtractor';
import EntradaAutomatica from '../components/pedidos/EntradaAutomatica';
import EdicionRapida from '../components/pedidos/EdicionRapida';
import DuplicarEvento from '../components/pedidos/DuplicarEvento';
import EventoRecurrente from '../components/pedidos/EventoRecurrente';
import PedidoFormNuevo from '../components/pedidos/PedidoFormNuevo';
import GenerarDocumentacion from '../components/pedidos/GenerarDocumentacion';
import ParteServicio from '../components/pedidos/ParteServicio';
import SugerenciasInteligentes from '../components/asignacion/SugerenciasInteligentes';
import PullToRefresh from '../components/ui/PullToRefresh';
import PedidoCardMobile from '../components/pedidos/PedidoCardMobile';
import { useIsMobile } from '../components/ui/useIsMobile';

export default function Pedidos() {
  const isMobile = useIsMobile();
  const [showForm, setShowForm] = useState(false);
  const [showAIExtractor, setShowAIExtractor] = useState(false);
  const [showEntradaAuto, setShowEntradaAuto] = useState(false);
  const [editingPedido, setEditingPedido] = useState(null);
  const [edicionRapida, setEdicionRapida] = useState({ open: false, pedido: null, campo: null });
  const [duplicarDialog, setDuplicarDialog] = useState({ open: false, pedido: null });
  const [recurrenteDialog, setRecurrenteDialog] = useState({ open: false, pedido: null });
  const [parteDialog, setParteDialog] = useState({ open: false, pedido: null });
  const [editingSalida, setEditingSalida] = useState({ pedidoId: null, turnoIndex: null, camareroIndex: null });
  const [formData, setFormData] = useState({
    codigo_pedido: '',
    cliente_id: '',
    cliente: '',
    cliente_email_1: '',
    cliente_email_2: '',
    cliente_telefono_1: '',
    cliente_telefono_2: '',
    cliente_persona_contacto_1: '',
    cliente_persona_contacto_2: '',
    lugar_evento: '',
    dia: '',
    turnos: [],
    camisa: '',
    extra_transporte: false,
    notas: ''
  });

  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos'],
    queryFn: async () => {
      try {
        // Ventana de 3 meses atrás → 6 meses adelante para tener contexto operativo completo
        const hoy         = new Date();
        const desde       = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1);
        const hasta       = new Date(hoy.getFullYear(), hoy.getMonth() + 6, 0);
        const desdeStr    = format(desde, 'yyyy-MM-dd');
        const hastaStr    = format(hasta, 'yyyy-MM-dd');

        const data = await base44.entities.Pedido.filter({
          dia: { $gte: desdeStr, $lte: hastaStr }
        }, '-dia', 300);
        return data.sort((a, b) => (a.dia || '').localeCompare(b.dia || ''));
      } catch (error) {
        // Fallback al list si el filter falla (p.ej. operador no soportado en esta versión SDK)
        console.error('Error cargando pedidos con filtro, usando fallback:', error);
        try {
          const data = await base44.entities.Pedido.list('-dia', 300);
          return data.sort((a, b) => (a.dia || '').localeCompare(b.dia || ''));
        } catch (fallbackError) {
          console.error('Error cargando pedidos:', fallbackError);
          return [];
        }
      }
    }
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nombre')
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: async () => {
      try {
        // Solo asignaciones de los últimos 3 meses y próximos 6 (alineado con el filtro de pedidos)
        const hoy      = new Date();
        const desde    = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1);
        const hasta    = new Date(hoy.getFullYear(), hoy.getMonth() + 6, 0);
        return await base44.entities.AsignacionCamarero.filter({
          fecha_pedido: { $gte: format(desde, 'yyyy-MM-dd'), $lte: format(hasta, 'yyyy-MM-dd') }
        }, '-created_date', 500);
      } catch {
        return await base44.entities.AsignacionCamarero.list('-created_date', 500);
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pedido.create(data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['pedidos'] });
      const previous = queryClient.getQueryData(['pedidos']);
      const optimistic = { ...newData, id: `temp-${Date.now()}` };
      queryClient.setQueryData(['pedidos'], old => [...(old || []), optimistic].sort((a, b) => (a.dia || '').localeCompare(b.dia || '')));
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      resetForm();
      toast.success('Pedido creado');
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['pedidos'], ctx.previous);
      toast.error('Error al crear pedido: ' + (error.message || 'Error desconocido'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pedido.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['pedidos'] });
      const previous = queryClient.getQueryData(['pedidos']);
      queryClient.setQueryData(['pedidos'], old =>
        (old || []).map(p => p.id === id ? { ...p, ...data } : p)
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      resetForm();
      setEditingSalida({ pedidoId: null, turnoIndex: null, camareroIndex: null });
      toast.success('Pedido actualizado');
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['pedidos'], ctx.previous);
      toast.error('Error al actualizar pedido: ' + (error.message || 'Error desconocido'));
    }
  });

  const handleSalidaChange = (pedido, turnoIndex, camareroIndex, nuevaSalida) => {
    const turnosActualizados = [...(pedido.turnos || [])];
    if (turnosActualizados[turnoIndex]) {
      turnosActualizados[turnoIndex] = {
        ...turnosActualizados[turnoIndex],
        salida: nuevaSalida
      };
      
      // Calcular horas
      const entrada = turnosActualizados[turnoIndex].entrada;
      if (entrada && nuevaSalida) {
        const [hE, mE] = entrada.split(':').map(Number);
        const [hS, mS] = nuevaSalida.split(':').map(Number);
        let horas = hS - hE;
        let minutos = mS - mE;
        if (minutos < 0) {
          horas -= 1;
          minutos += 60;
        }
        if (horas < 0) horas += 24;
        turnosActualizados[turnoIndex].t_horas = horas + minutos / 60;
      }
      
      updateMutation.mutate({
        id: pedido.id,
        data: { turnos: turnosActualizados }
      });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pedido.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['pedidos'] });
      const previous = queryClient.getQueryData(['pedidos']);
      queryClient.setQueryData(['pedidos'], old => (old || []).filter(p => p.id !== id));
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Pedido eliminado');
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['pedidos'], ctx.previous);
      toast.error('Error al eliminar pedido');
    }
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingPedido(null);
    setFormData({
      codigo_pedido: '',
      numero_cliente: 0,
      numero_pedido_cliente: 0,
      cliente_id: '',
      cliente: '',
      cliente_email_1: '',
      cliente_email_2: '',
      cliente_telefono_1: '',
      cliente_telefono_2: '',
      cliente_persona_contacto_1: '',
      cliente_persona_contacto_2: '',
      lugar_evento: '',
      link_ubicacion: '',
      dia: '',
      turnos: [],
      camisa: 'blanca',
      extra_transporte: false,
      notas: ''
    });
  };

  const handleEdit = (pedido) => {
    setEditingPedido(pedido);
    setFormData({
      codigo_pedido: pedido.codigo_pedido || '',
      numero_cliente: pedido.numero_cliente || 0,
      numero_pedido_cliente: pedido.numero_pedido_cliente || 0,
      cliente_id: pedido.cliente_id || '',
      cliente: pedido.cliente || '',
      cliente_email_1: pedido.cliente_email_1 || '',
      cliente_email_2: pedido.cliente_email_2 || '',
      cliente_telefono_1: pedido.cliente_telefono_1 || '',
      cliente_telefono_2: pedido.cliente_telefono_2 || '',
      cliente_persona_contacto_1: pedido.cliente_persona_contacto_1 || '',
      cliente_persona_contacto_2: pedido.cliente_persona_contacto_2 || '',
      lugar_evento: pedido.lugar_evento || '',
      link_ubicacion: pedido.link_ubicacion || '',
      dia: pedido.dia ? pedido.dia.split('T')[0] : '',
      turnos: pedido.turnos || [],
      camisa: pedido.camisa || 'blanca',
      extra_transporte: pedido.extra_transporte || false,
      notas: pedido.notas || ''
    });
    setShowForm(true);
  };

  const handleSubmit = (dataFromForm) => {
    if (editingPedido) {
      updateMutation.mutate({ id: editingPedido.id, data: dataFromForm });
    } else {
      createMutation.mutate(dataFromForm);
    }
  };



  const exportarExcel = () => {
    const headers = ['Código', 'Cliente', 'Lugar Evento', 'Fecha', 'Camareros', 'Entrada', 'Salida', 'Horas', 'Camisa', 'Transporte Extra', 'Estado', 'Notas'];
    const rows = pedidos.map(p => {
      const turno = (p.turnos && p.turnos[0]) || {};
      return [
        p.codigo_pedido || '',
        p.cliente || '',
        p.lugar_evento || '',
        p.dia || '',
        p.cantidad_camareros || turno.cantidad_camareros || '',
        p.entrada || turno.entrada || '',
        p.salida || turno.salida || '',
        p.t_horas || turno.t_horas || '',
        p.camisa || '',
        p.extra_transporte ? 'Sí' : 'No',
        p.estado_evento || 'planificado',
        p.notas || ''
      ];
    });
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportado correctamente');
  };

  const importarExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('El archivo está vacío o no tiene datos'); return; }
      const rows = lines.slice(1);
      let creados = 0;
      const maxCodigo = pedidos.reduce((max, p) => {
        if (p.codigo_pedido && p.codigo_pedido.startsWith('P')) {
          const num = parseInt(p.codigo_pedido.substring(1));
          return Math.max(max, isNaN(num) ? 0 : num);
        }
        return max;
      }, 0);
      let counter = maxCodigo + 1;
      for (const row of rows) {
        const cols = row.split(',').map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
        const cliente = cols[1];
        if (!cliente) continue;
        const entrada = cols[5] || '';
        const salida = cols[6] || '';
        let t_horas = parseFloat(cols[7]) || 0;
        if (!t_horas && entrada && salida) {
          const [hE, mE] = entrada.split(':').map(Number);
          const [hS, mS] = salida.split(':').map(Number);
          let h = hS - hE, m = mS - mE;
          if (m < 0) { h--; m += 60; }
          if (h < 0) h += 24;
          t_horas = h + m / 60;
        }
        await base44.entities.Pedido.create({
          codigo_pedido: cols[0] && cols[0].startsWith('P') ? cols[0] : `P${String(counter++).padStart(3, '0')}`,
          cliente,
          lugar_evento: cols[2] || '',
          dia: cols[3] || '',
          cantidad_camareros: parseInt(cols[4]) || 1,
          entrada,
          salida,
          t_horas,
          turnos: entrada ? [{ cantidad_camareros: parseInt(cols[4]) || 1, entrada, salida, t_horas }] : [],
          camisa: cols[8] || 'blanca',
          extra_transporte: cols[9] === 'Sí',
          estado_evento: cols[10] || 'planificado',
          notas: cols[11] || ''
        });
        creados++;
      }
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success(`${creados} pedidos importados correctamente`);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleAIExtraction = (extractedData) => {
    // Calcular t_horas si hay entrada y salida
    let t_horas = 0;
    if (extractedData.entrada && extractedData.salida) {
      const [hE, mE] = extractedData.entrada.split(':').map(Number);
      const [hS, mS] = extractedData.salida.split(':').map(Number);
      let horas = hS - hE;
      let minutos = mS - mE;
      if (minutos < 0) { horas -= 1; minutos += 60; }
      if (horas < 0) horas += 24;
      t_horas = horas + minutos / 60;
    }

    // Transformar estructura plana del extractor a estructura de turnos[]
    // que espera PedidoFormNuevo
    const turnoExtraido = {
      cantidad_camareros: extractedData.cantidad_camareros || 1,
      entrada: extractedData.entrada || '',
      salida: extractedData.salida || '',
      t_horas
    };

    setFormData({
      cliente: extractedData.cliente || '',
      lugar_evento: extractedData.lugar_evento || '',
      direccion_completa: extractedData.direccion_completa || '',
      dia: extractedData.dia || '',
      turnos: [turnoExtraido],
      camisa: extractedData.camisa || '',
      extra_transporte: extractedData.extra_transporte || false,
      notas: extractedData.notas || ''
    });
    setShowForm(true);
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    await queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-[#1e3a5f]" />
              Pedidos
            </h1>
            <p className="text-slate-500 mt-1">Gestiona los pedidos de clientes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportarExcel} className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <label>
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 cursor-pointer" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                  <input type="file" accept=".csv" className="hidden" onChange={importarExcel} />
                </span>
              </Button>
            </label>
            <Button 
              onClick={() => setShowEntradaAuto(true)}
              variant="outline"
              className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Entrada Automatizada
            </Button>
            <Button 
              onClick={() => setShowAIExtractor(true)}
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Crear con IA
            </Button>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Pedido
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Pedidos</p>
            <p className="text-2xl font-bold text-slate-800">{pedidos.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Clientes Únicos</p>
            <p className="text-2xl font-bold text-purple-600">
              {new Set(pedidos.map(p => p.cliente).filter(Boolean)).size}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Camareros Necesarios</p>
            <p className="text-2xl font-bold text-[#1e3a5f]">
              {pedidos.reduce((acc, p) => acc + (p.cantidad_camareros || 0), 0)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Hoy</p>
            <p className="text-2xl font-bold text-emerald-600">
              {pedidos.filter(p => p.dia === format(new Date(), 'yyyy-MM-dd')).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Esta Semana</p>
            <p className="text-2xl font-bold text-blue-600">
              {pedidos.filter(p => {
                const fecha = parseISO(p.dia);
                const hoy = new Date();
                const diff = (fecha - hoy) / (1000 * 60 * 60 * 24);
                return diff >= 0 && diff <= 7;
              }).length}
            </p>
          </Card>
        </div>

        {/* Lista/Tabla de Pedidos */}
        {isMobile ? (
          <div className="space-y-3">
            {pedidos.length === 0 && (
              <p className="text-center text-slate-400 py-8">No hay pedidos registrados</p>
            )}
            {pedidos.map(pedido => (
              <PedidoCardMobile
                key={pedido.id}
                pedido={pedido}
                asignaciones={asignaciones}
                onEdicionRapida={(p, campo) => setEdicionRapida({ open: true, pedido: p, campo })}
                onDuplicar={(p) => setDuplicarDialog({ open: true, pedido: p })}
                onRecurrente={(p) => setRecurrenteDialog({ open: true, pedido: p })}
                onEdit={handleEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
                onParte={(p) => setParteDialog({ open: true, pedido: p })}
              />
            ))}
          </div>
        ) : (
        <><Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Nº</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="font-semibold">Lugar</TableHead>
                  <TableHead className="font-semibold text-center">Nº</TableHead>
                  <TableHead className="font-semibold">Camarero</TableHead>
                  <TableHead className="font-semibold">Día</TableHead>
                  <TableHead className="font-semibold">Entrada</TableHead>
                  <TableHead className="font-semibold">Salida</TableHead>
                  <TableHead className="font-semibold text-center">Horas</TableHead>
                  <TableHead className="font-semibold">Camisa</TableHead>
                  <TableHead className="font-semibold text-center">Transporte</TableHead>
                  <TableHead className="font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {pedidos.flatMap((pedido) => {
                    const turnos = pedido.turnos && pedido.turnos.length > 0 
                      ? pedido.turnos 
                      : [{ cantidad_camareros: pedido.cantidad_camareros || 0, entrada: pedido.entrada || '-', salida: pedido.salida || '-', t_horas: pedido.t_horas || 0 }];
                    
                    return turnos.flatMap((turno, turnoIndex) => {
                      const cantidadCamareros = turno.cantidad_camareros || 0;
                      const filasCamareros = Math.max(1, cantidadCamareros);
                      
                      return Array.from({ length: filasCamareros }, (_, camareroIndex) => {
                        const esPrimeraFila = turnoIndex === 0 && camareroIndex === 0;
                        const totalFilas = turnos.reduce((sum, t) => sum + Math.max(1, t.cantidad_camareros || 0), 0);
                        
                        // Calcular el número de camarero acumulado
                        let numeroCamarero = camareroIndex + 1;
                        for (let i = 0; i < turnoIndex; i++) {
                          numeroCamarero += Math.max(1, turnos[i].cantidad_camareros || 0);
                        }
                        
                        // Buscar asignación para este pedido
                        // Primero buscar con turno_index y posicion_slot exactos
                        let asignacion = asignaciones.find(a => 
                          a.pedido_id === pedido.id && 
                          a.turno_index === turnoIndex &&
                          a.posicion_slot === camareroIndex
                        );
                        
                        // Si no se encuentra, buscar cualquier asignación para este pedido y slot
                        if (!asignacion) {
                          const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
                          if (asignacionesPedido[numeroCamarero - 1]) {
                            asignacion = asignacionesPedido[numeroCamarero - 1];
                          }
                        }
                        
                        return (
                          <motion.tr
                            key={`${pedido.id}-${turnoIndex}-${camareroIndex}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="border-b hover:bg-slate-50/50"
                          >
                            {esPrimeraFila ? (
                              <>
                                <TableCell className="font-mono text-sm font-semibold text-[#1e3a5f]" rowSpan={totalFilas}>
                                  {pedido.codigo_pedido || '-'}
                                </TableCell>
                                <TableCell rowSpan={totalFilas}>
                                  <Badge
                                    className={`cursor-pointer ${
                                      pedido.estado_evento === 'cancelado' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                                      pedido.estado_evento === 'finalizado' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' :
                                      pedido.estado_evento === 'en_curso' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                                      'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    }`}
                                    onClick={() => setEdicionRapida({ open: true, pedido, campo: 'estado' })}
                                  >
                                    {pedido.estado_evento === 'cancelado' && <Ban className="w-3 h-3 mr-1" />}
                                    {pedido.estado_evento === 'cancelado' ? 'Cancelado' :
                                     pedido.estado_evento === 'finalizado' ? 'Finalizado' :
                                     pedido.estado_evento === 'en_curso' ? 'En Curso' : 'Planificado'}
                                  </Badge>
                                </TableCell>
                                <TableCell 
                                  className="font-medium cursor-pointer hover:text-[#1e3a5f] hover:underline"
                                  onClick={() => setEdicionRapida({ open: true, pedido, campo: 'cliente' })}
                                  rowSpan={totalFilas}
                                >
                                  {pedido.cliente}
                                </TableCell>
                                <TableCell 
                                  className="text-slate-600 cursor-pointer hover:text-[#1e3a5f] hover:underline"
                                  onClick={() => setEdicionRapida({ open: true, pedido, campo: 'lugar' })}
                                  rowSpan={totalFilas}
                                >
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {pedido.lugar_evento || 'Añadir lugar'}
                                  </div>
                                </TableCell>
                              </>
                            ) : null}
                            <TableCell className="text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] font-semibold">
                                {numeroCamarero}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {asignacion ? (
                                <span className="text-slate-700">{asignacion.camarero_nombre}</span>
                              ) : (
                                <span className="text-slate-400 italic">Sin asignar</span>
                              )}
                            </TableCell>
                            {esPrimeraFila ? (
                              <TableCell
                                className="cursor-pointer hover:text-[#1e3a5f] hover:underline"
                                onClick={() => setEdicionRapida({ open: true, pedido, campo: 'fecha' })}
                                rowSpan={totalFilas}
                              >
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {pedido.dia ? format(parseISO(pedido.dia), 'dd MMM yyyy', { locale: es }) : '-'}
                                </div>
                              </TableCell>
                            ) : null}
                            <TableCell className="font-mono text-sm">
                              {turno.entrada || '-'}
                            </TableCell>
                            <TableCell 
                              className="font-mono text-sm cursor-pointer hover:bg-blue-50 transition-colors"
                              onClick={() => setEditingSalida({ pedidoId: pedido.id, turnoIndex, camareroIndex })}
                            >
                              {editingSalida.pedidoId === pedido.id && 
                               editingSalida.turnoIndex === turnoIndex && 
                               editingSalida.camareroIndex === camareroIndex ? (
                                <Input
                                  type="time"
                                  defaultValue={turno.salida || ''}
                                  autoFocus
                                  className="h-8 w-24 text-xs"
                                  onBlur={(e) => {
                                    handleSalidaChange(pedido, turnoIndex, camareroIndex, e.target.value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSalidaChange(pedido, turnoIndex, camareroIndex, e.target.value);
                                    }
                                  }}
                                />
                              ) : (
                                <span className="hover:text-blue-600">
                                  {turno.salida || '-'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="px-2 py-1 rounded-full bg-slate-100 text-sm font-medium">
                                {turno.t_horas ? turno.t_horas.toFixed(1) : 0}h
                              </span>
                            </TableCell>
                            {esPrimeraFila ? (
                              <>
                                <TableCell rowSpan={totalFilas}>{pedido.camisa || '-'}</TableCell>
                                <TableCell className="text-center" rowSpan={totalFilas}>
                                  {pedido.extra_transporte ? (
                                    <span className="text-emerald-600">✓</span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right" rowSpan={totalFilas}>
                                  <div className="flex justify-end gap-1">
                                    <SugerenciasInteligentes
                                      pedido={pedido}
                                      onAsignar={(_camarero) => {
                                        // Navigate to Asignacion page with pedido selected
                                        globalThis.location.href = `/Asignacion?pedido_id=${pedido.id}`;
                                      }}
                                    />
                                    <Button
                                       variant="ghost"
                                       size="icon"
                                       onClick={() => setParteDialog({ open: true, pedido })}
                                       className="h-8 w-8"
                                       title="Parte de servicio"
                                     >
                                       <FileText className="w-4 h-4" />
                                     </Button>
                                    <GenerarDocumentacion pedido={pedido} variant="ghost" size="icon" />
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => setDuplicarDialog({ open: true, pedido })}
                                      className="h-8 w-8"
                                      title="Duplicar evento"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => setRecurrenteDialog({ open: true, pedido })}
                                      className="h-8 w-8"
                                      title="Crear eventos recurrentes"
                                    >
                                      <Repeat className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleEdit(pedido)}
                                      className="h-8 w-8"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Se eliminará el pedido de <strong>{pedido.cliente}</strong> del {pedido.dia}. Esta acción no se puede deshacer y eliminará todas las asignaciones asociadas.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteMutation.mutate(pedido.id)}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Eliminar
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </>
                            ) : null}
                          </motion.tr>
                        );
                      });
                    });
                  })}
                </AnimatePresence>
                {pedidos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="h-32 text-center text-slate-500">
                      No hay pedidos registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card></> 
        )}

        {/* Modal Form */}
        <AnimatePresence>
          {showForm && (
            <PedidoFormNuevo
              pedido={editingPedido}
              onSubmit={handleSubmit}
              onCancel={resetForm}
            />
          )}
        </AnimatePresence>

        {/* Entrada Automatizada */}
        <Dialog open={showEntradaAuto} onOpenChange={setShowEntradaAuto}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Entrada Automatizada de Pedidos</DialogTitle>
            </DialogHeader>
            <EntradaAutomatica />
          </DialogContent>
        </Dialog>

        {/* AI Extractor Modal */}
        <AIExtractor 
          open={showAIExtractor}
          onClose={() => setShowAIExtractor(false)}
          onPedidoExtraido={handleAIExtraction}
        />

        {/* Edición Rápida */}
        <EdicionRapida
          pedido={edicionRapida.pedido}
          open={edicionRapida.open}
          onOpenChange={(open) => setEdicionRapida({ ...edicionRapida, open })}
          campo={edicionRapida.campo}
        />

        {/* Duplicar Evento */}
        <DuplicarEvento
          open={duplicarDialog.open}
          onOpenChange={(open) => setDuplicarDialog({ ...duplicarDialog, open })}
          pedidoOriginal={duplicarDialog.pedido}
        />

        {/* Parte de Servicio */}
        <ParteServicio
          pedido={parteDialog.pedido}
          open={parteDialog.open}
          onOpenChange={(open) => setParteDialog({ ...parteDialog, open })}
        />

        {/* Evento Recurrente */}
        <EventoRecurrente
          open={recurrenteDialog.open}
          onOpenChange={(open) => setRecurrenteDialog({ ...recurrenteDialog, open })}
          pedidoBase={recurrenteDialog.pedido}
        />
        </div>
      </div>
    </PullToRefresh>
  );
}