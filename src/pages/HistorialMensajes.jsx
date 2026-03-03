import HistorialWhatsApp from '../components/whatsapp/HistorialWhatsApp';
import EnviosProgramados from '../components/whatsapp/EnviosProgramados';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Calendar } from 'lucide-react';

export default function HistorialMensajes() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Gestión de Mensajes WhatsApp</h1>
          <p className="text-slate-500 mt-2">
            Historial completo y envíos programados
          </p>
        </div>

        <Tabs defaultValue="historial" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="historial" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="programados" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Programados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="historial">
            <HistorialWhatsApp />
          </TabsContent>

          <TabsContent value="programados">
            <EnviosProgramados />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
