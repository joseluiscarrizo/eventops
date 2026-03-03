import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Settings, History } from 'lucide-react';
import ConfiguracionNotificaciones from '../components/notificaciones/ConfiguracionNotificaciones';
import HistorialNotificaciones from '../components/notificaciones/HistorialNotificaciones';
import NotificacionesMasivas from '../components/notificaciones/NotificacionesMasivas';

export default function PreferenciasNotificaciones() {
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState('historial');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <Bell className="w-8 h-8 text-[#1e3a5f]" />
                Notificaciones
              </h1>
              <p className="text-slate-500 mt-1">Gestiona tus notificaciones y preferencias</p>
            </div>
            <div className="flex gap-3">
              {(user?.role === 'admin' || user?.role === 'coordinador') && (
                <NotificacionesMasivas />
              )}
              <Button 
                onClick={() => setShowConfig(true)}
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="historial" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="historial">
            <HistorialNotificaciones />
          </TabsContent>
        </Tabs>

        {/* Dialog de configuración */}
        <ConfiguracionNotificaciones 
          open={showConfig} 
          onClose={() => setShowConfig(false)} 
        />
      </div>
    </div>
  );
}