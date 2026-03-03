import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Users, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const GRUPO_COORD_ID = 'coordinadores-interno';

export default function ChatCoordinadores({ user }) {
  const [mensaje, setMensaje] = useState('');
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // Asegurar que existe el grupo de coordinadores
  const { data: grupoCoord } = useQuery({
    queryKey: ['grupo-coordinadores'],
    queryFn: async () => {
      const grupos = await base44.entities.GrupoChat.filter({ pedido_id: GRUPO_COORD_ID });
      if (grupos.length > 0) return grupos[0];
      // Crear si no existe
      const nuevo = await base44.entities.GrupoChat.create({
        pedido_id: GRUPO_COORD_ID,
        nombre: 'Chat de Coordinadores',
        descripcion: 'Canal interno del equipo de coordinación',
        fecha_evento: new Date().toISOString().split('T')[0],
        activo: true,
        miembros: []
      });
      return nuevo;
    },
    enabled: !!user?.id
  });

  const { data: mensajes = [], isLoading } = useQuery({
    queryKey: ['mensajes-coordinadores', grupoCoord?.id],
    queryFn: () => base44.entities.MensajeChat.filter({ grupo_id: grupoCoord.id }, 'created_date'),
    enabled: !!grupoCoord?.id,
    refetchInterval: 3000
  });

  // Suscripción en tiempo real
  useEffect(() => {
    if (!grupoCoord?.id) return;
    const unsub = base44.entities.MensajeChat.subscribe((event) => {
      if (event.type === 'create' && event.data.grupo_id === grupoCoord.id) {
        queryClient.invalidateQueries({ queryKey: ['mensajes-coordinadores'] });
      }
    });
    return unsub;
  }, [grupoCoord?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes.length]);

  const enviarMutation = useMutation({
    mutationFn: (msg) => base44.entities.MensajeChat.create(msg),
    onSuccess: () => {
      setMensaje('');
      queryClient.invalidateQueries({ queryKey: ['mensajes-coordinadores'] });
    },
    onError: () => toast.error('Error al enviar')
  });

  const handleEnviar = () => {
    if (!mensaje.trim() || !grupoCoord) return;
    enviarMutation.mutate({
      grupo_id: grupoCoord.id,
      user_id: user.id,
      nombre_usuario: user.full_name,
      rol_usuario: 'coordinador',
      mensaje: mensaje.trim(),
      tipo: 'texto',
      leido_por: [user.id]
    });
  };

  const isPropio = (msg) => msg.user_id === user.id;

  return (
    <Card className="h-[calc(100vh-280px)] flex flex-col">
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          Chat de Coordinadores
          <Badge variant="outline" className="ml-auto text-xs">Interno</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : mensajes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Canal interno de coordinadores</p>
              <p className="text-xs mt-1">Sé el primero en escribir</p>
            </div>
          ) : mensajes.map(msg => (
            <div key={msg.id} className={`flex ${isPropio(msg) ? 'justify-end' : 'justify-start'}`}>
              {!isPropio(msg) && (
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
                  {msg.nombre_usuario?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={`max-w-[70%] ${isPropio(msg) ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isPropio(msg) && (
                  <span className="text-xs text-slate-500 mb-1">{msg.nombre_usuario}</span>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm ${
                  isPropio(msg)
                    ? 'bg-[#1e3a5f] text-white rounded-tr-sm'
                    : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                }`}>
                  {msg.mensaje}
                </div>
                <span className="text-xs text-slate-400 mt-1">
                  {msg.created_date ? format(new Date(msg.created_date), 'HH:mm', { locale: es }) : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Textarea
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar(); } }}
              placeholder="Mensaje para coordinadores..."
              rows={2}
              className="resize-none text-sm"
            />
            <Button
              onClick={handleEnviar}
              disabled={!mensaje.trim() || enviarMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
            >
              {enviarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}