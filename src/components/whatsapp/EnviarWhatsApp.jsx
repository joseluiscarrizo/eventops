import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import Logger from '@/utils/logger';

export default function EnviarWhatsApp({ pedido, asignaciones = [], camareros = [] }) {
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!pedido) return null;

  const camarerosAsignados = camareros.filter(c =>
    asignaciones.some(a => a.camarero_id === c.id)
  );

  const handleEnviar = async () => {
    if (!mensaje.trim()) {
      toast.error('Escribe un mensaje antes de enviar');
      return;
    }

    setEnviando(true);
    try {
      for (const camarero of camarerosAsignados) {
        if (!camarero.telefono) continue;
        await base44.functions.invoke('enviarWhatsAppDirecto', {
          telefono: camarero.telefono,
          mensaje: mensaje,
          camarero_id: camarero.id,
          camarero_nombre: camarero.nombre,
          pedido_id: pedido.id
        });
      }
      toast.success('Mensajes enviados correctamente');
      setMensaje('');
    } catch (error) {
      Logger.error('Error al enviar WhatsApp', { error: error?.message });
      toast.error('Error al enviar mensajes: ' + (error.message || 'Error desconocido'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <MessageSquare className="w-4 h-4" />
        Enviar WhatsApp ({camarerosAsignados.length} camareros)
      </div>
      <Textarea
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        placeholder="Escribe el mensaje..."
        rows={3}
        className="text-sm"
      />
      <Button
        onClick={handleEnviar}
        disabled={enviando || camarerosAsignados.length === 0}
        size="sm"
        className="w-full"
      >
        <Send className="w-4 h-4 mr-2" />
        {enviando ? 'Enviando...' : 'Enviar a todos'}
      </Button>
    </div>
  );
}

