import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Loader2 } from 'lucide-react';
import GruposList from '../components/chat/GruposList';
import ChatWindow from '../components/chat/ChatWindow.jsx';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState({});

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: grupos = [], isLoading } = useQuery({
    queryKey: ['grupos-chat', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Obtener todos los grupos activos
      const todosGrupos = await base44.entities.GrupoChat.filter({ activo: true }, '-created_date');
      
      // Si es admin o coordinador, mostrar todos los grupos
      if (user.role === 'admin' || user.role === 'coordinador') {
        return todosGrupos;
      }
      
      // Si es camarero, buscar por camarero_id
      if (user.role === 'camarero' && user.camarero_id) {
        return todosGrupos.filter(grupo => 
          grupo.miembros?.some(m => m.user_id === user.camarero_id)
        );
      }
      
      // Fallback: buscar por user.id
      return todosGrupos.filter(grupo => 
        grupo.miembros?.some(m => m.user_id === user.id)
      );
    },
    enabled: !!user?.id,
    refetchInterval: 5000
  });

  // Calcular mensajes no leídos
  useEffect(() => {
    if (!user?.id || grupos.length === 0) return;

    const cargarNoLeidos = async () => {
      const contadores = {};
      
      for (const grupo of grupos) {
        const mensajes = await base44.entities.MensajeChat.filter({ grupo_id: grupo.id });
        const noLeidos = mensajes.filter(m => 
          m.user_id !== user.id && !m.leido_por?.includes(user.id)
        ).length;
        contadores[grupo.id] = noLeidos;
      }
      
      setMensajesNoLeidos(contadores);
    };

    cargarNoLeidos();
    const interval = setInterval(cargarNoLeidos, 10000);
    return () => clearInterval(interval);
  }, [grupos, user?.id]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-[#1e3a5f]" />
            Chat de Eventos
          </h1>
          <p className="text-slate-500 mt-2">
            Comunícate con el equipo asignado a cada evento
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : grupos.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No tienes grupos de chat</p>
            <p className="text-sm mt-2">Los grupos se crean automáticamente cuando se confirma un evento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            <div className="md:col-span-1 overflow-y-auto">
              <GruposList
                grupos={grupos}
                grupoSeleccionado={grupoSeleccionado}
                onSeleccionar={setGrupoSeleccionado}
                mensajesNoLeidos={mensajesNoLeidos}
              />
            </div>
            
            <div className="md:col-span-2">
              <ChatWindow grupo={grupoSeleccionado} user={user} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}