import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import ChatWindow from '../chat/ChatWindow';

export default function ChatEventos({ user }) {
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);

  const { data: grupos = [], isLoading } = useQuery({
    queryKey: ['grupos-chat-eventos', user?.id],
    queryFn: async () => {
      const todos = await base44.entities.GrupoChat.filter({ activo: true }, '-created_date');
      // Excluir el grupo interno de coordinadores
      const soloEventos = todos.filter(g => g.pedido_id !== 'coordinadores-interno');
      // Coordinadores y admin ven todos los grupos de evento
      if (user.role === 'admin' || user.role === 'coordinador') return soloEventos;
      // Camareros solo ven los suyos
      return soloEventos.filter(g => g.miembros?.some(m => m.user_id === user.id || m.user_id === user.camarero_id));
    },
    enabled: !!user?.id,
    refetchInterval: 5000
  });

  const { data: mensajesRecientes = [] } = useQuery({
    queryKey: ['mensajes-recientes-eventos'],
    queryFn: async () => {
      if (grupos.length === 0) return {};
      const contadores = {};
      for (const g of grupos.slice(0, 10)) {
        const msgs = await base44.entities.MensajeChat.filter({ grupo_id: g.id }, '-created_date');
        const noLeidos = msgs.filter(m => m.user_id !== user.id && !m.leido_por?.includes(user.id)).length;
        contadores[g.id] = noLeidos;
      }
      return contadores;
    },
    enabled: grupos.length > 0,
    refetchInterval: 10000
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-280px)]">
      {/* Lista de grupos */}
      <div className="md:col-span-1 overflow-y-auto space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 px-1">
          {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} de evento
        </div>
        {grupos.length === 0 ? (
          <Card className="p-6 text-center text-slate-400">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay grupos de chat activos</p>
            <p className="text-xs mt-1">Se crean al confirmar eventos</p>
          </Card>
        ) : grupos.map(grupo => {
          const noLeidos = mensajesRecientes[grupo.id] || 0;
          const activo = grupoSeleccionado?.id === grupo.id;
          return (
            <Card
              key={grupo.id}
              className={cn(
                "p-3 cursor-pointer transition-all hover:shadow-md",
                activo ? "border-[#1e3a5f] border-2 bg-blue-50" : "hover:border-slate-300"
              )}
              onClick={() => setGrupoSeleccionado(grupo)}
            >
              <div className="flex items-start gap-2">
                <div className="w-9 h-9 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-[#1e3a5f]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h3 className="font-semibold text-slate-800 text-sm truncate">{grupo.nombre}</h3>
                    {noLeidos > 0 && (
                      <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 flex-shrink-0">{noLeidos}</Badge>
                    )}
                  </div>
                  {grupo.descripcion && (
                    <p className="text-xs text-slate-500 truncate mb-1">{grupo.descripcion}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {grupo.fecha_evento ? format(new Date(grupo.fecha_evento), "dd MMM", { locale: es }) : '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {grupo.miembros?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Ventana de chat */}
      <div className="md:col-span-2 h-full">
        <ChatWindow grupo={grupoSeleccionado} user={user} />
      </div>
    </div>
  );
}