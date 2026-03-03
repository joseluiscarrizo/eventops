import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Send, Sparkles, MessageSquare, Loader2, ChevronRight, Copy, Zap, Calendar, RefreshCw, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Utility: días hasta el evento ---
function diasHastaEvento(dia) {
  if (!dia) return null;
  return differenceInDays(parseISO(dia), new Date());
}

// --- Subcomponente: Sugerencia IA ---
function SugerenciaIA({ sugerencia, onAplicar, onDescartar }) {
  return (
    <div className="mx-3 mb-2 p-3 rounded-xl border border-violet-200 bg-violet-50 text-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-violet-500" />
        <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">{sugerencia.etiqueta}</span>
      </div>
      <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap mb-3">{sugerencia.texto}</p>
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs bg-violet-600 hover:bg-violet-700" onClick={() => onAplicar(sugerencia.texto)}>
          <Check className="w-3 h-3 mr-1" /> Usar
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500" onClick={onDescartar}>
          <X className="w-3 h-3 mr-1" /> Descartar
        </Button>
      </div>
    </div>
  );
}

// --- Subcomponente: Borrador automático evento próximo ---
function BorradorEventoProximo({ pedido, cliente, onAplicar }) {
  const [generando, setGenerando] = useState(false);
  const [borrador, setBorrador] = useState(null);
  const dias = diasHastaEvento(pedido?.dia);

  const generarBorrador = async () => {
    setGenerando(true);
    try {
      const fechaFormateada = pedido.dia ? format(parseISO(pedido.dia), "EEEE dd 'de' MMMM", { locale: es }) : '';
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres un coordinador de eventos profesional. Redacta un mensaje de confirmación/recordatorio para el cliente "${cliente.nombre}" sobre su evento próximo.
Datos del evento:
- Fecha: ${fechaFormateada} (en ${dias} días)
- Lugar: ${pedido.lugar_evento || 'por confirmar'}
- Hora de entrada: ${pedido.entrada || pedido.turnos?.[0]?.entrada || 'por confirmar'}
- Hora de salida: ${pedido.salida || pedido.turnos?.[0]?.salida || 'por confirmar'}
- Contacto: ${cliente.persona_contacto_1 || cliente.nombre}

El mensaje debe:
1. Confirmar los detalles del evento
2. Preguntar si hay cambios o necesidades adicionales
3. Ser cordial y profesional
4. Máximo 5 frases
5. En español, sin emojis excesivos (máximo 2)`,
        response_json_schema: {
          type: "object",
          properties: {
            mensaje: { type: "string" },
            tipo: { type: "string" }
          }
        }
      });
      setBorrador(res.mensaje || res);
    } catch {
      toast.error('Error generando borrador');
    } finally {
      setGenerando(false);
    }
  };

  if (!pedido) return null;

  return (
    <div className={`mx-3 mb-3 p-3 rounded-xl border ${dias <= 2 ? 'border-red-200 bg-red-50' : dias <= 7 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className={`w-3.5 h-3.5 ${dias <= 2 ? 'text-red-500' : dias <= 7 ? 'text-amber-500' : 'text-emerald-500'}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${dias <= 2 ? 'text-red-600' : dias <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {dias <= 0 ? '¡HOY!' : dias === 1 ? 'MAÑANA' : `EN ${dias} DÍAS`}
          </span>
          <span className="text-xs text-slate-500 ml-1">
            {pedido.dia ? format(parseISO(pedido.dia), "dd/MM", { locale: es }) : ''} · {pedido.lugar_evento || 'Lugar por confirmar'}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs px-2"
          onClick={generarBorrador}
          disabled={generando}
        >
          {generando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
          {borrador ? 'Regenerar' : 'Borrador IA'}
        </Button>
      </div>
      {borrador && (
        <>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap mb-2">{borrador}</p>
          <Button size="sm" className="h-7 text-xs bg-[#1e3a5f] hover:bg-[#152a45]" onClick={() => onAplicar(borrador)}>
            <Check className="w-3 h-3 mr-1" /> Usar este borrador
          </Button>
        </>
      )}
    </div>
  );
}

export default function ChatClientes({ user }) {
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [generandoIA, setGenerandoIA] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false);
  const [plantillaDialog, setPlantillaDialog] = useState(false);
  const historialRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.filter({ activo: true }, 'nombre')
  });

  const { data: plantillas = [] } = useQuery({
    queryKey: ['plantillas-whatsapp'],
    queryFn: () => base44.entities.PlantillaWhatsApp.filter({ activa: true }, 'nombre')
  });

  const { data: pedidosCliente = [] } = useQuery({
    queryKey: ['pedidos-cliente', clienteSeleccionado?.id],
    queryFn: () => base44.entities.Pedido.filter({ cliente_id: clienteSeleccionado.id }, '-dia', 10),
    enabled: !!clienteSeleccionado?.id
  });

  const { data: historial = [] } = useQuery({
    queryKey: ['historial-wa-cliente', clienteSeleccionado?.id],
    queryFn: () => base44.entities.HistorialWhatsApp.filter(
      { destinatario: clienteSeleccionado.telefono_1 }, '-created_date', 20
    ),
    enabled: !!clienteSeleccionado?.telefono_1,
    refetchInterval: 10000
  });

  // Auto-scroll al cargar historial
  useEffect(() => {
    if (historialRef.current) {
      historialRef.current.scrollTop = historialRef.current.scrollHeight;
    }
  }, [historial]);

  // Generar sugerencias proactivas al seleccionar cliente
  useEffect(() => {
    if (!clienteSeleccionado || pedidosCliente.length === 0) {
      setSugerencias([]);
      return;
    }
    generarSugerenciasProactivas();
  }, [clienteSeleccionado?.id, pedidosCliente.length]);

  const generarSugerenciasProactivas = async () => {
    if (!clienteSeleccionado) return;
    setCargandoSugerencias(true);
    setSugerencias([]);
    try {
      const proximoPedido = pedidosCliente.find(p => diasHastaEvento(p.dia) >= 0);
      const ultimoMensaje = historial?.[0]?.mensaje || null;
      const diasEvento = proximoPedido ? diasHastaEvento(proximoPedido.dia) : null;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres un asistente de coordinación de eventos. Analiza la situación del cliente y genera 2-3 sugerencias de respuesta proactivas.

Cliente: ${clienteSeleccionado.nombre}
Contacto: ${clienteSeleccionado.persona_contacto_1 || 'N/A'}
Último mensaje enviado: ${ultimoMensaje || 'Ninguno'}
${proximoPedido ? `Próximo evento: ${proximoPedido.dia} en ${proximoPedido.lugar_evento || 'por confirmar'} (en ${diasEvento} días)` : 'Sin eventos próximos'}
${pedidosCliente.length > 0 ? `Total de pedidos del cliente: ${pedidosCliente.length}` : ''}

Genera 2-3 mensajes sugeridos cortos y listos para enviar. Considera:
- Si el evento es en menos de 3 días: prioriza confirmación urgente
- Si el evento es en 4-7 días: recordatorio amigable
- Si hay eventos pasados recientes: mensaje de seguimiento/agradecimiento
- Si no hay mensajes previos: presentación inicial

Devuelve los mensajes en JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            sugerencias: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  etiqueta: { type: "string" },
                  texto: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (res?.sugerencias?.length) {
        setSugerencias(res.sugerencias.slice(0, 3));
      }
    } catch {
      // Silencioso — sugerencias son opcionales
    } finally {
      setCargandoSugerencias(false);
    }
  };

  const generarConIA = async () => {
    if (!clienteSeleccionado) return;
    setGenerandoIA(true);
    const proximoPedido = pedidosCliente[0];
    const ultimosMensajes = historial.slice(0, 5).map(h => h.mensaje).join('\n');
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres un coordinador de eventos profesional. 
Cliente: "${clienteSeleccionado.nombre}" (${clienteSeleccionado.persona_contacto_1 || ''})
${ultimosMensajes ? `Últimos mensajes enviados:\n${ultimosMensajes}` : ''}
${proximoPedido ? `Próximo evento: ${proximoPedido.dia} en ${proximoPedido.lugar_evento || 'por confirmar'}, hora: ${proximoPedido.entrada || proximoPedido.turnos?.[0]?.entrada || '-'}` : ''}

Redacta un mensaje de seguimiento profesional, cordial y personalizado en español. Máximo 4 frases. Usa como máximo 2 emojis.`
      });
      setMensaje(res);
    } catch {
      toast.error('Error generando mensaje con IA');
    } finally {
      setGenerandoIA(false);
    }
  };

  const aplicarPlantilla = (plantilla) => {
    let contenido = plantilla.contenido;
    if (clienteSeleccionado) {
      contenido = contenido.replace(/\{\{cliente\}\}/g, clienteSeleccionado.nombre);
      const p = pedidosCliente[0];
      if (p) {
        contenido = contenido.replace(/\{\{dia\}\}/g, p.dia ? format(parseISO(p.dia), 'dd/MM/yyyy', { locale: es }) : '');
        contenido = contenido.replace(/\{\{lugar_evento\}\}/g, p.lugar_evento || '');
        contenido = contenido.replace(/\{\{hora_entrada\}\}/g, p.turnos?.[0]?.entrada || p.entrada || '');
        contenido = contenido.replace(/\{\{hora_salida\}\}/g, p.turnos?.[0]?.salida || p.salida || '');
        contenido = contenido.replace(/\{\{camisa\}\}/g, p.camisa || '');
      }
    }
    setMensaje(contenido);
    setPlantillaDialog(false);
  };

  const enviarMensaje = useMutation({
    mutationFn: async () => {
      if (!clienteSeleccionado?.telefono_1) throw new Error('Sin teléfono');
      await base44.functions.invoke('enviarWhatsAppDirecto', {
        telefono: clienteSeleccionado.telefono_1,
        mensaje
      });
    },
    onSuccess: () => {
      toast.success('Mensaje enviado al cliente');
      setMensaje('');
      setSugerencias([]);
      queryClient.invalidateQueries({ queryKey: ['historial-wa-cliente'] });
    },
    onError: () => toast.error('Error enviando mensaje')
  });

  // Evento próximo en los próximos 7 días
  const eventoProximo = pedidosCliente.find(p => {
    const d = diasHastaEvento(p.dia);
    return d !== null && d >= 0 && d <= 7;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-280px)]">
      {/* Lista de clientes */}
      <div className="md:col-span-1 overflow-y-auto space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 px-1">
          Seleccionar cliente
        </div>
        {clientes.map(c => (
          <Card
            key={c.id}
            className={`p-3 cursor-pointer transition-all hover:shadow-md ${clienteSeleccionado?.id === c.id ? 'border-[#1e3a5f] border-2 bg-blue-50' : 'hover:border-slate-300'}`}
            onClick={() => { setClienteSeleccionado(c); setSugerencias([]); }}
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 text-sm truncate">{c.nombre}</h3>
                {c.coordinador_nombre && (
                  <p className="text-xs text-slate-500">Coord: {c.coordinador_nombre}</p>
                )}
                {c.telefono_1 && (
                  <p className="text-xs text-slate-400">{c.telefono_1}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </Card>
        ))}
      </div>

      {/* Panel de chat con cliente */}
      <div className="md:col-span-2 h-full">
        {!clienteSeleccionado ? (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-slate-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Selecciona un cliente para comunicarte</p>
            </div>
          </Card>
        ) : (
          <Card className="h-full flex flex-col">
            {/* Header */}
            <CardHeader className="border-b pb-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{clienteSeleccionado.nombre}</h3>
                  <p className="text-xs text-slate-500">
                    {clienteSeleccionado.telefono_1 || 'Sin teléfono'}
                    {clienteSeleccionado.persona_contacto_1 && ` · ${clienteSeleccionado.persona_contacto_1}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPlantillaDialog(true)}>
                    <Copy className="w-3 h-3 mr-1" />
                    Plantilla
                  </Button>
                  <Button variant="outline" size="sm" onClick={generarConIA} disabled={generandoIA}>
                    {generandoIA ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    IA
                  </Button>
                  <Button variant="ghost" size="sm" onClick={generarSugerenciasProactivas} disabled={cargandoSugerencias} title="Actualizar sugerencias">
                    {cargandoSugerencias ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
              {/* Historial de mensajes */}
              <div ref={historialRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {historial.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay mensajes previos</p>
                  </div>
                ) : [...historial].reverse().map(h => (
                  <div key={h.id} className="flex justify-end">
                    <div className="max-w-[75%]">
                      <div className="bg-[#1e3a5f] text-white px-3 py-2 rounded-2xl rounded-tr-sm text-sm whitespace-pre-wrap">
                        {h.mensaje}
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <span className="text-xs text-slate-400">
                          {h.created_date ? format(new Date(h.created_date), 'dd/MM HH:mm', { locale: es }) : ''}
                        </span>
                        <Badge className={`text-xs px-1.5 py-0 ${h.estado === 'enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {h.estado === 'enviado' ? 'Enviado' : 'Pendiente'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Evento próximo — borrador automático */}
              {eventoProximo && (
                <BorradorEventoProximo
                  pedido={eventoProximo}
                  cliente={clienteSeleccionado}
                  onAplicar={(texto) => setMensaje(texto)}
                />
              )}

              {/* Sugerencias proactivas de la IA */}
              {cargandoSugerencias && (
                <div className="mx-3 mb-2 flex items-center gap-2 text-xs text-violet-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generando sugerencias inteligentes...
                </div>
              )}
              {sugerencias.length > 0 && (
                <div className="mx-3 mb-1">
                  <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-violet-400" />
                    Sugerencias de la IA
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sugerencias.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setMensaje(s.texto)}
                        className="text-xs px-2.5 py-1 rounded-full border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                      >
                        {s.etiqueta}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input de mensaje */}
              <div className="border-t p-3 flex-shrink-0">
                {!clienteSeleccionado.telefono_1 && (
                  <p className="text-xs text-amber-600 mb-2">⚠ El cliente no tiene teléfono registrado</p>
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={mensaje}
                    onChange={e => setMensaje(e.target.value)}
                    placeholder="Escribe un mensaje o usa una sugerencia de IA..."
                    rows={2}
                    className="resize-none text-sm"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.ctrlKey && mensaje.trim()) {
                        enviarMensaje.mutate();
                      }
                    }}
                  />
                  <Button
                    onClick={() => enviarMensaje.mutate()}
                    disabled={!mensaje.trim() || !clienteSeleccionado.telefono_1 || enviarMensaje.isPending}
                    className="bg-[#1e3a5f] hover:bg-[#152a45]"
                  >
                    {enviarMensaje.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Ctrl+Enter para enviar</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog plantillas */}
      <Dialog open={plantillaDialog} onOpenChange={setPlantillaDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Seleccionar Plantilla</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {plantillas.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No hay plantillas disponibles</p>
            ) : plantillas.map(p => (
              <Card key={p.id} className="p-3 cursor-pointer hover:bg-slate-50" onClick={() => aplicarPlantilla(p)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-sm">{p.nombre}</h4>
                    {p.descripcion && <p className="text-xs text-slate-500">{p.descripcion}</p>}
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.contenido}</p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">{p.tipo}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}