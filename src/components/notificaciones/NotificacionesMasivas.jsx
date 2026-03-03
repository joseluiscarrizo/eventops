import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Loader2, Users, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificacionesMasivas() {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [prioridad, setPrioridad] = useState('normal');
  const [filtroGrupo, setFiltroGrupo] = useState('todos');
  const [camarerosSeleccionados, setCamarerosSeleccionados] = useState([]);
  const [enviarWhatsApp, setEnviarWhatsApp] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState('');

  const queryClient = useQueryClient();

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 1000)
  });

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores'],
    queryFn: () => base44.entities.Coordinador.list('nombre')
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const enviarMutation = useMutation({
    mutationFn: async () => {
      const camarerosEnviar = filtroGrupo === 'seleccionados' 
        ? camareros.filter(c => camarerosSeleccionados.includes(c.id))
        : camarerosFiltrados;

      if (camarerosEnviar.length === 0) {
        throw new Error('No hay camareros seleccionados');
      }

      const notificaciones = [];
      
      for (const camarero of camarerosEnviar) {
        // Crear notificación en la app
        const notif = await base44.entities.NotificacionCamarero.create({
          camarero_id: camarero.id,
          camarero_nombre: camarero.nombre,
          tipo: 'recordatorio',
          titulo,
          mensaje,
          leida: false,
          respondida: false,
          respuesta: 'pendiente',
          prioridad,
          es_masiva: true
        });

        notificaciones.push(notif);

        // Enviar por WhatsApp si está activado
        if (enviarWhatsApp && camarero.telefono) {
          const mensajeWhatsApp = `*${titulo}*\n\n${mensaje}\n\n${prioridad === 'urgente' ? '⚠️ URGENTE' : prioridad === 'importante' ? '⚡ IMPORTANTE' : ''}`;
          const telefonoCamarero = camarero.telefono.replace(/\D/g, '');
          const mensajeEncoded = encodeURIComponent(mensajeWhatsApp);
          const whatsappURL = `https://wa.me/${telefonoCamarero}?text=${mensajeEncoded}`;
          
          // Abrir WhatsApp en nueva pestaña
          globalThis.open(whatsappURL, '_blank');
          
          // Pequeña pausa entre mensajes
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return notificaciones;
    },
    onSuccess: (notificaciones) => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones-camarero'] });
      toast.success(`Notificaciones enviadas a ${notificaciones.length} camarero(s)`);
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || 'Error al enviar notificaciones');
    }
  });

  const resetForm = () => {
    setTitulo('');
    setMensaje('');
    setPrioridad('normal');
    setFiltroGrupo('todos');
    setCamarerosSeleccionados([]);
    setEnviarWhatsApp(false);
    setEventoSeleccionado('');
  };

  // Filtrar camareros según el grupo seleccionado
  const camarerosFiltrados = (() => {
    switch (filtroGrupo) {
      case 'todos':
        return camareros.filter(c => !c.en_reserva);
      
      case 'disponibles':
        return camareros.filter(c => c.disponible && c.estado_actual === 'disponible' && !c.en_reserva);
      
      case 'ocupados':
        return camareros.filter(c => c.estado_actual === 'ocupado');
      
      case 'eventos_futuros': {
        const hoy = new Date().toISOString().split('T')[0];
        const camarerosConEventosFuturos = new Set();
        asignaciones.forEach(a => {
          if (a.fecha_pedido >= hoy) {
            camarerosConEventosFuturos.add(a.camarero_id);
          }
        });
        return camareros.filter(c => camarerosConEventosFuturos.has(c.id));
      }
      
      case 'eventos_pasados': {
        const hoy = new Date().toISOString().split('T')[0];
        const camarerosConEventosPasados = new Set();
        asignaciones.forEach(a => {
          if (a.fecha_pedido < hoy) {
            camarerosConEventosPasados.add(a.camarero_id);
          }
        });
        return camareros.filter(c => camarerosConEventosPasados.has(c.id));
      }

      case 'por_evento': {
        if (!eventoSeleccionado) return [];
        const camarerosDelEvento = new Set();
        asignaciones.forEach(a => {
          if (a.pedido_id === eventoSeleccionado) {
            camarerosDelEvento.add(a.camarero_id);
          }
        });
        return camareros.filter(c => camarerosDelEvento.has(c.id));
      }
      
      case 'seleccionados':
        return camareros.filter(c => camarerosSeleccionados.includes(c.id));
      
      default:
        return camareros;
    }
  })();

  const toggleCamarero = (camareroId) => {
    setCamarerosSeleccionados(prev => 
      prev.includes(camareroId) 
        ? prev.filter(id => id !== camareroId)
        : [...prev, camareroId]
    );
  };

  const seleccionarTodos = () => {
    setCamarerosSeleccionados(camarerosFiltrados.map(c => c.id));
  };

  const prioridadConfig = {
    normal: { color: 'bg-slate-100 text-slate-700', icon: Info },
    importante: { color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
    urgente: { color: 'bg-red-100 text-red-700', icon: AlertTriangle }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#1e3a5f] hover:bg-[#152a45]">
          <MessageCircle className="w-4 h-4 mr-2" />
          Notificación Masiva
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1e3a5f]" />
            Enviar Notificación Masiva
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Título y Mensaje */}
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ej: Recordatorio importante"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Mensaje *</Label>
              <Textarea
                placeholder="Escribe tu mensaje aquí..."
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                className="h-32"
              />
            </div>

            {/* Prioridad */}
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={prioridad} onValueChange={setPrioridad}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-slate-500" />
                      Normal
                    </div>
                  </SelectItem>
                  <SelectItem value="importante">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      Importante
                    </div>
                  </SelectItem>
                  <SelectItem value="urgente">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Urgente
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Grupo de destinatarios */}
            <div className="space-y-2">
              <Label>Enviar a</Label>
              <Select value={filtroGrupo} onValueChange={(value) => {
                setFiltroGrupo(value);
                if (value !== 'por_evento') {
                  setEventoSeleccionado('');
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los camareros</SelectItem>
                  <SelectItem value="disponibles">Solo disponibles</SelectItem>
                  <SelectItem value="ocupados">Solo ocupados</SelectItem>
                  <SelectItem value="eventos_futuros">Con eventos futuros</SelectItem>
                  <SelectItem value="eventos_pasados">Con eventos pasados</SelectItem>
                  <SelectItem value="por_evento">Por evento específico</SelectItem>
                  <SelectItem value="seleccionados">Selección personalizada</SelectItem>
                </SelectContent>
              </Select>
              <Badge className={prioridadConfig[prioridad].color}>
                {camarerosFiltrados.length} camarero(s)
              </Badge>
            </div>

            {/* Selector de evento */}
            {filtroGrupo === 'por_evento' && (
              <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label>Seleccionar Evento</Label>
                <Select value={eventoSeleccionado} onValueChange={setEventoSeleccionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elige un evento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pedidos.map(pedido => {
                      const numCamareros = asignaciones.filter(a => a.pedido_id === pedido.id).length;
                      return (
                        <SelectItem key={pedido.id} value={pedido.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{pedido.cliente}</span>
                            <span className="text-xs text-slate-500">
                              {pedido.dia} • {pedido.lugar_evento || 'Sin ubicación'} • {numCamareros} camarero(s)
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {eventoSeleccionado && camarerosFiltrados.length > 0 && (
                  <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                    <p className="text-xs font-medium text-blue-700 mb-1">Camareros asignados:</p>
                    <div className="flex flex-wrap gap-1">
                      {camarerosFiltrados.map(c => (
                        <Badge key={c.id} variant="outline" className="text-xs">
                          {c.nombre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lista de camareros si es selección personalizada */}
            {filtroGrupo === 'seleccionados' && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <Label>Seleccionar camareros</Label>
                  <Button variant="outline" size="sm" onClick={seleccionarTodos}>
                    Seleccionar todos ({camarerosFiltrados.length})
                  </Button>
                </div>
                <ScrollArea className="h-48 border rounded-lg bg-white p-2">
                  <div className="space-y-2">
                    {camarerosFiltrados.map(camarero => (
                      <div key={camarero.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                        <Checkbox
                          checked={camarerosSeleccionados.includes(camarero.id)}
                          onCheckedChange={() => toggleCamarero(camarero.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{camarero.nombre}</p>
                          <p className="text-xs text-slate-500">{camarero.telefono || 'Sin teléfono'}</p>
                        </div>
                        {camarero.disponible && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-700">Disponible</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Opciones adicionales */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <Checkbox
                id="whatsapp"
                checked={enviarWhatsApp}
                onCheckedChange={setEnviarWhatsApp}
              />
              <Label htmlFor="whatsapp" className="cursor-pointer flex-1">
                Enviar también por WhatsApp
                <p className="text-xs text-slate-500 mt-1">
                  Se abrirá una ventana de WhatsApp por cada camarero
                </p>
              </Label>
            </div>

            {/* Vista previa */}
            <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border-2 border-dashed border-slate-200">
              <p className="text-xs text-slate-500 mb-2">Vista previa:</p>
              <div className={`p-3 rounded-lg ${prioridadConfig[prioridad].color}`}>
                <div className="flex items-start gap-2">
                  {React.createElement(prioridadConfig[prioridad].icon, { className: 'w-4 h-4 mt-0.5' })}
                  <div>
                    <p className="font-semibold text-sm">{titulo || 'Título de ejemplo'}</p>
                    <p className="text-sm mt-1">{mensaje || 'Mensaje de ejemplo'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => enviarMutation.mutate()}
            disabled={!titulo || !mensaje || enviarMutation.isPending || 
              (filtroGrupo === 'seleccionados' && camarerosSeleccionados.length === 0) ||
              (filtroGrupo === 'por_evento' && !eventoSeleccionado)}
            className="bg-[#1e3a5f] hover:bg-[#152a45]"
          >
            {enviarMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar a {filtroGrupo === 'seleccionados' ? camarerosSeleccionados.length : camarerosFiltrados.length} camarero(s)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}