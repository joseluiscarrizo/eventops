import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send, Users, Calendar, MapPin, Clock, CheckCheck, MessageCircle, Loader2, Phone, Upload, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const estadoBadge = {
  pendiente: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600' },
  enviado: { label: 'Enviado', className: 'bg-orange-100 text-orange-700' },
  confirmado: { label: 'Confirmado', className: 'bg-emerald-100 text-emerald-700' },
  alta: { label: 'Alta', className: 'bg-blue-100 text-blue-700' },
};

function getEventoStatus(asignacionesPedido, _cantidadSlots) {
  if (!asignacionesPedido.length) return 'sin_asignar';
  if (asignacionesPedido.every(a => a.estado === 'confirmado' || a.estado === 'alta')) return 'completo';
  if (asignacionesPedido.some(a => a.estado === 'enviado')) return 'enviado';
  return 'pendiente';
}

export default function WhatsAppEventos({ pedidos = [], asignaciones = [], camareros = [] }) {
  const [busqueda, setBusqueda] = useState('');
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [selectedCamareros, setSelectedCamareros] = useState([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  const [coordinadorId, setCoordinadorId] = useState(null);
  const [archivoAdjunto, setArchivoAdjunto] = useState(null);
  const [archivoUrl, setArchivoUrl] = useState(null);
  const queryClient = useQueryClient();

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores'],
    queryFn: () => base44.entities.Coordinador.list('nombre')
  });

  const { data: plantillas = [] } = useQuery({
    queryKey: ['plantillas-whatsapp'],
    queryFn: () => base44.entities.PlantillaWhatsApp.filter({ activa: true }, 'nombre')
  });

  // Auto-seleccionar plantilla predeterminada
  useEffect(() => {
    if (plantillas.length > 0 && !plantillaSeleccionada) {
      const pred = plantillas.find(p => p.es_predeterminada);
      if (pred) setPlantillaSeleccionada(pred.id);
    }
  }, [plantillas]);

  // Eventos filtrados y ordenados
  const eventosFiltrados = useMemo(() => {
    return pedidos
      .filter(p => p.dia && (
        !busqueda ||
        p.cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.lugar_evento?.toLowerCase().includes(busqueda.toLowerCase())
      ))
      .sort((a, b) => a.dia.localeCompare(b.dia));
  }, [pedidos, busqueda]);

  // Asignaciones del evento seleccionado
  const asignacionesEvento = useMemo(() => {
    if (!eventoSeleccionado) return [];
    return asignaciones.filter(a => a.pedido_id === eventoSeleccionado.id);
  }, [eventoSeleccionado, asignaciones]);

  // Camareros del evento con su asignación
  const camarerosEvento = useMemo(() => {
    return asignacionesEvento.map(asig => ({
      asignacion: asig,
      camarero: camareros.find(c => c.id === asig.camarero_id)
    })).filter(item => item.camarero);
  }, [asignacionesEvento, camareros]);

  const seleccionarEvento = (pedido) => {
    setEventoSeleccionado(pedido);
    setSelectedCamareros([]);
  };

  const toggleCamarero = (camareroId) => {
    setSelectedCamareros(prev =>
      prev.includes(camareroId) ? prev.filter(id => id !== camareroId) : [...prev, camareroId]
    );
  };

  const seleccionarTodos = () => {
    setSelectedCamareros(camarerosEvento.map(c => c.camarero.id));
  };

  const deseleccionarTodos = () => setSelectedCamareros([]);

  const generarMensaje = (asignacion, camarero) => {
    const pedido = eventoSeleccionado;
    const baseUrl = globalThis.location.origin;
    const _linkConfirmar = `${baseUrl}/#/ConfirmarServicio?asignacion=${asignacion.id}`;
    const _linkRechazar = `${baseUrl}/#/ConfirmarServicio?asignacion=${asignacion.id}&action=rechazar`;

    const reemplazar = (contenido) => contenido
      .replace(/\{\{cliente\}\}/g, pedido.cliente || '')
      .replace(/\{\{dia\}\}/g, pedido.dia ? format(new Date(pedido.dia), "dd 'de' MMMM yyyy", { locale: es }) : '')
      .replace(/\{\{lugar_evento\}\}/g, pedido.lugar_evento || '')
      .replace(/\{\{hora_entrada\}\}/g, asignacion.hora_entrada || pedido.entrada || '-')
      .replace(/\{\{hora_salida\}\}/g, asignacion.hora_salida || pedido.salida || '-')
      .replace(/\{\{camisa\}\}/g, pedido.camisa || 'blanca')
      .replace(/\{\{link_confirmar\}\}/g, '') // Se envía como botón, no como texto
      .replace(/\{\{link_rechazar\}\}/g, '')  // Se envía como botón, no como texto
      .replace(/\{\{link_ubicacion\}\}/g, pedido.link_ubicacion || '')
      .replace(/\{\{camarero_nombre\}\}/g, camarero?.nombre || '')
      .trim();

    if (plantillaSeleccionada) {
      const plantilla = plantillas.find(p => p.id === plantillaSeleccionada);
      if (plantilla) return reemplazar(plantilla.contenido);
    }
    if (mensajePersonalizado.trim()) return reemplazar(mensajePersonalizado);

    // Mensaje por defecto (sin links visibles, los botones se envían aparte)
    let msg = `📅 *Día:* ${pedido.dia ? format(new Date(pedido.dia), "dd 'de' MMMM yyyy", { locale: es }) : ''}\n`;
    msg += `👤 *Cliente:* ${pedido.cliente}\n`;
    msg += `📍 *Lugar del Evento:* ${pedido.lugar_evento || 'Por confirmar'}\n`;
    msg += `🕐 *Hora de entrada:* ${asignacion.hora_entrada || pedido.entrada || '-'}\n\n`;
    if (pedido.link_ubicacion) msg += `🗺️ *Ubicación:* ${pedido.link_ubicacion}\n\n`;
    msg += `👔 *Uniforme:* Zapatos, pantalón y delantal. Todo de color negro\n`;
    msg += `👕 *Camisa:* ${pedido.camisa || 'blanca'}\n`;
    msg += `✨ *Uniforme Impoluto.*\n\n`;
    msg += `⏰ *Presentarse 15 minutos antes.*\n\n`;
    msg += `Por favor, confirma tu asistencia:`;
    return msg;
  };

  const enviarMutation = useMutation({
    mutationFn: async () => {
      if (!coordinadorId) throw new Error('Selecciona un coordinador');
      const coordinador = coordinadores.find(c => c.id === coordinadorId);
      if (!coordinador?.telefono) throw new Error('El coordinador no tiene teléfono configurado');

      let urlArchivo = archivoUrl;
      if (archivoAdjunto && !urlArchivo) {
        const resultado = await base44.integrations.Core.UploadFile({ file: archivoAdjunto });
        urlArchivo = resultado.file_url;
        setArchivoUrl(urlArchivo);
      }

      const seleccionados = camarerosEvento.filter(({ camarero }) => selectedCamareros.includes(camarero.id));
      let enviados = 0;

      for (const { camarero, asignacion } of seleccionados) {
        if (!camarero.telefono) continue;
        let mensaje = await generarMensaje(asignacion, camarero);
        if (urlArchivo) mensaje += `\n\n📎 *Archivo adjunto:*\n${urlArchivo}`;

        const baseUrl = globalThis.location.origin;
        const linkConfirmar = `${baseUrl}/#/ConfirmarServicio?asignacion=${asignacion.id}`;
        const linkRechazar = `${baseUrl}/#/ConfirmarServicio?asignacion=${asignacion.id}&action=rechazar`;
        const response = await base44.functions.invoke('enviarWhatsAppDirecto', {
          telefono: camarero.telefono,
          mensaje,
          camarero_id: camarero.id,
          camarero_nombre: camarero.nombre,
          pedido_id: eventoSeleccionado.id,
          asignacion_id: asignacion.id,
          link_confirmar: linkConfirmar,
          link_rechazar: linkRechazar,
          plantilla_usada: plantillaSeleccionada ? plantillas.find(p => p.id === plantillaSeleccionada)?.nombre : 'Manual'
        });

        const resultado = response.data || response;
        if (!resultado.enviado_por_api) {
          throw new Error(`No se pudo enviar a ${camarero.nombre}: ${resultado.error_api || 'API no configurada'}`);
        }

        await base44.entities.AsignacionCamarero.update(asignacion.id, { estado: 'enviado' });
        await base44.entities.NotificacionCamarero.create({
          camarero_id: camarero.id,
          camarero_nombre: camarero.nombre,
          asignacion_id: asignacion.id,
          pedido_id: eventoSeleccionado.id,
          tipo: 'nueva_asignacion',
          titulo: `Nueva Asignación: ${eventoSeleccionado.cliente}`,
          mensaje,
          cliente: eventoSeleccionado.cliente,
          lugar_evento: eventoSeleccionado.lugar_evento,
          fecha: eventoSeleccionado.dia,
          hora_entrada: asignacion.hora_entrada,
          hora_salida: asignacion.hora_salida,
          leida: false, respondida: false, respuesta: 'pendiente'
        });

        enviados++;
        await new Promise(r => setTimeout(r, 600));
      }
      return enviados;
    },
    onSuccess: (enviados) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success(`✅ ${enviados} mensaje${enviados !== 1 ? 's' : ''} enviado${enviados !== 1 ? 's' : ''}`);
      setSelectedCamareros([]);
    },
    onError: (e) => toast.error(e.message || 'Error al enviar mensajes')
  });

  return (
    <div className="flex h-[calc(100vh-130px)] bg-[#f0f2f5] rounded-2xl overflow-hidden shadow-xl border border-slate-200">
      
      {/* Columna izquierda - Lista de Eventos */}
      <div className="w-[340px] min-w-[280px] bg-white border-r border-slate-200 flex flex-col">
        {/* Header WhatsApp style */}
        <div className="bg-[#1e3a5f] px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Eventos</h2>
            <p className="text-white/60 text-xs">{eventosFiltrados.length} eventos</p>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="px-3 py-2 bg-white border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar evento..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-9 h-8 text-sm bg-slate-50 border-slate-200 rounded-full"
            />
          </div>
        </div>

        {/* Lista de eventos */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-slate-100">
            {eventosFiltrados.map(pedido => {
              const asigs = asignaciones.filter(a => a.pedido_id === pedido.id);
              const status = getEventoStatus(asigs, pedido.cantidad_camareros);
              const isSelected = eventoSeleccionado?.id === pedido.id;
              const pendientes = asigs.filter(a => a.estado === 'pendiente').length;
              const confirmados = asigs.filter(a => a.estado === 'confirmado' || a.estado === 'alta').length;

              return (
                <button
                  key={pedido.id}
                  onClick={() => seleccionarEvento(pedido)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                    isSelected ? 'bg-[#1e3a5f]/5 border-r-2 border-[#1e3a5f]' : ''
                  }`}
                >
                  {/* Avatar del evento */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    status === 'completo' ? 'bg-emerald-100' :
                    status === 'enviado' ? 'bg-orange-100' :
                    status === 'pendiente' ? 'bg-red-100' : 'bg-slate-100'
                  }`}>
                    <Users className={`w-5 h-5 ${
                      status === 'completo' ? 'text-emerald-600' :
                      status === 'enviado' ? 'text-orange-600' :
                      status === 'pendiente' ? 'text-red-600' : 'text-slate-400'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-semibold text-slate-800 text-sm truncate">{pedido.cliente}</p>
                      <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                        {pedido.dia ? format(new Date(pedido.dia), 'dd MMM', { locale: es }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{pedido.lugar_evento || 'Sin ubicación'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-slate-400">
                        {asigs.length}/{pedido.cantidad_camareros || 0} camareros
                      </span>
                      {pendientes > 0 && (
                        <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                          {pendientes}
                        </span>
                      )}
                      {confirmados > 0 && asigs.length > 0 && pendientes === 0 && (
                        <CheckCheck className="w-3 h-3 text-emerald-500" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {eventosFiltrados.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay eventos</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Columna derecha - Detalle del evento */}
      {eventoSeleccionado ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header del evento */}
          <div className="bg-[#1e3a5f] px-5 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm truncate">{eventoSeleccionado.cliente}</h3>
              <div className="flex items-center gap-3 text-white/60 text-xs">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {eventoSeleccionado.dia ? format(new Date(eventoSeleccionado.dia), "dd 'de' MMMM yyyy", { locale: es }) : ''}
                </span>
                {eventoSeleccionado.entrada && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {eventoSeleccionado.entrada} - {eventoSeleccionado.salida}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {eventoSeleccionado.lugar_evento && (
                <span className="text-white/70 text-xs flex items-center gap-1 hidden lg:flex">
                  <MapPin className="w-3 h-3" />
                  {eventoSeleccionado.lugar_evento}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Lista de participantes */}
            <div className="w-[260px] min-w-[220px] border-r border-slate-200 bg-white flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Participantes</h4>
                  <p className="text-xs text-slate-500">{selectedCamareros.length} seleccionados</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={seleccionarTodos} className="text-xs text-[#1e3a5f] hover:underline">Todos</button>
                  <span className="text-slate-300">·</span>
                  <button onClick={deseleccionarTodos} className="text-xs text-slate-400 hover:underline">Ninguno</button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {camarerosEvento.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Sin camareros asignados</p>
                    </div>
                  ) : (
                    camarerosEvento.map(({ camarero, asignacion }) => {
                      const isChecked = selectedCamareros.includes(camarero.id);
                      const badge = estadoBadge[asignacion.estado] || estadoBadge.pendiente;
                      return (
                        <label
                          key={camarero.id}
                          className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                            isChecked ? 'bg-[#1e3a5f]/8 border border-[#1e3a5f]/20' : 'hover:bg-slate-50'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleCamarero(camarero.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm truncate">{camarero.nombre}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {camarero.telefono ? (
                                <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                                  <Phone className="w-3 h-3" />{camarero.telefono}
                                </span>
                              ) : (
                                <span className="text-[11px] text-red-400">Sin teléfono</span>
                              )}
                            </div>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${badge.className}`}>
                            {badge.label}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Panel de mensaje */}
            <div className="flex-1 flex flex-col bg-[#efeae2] min-w-0">
              {/* Área de configuración */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-2xl mx-auto">
                  {/* Coordinador */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Enviar desde</p>
                    <Select value={coordinadorId || ''} onValueChange={setCoordinadorId}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Seleccionar coordinador..." />
                      </SelectTrigger>
                      <SelectContent>
                        {coordinadores.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombre} {c.telefono ? `(${c.telefono})` : '(sin teléfono)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Plantilla */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Plantilla</p>
                    <Select value={plantillaSeleccionada || 'default'} onValueChange={v => setPlantillaSeleccionada(v === 'default' ? null : v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Mensaje por defecto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">📝 Mensaje por defecto</SelectItem>
                        {plantillas.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.es_predeterminada ? '⭐ ' : ''}{p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Mensaje personalizado si no hay plantilla */}
                    {!plantillaSeleccionada && (
                      <div className="mt-3">
                        <p className="text-xs text-slate-500 mb-1">O escribe un mensaje personalizado:</p>
                        <Textarea
                          placeholder="Escribe tu mensaje aquí... (usa {{cliente}}, {{dia}}, {{hora_entrada}}, etc.)"
                          value={mensajePersonalizado}
                          onChange={e => setMensajePersonalizado(e.target.value)}
                          className="text-sm resize-none h-28"
                        />
                      </div>
                    )}
                  </div>

                  {/* Archivo adjunto */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Adjunto (opcional)</p>
                    {archivoAdjunto ? (
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <FileText className="w-4 h-4 text-[#1e3a5f]" />
                        <span className="text-sm text-slate-700 flex-1 truncate">{archivoAdjunto.name}</span>
                        <button onClick={() => { setArchivoAdjunto(null); setArchivoUrl(null); }}>
                          <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1e3a5f] hover:text-[#152a45]">
                        <Upload className="w-4 h-4" />
                        <span>Adjuntar archivo</span>
                        <input type="file" className="hidden" onChange={e => {
                          const f = e.target.files?.[0];
                          if (f && f.size <= 5 * 1024 * 1024) { setArchivoAdjunto(f); setArchivoUrl(null); }
                          else if (f) toast.error('El archivo no puede superar 5MB');
                        }} />
                      </label>
                    )}
                  </div>

                  {/* Vista previa */}
                  {selectedCamareros.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Enviando a {selectedCamareros.length} camarero{selectedCamareros.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {camarerosEvento
                          .filter(({ camarero }) => selectedCamareros.includes(camarero.id))
                          .map(({ camarero }) => (
                            <span key={camarero.id} className="bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs px-2.5 py-1 rounded-full">
                              {camarero.nombre}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Barra de envío tipo WhatsApp */}
              <div className="px-4 py-3 bg-[#f0f2f5] border-t border-slate-200">
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                  <div className="flex-1 bg-white rounded-full px-4 py-2.5 flex items-center shadow-sm">
                    <MessageCircle className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <span className="text-sm text-slate-500 truncate">
                      {selectedCamareros.length === 0
                        ? 'Selecciona camareros para enviar'
                        : `Enviar a ${selectedCamareros.length} camarero${selectedCamareros.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <Button
                    onClick={() => enviarMutation.mutate()}
                    disabled={selectedCamareros.length === 0 || !coordinadorId || enviarMutation.isPending}
                    className="w-11 h-11 rounded-full bg-[#25D366] hover:bg-[#1da851] p-0 shrink-0 shadow-md"
                  >
                    {enviarMutation.isPending
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <Send className="w-5 h-5" />
                    }
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Estado vacío */
        <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-600 mb-2">Selecciona un evento</h3>
            <p className="text-slate-400 text-sm max-w-xs">
              Haz clic en un evento de la lista para ver sus participantes y enviar mensajes de WhatsApp
            </p>
          </div>
        </div>
      )}
    </div>
  );
}