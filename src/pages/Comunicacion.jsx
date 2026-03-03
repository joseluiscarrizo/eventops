import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '../components/ui/PullToRefresh';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Users, Building2, FileText, Loader2 } from 'lucide-react';
import ChatEventos from '../components/comunicacion/ChatEventos';
import ChatCoordinadores from '../components/comunicacion/ChatCoordinadores';
import ChatClientes from '../components/comunicacion/ChatClientes';
import PartesTrabajos from '../components/comunicacion/PartesTrabajos';

export default function Comunicacion() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['grupos-chat'] });
    await queryClient.invalidateQueries({ queryKey: ['mensajes'] });
    await queryClient.invalidateQueries({ queryKey: ['pedidos-partes'] });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-[#1e3a5f]" />
            Comunicación
          </h1>
          <p className="text-slate-500 mt-1">Gestión centralizada de todas las comunicaciones</p>
        </div>

        <Tabs defaultValue="eventos" className="space-y-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 h-12">
            <TabsTrigger value="eventos" className="flex items-center gap-2 text-xs sm:text-sm">
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Chat Eventos</span>
              <span className="sm:hidden">Eventos</span>
            </TabsTrigger>
            <TabsTrigger value="coordinadores" className="flex items-center gap-2 text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Coordinadores</span>
              <span className="sm:hidden">Coord.</span>
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex items-center gap-2 text-xs sm:text-sm">
              <Building2 className="w-4 h-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="partes" className="flex items-center gap-2 text-xs sm:text-sm">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Partes de Trabajo</span>
              <span className="sm:hidden">Partes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="eventos">
            <ChatEventos user={user} />
          </TabsContent>

          <TabsContent value="coordinadores">
            <ChatCoordinadores user={user} />
          </TabsContent>

          <TabsContent value="clientes">
            <ChatClientes user={user} />
          </TabsContent>

          <TabsContent value="partes">
            <PartesTrabajos user={user} />
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </PullToRefresh>
  );
}