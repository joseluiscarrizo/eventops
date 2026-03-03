import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Mail, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';

export default function HojaAsistencia({ pedido, asignaciones, camareros }) {
  const generarHojaHTML = () => {
    const camarerosList = asignaciones
      .map(a => camareros.find(c => c.id === a.camarero_id))
      .filter(Boolean);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .header div { flex: 1; }
          h2 { margin: 0; color: #1e3a5f; }
          table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          th, td { border: 1px solid #333; padding: 12px; text-align: left; }
          th { background-color: #1e3a5f; color: white; font-weight: bold; }
          .firma-box { 
            width: 300px; 
            height: 100px; 
            border: 2px solid #333; 
            margin-left: auto; 
            margin-top: 40px;
            padding: 10px;
          }
          .firma-label { font-weight: bold; margin-bottom: 60px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <strong>Cliente:</strong> ${pedido.cliente}<br>
            <strong>Día:</strong> ${pedido.dia}
          </div>
          <div style="text-align: right;">
            <strong>Evento:</strong> ${pedido.lugar_evento || 'No especificado'}<br>
            <strong>Horario:</strong> ${pedido.entrada} - ${pedido.salida}
          </div>
        </div>

        <h3>Lista de Camareros</h3>
        <table>
          <thead>
            <tr>
              <th>Camarero</th>
              <th>Hora Entrada</th>
              <th>Hora Salida</th>
              <th>Total Horas</th>
              <th>Firma</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${camarerosList.map(c => `
              <tr>
                <td>${c.nombre}</td>
                <td>${pedido.entrada || ''}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="firma-box">
          <div class="firma-label">Firma del Responsable:</div>
        </div>
      </body>
      </html>
    `;
  };

  const enviarEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('enviarHojaAsistenciaGmail', {
        pedido_id: pedido.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      const dest = data.destinatarios?.join(', ') || data.destinatario || 'destinatario';
      const aviso = data.sin_email_cliente ? ' (cliente sin email — enviado al coordinador)' : '';
      toast.success(`Hoja de asistencia enviada a ${dest}${aviso}`);
    },
    onError: (error) => {
      toast.error('Error al enviar la hoja de asistencia');
      console.error(error);
    }
  });

  const exportarSheetsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('exportarAsistenciaSheets', {
        pedido_id: pedido.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Hoja exportada a Google Sheets');
      globalThis.open(data.url, '_blank');
    },
    onError: (error) => {
      toast.error('Error al exportar a Google Sheets');
      console.error(error);
    }
  });

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => enviarEmailMutation.mutate()}
        disabled={enviarEmailMutation.isPending}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {enviarEmailMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Mail className="w-4 h-4 mr-2" />
        )}
        Enviar por Email
      </Button>
      
      <Button
        onClick={() => exportarSheetsMutation.mutate()}
        disabled={exportarSheetsMutation.isPending}
        className="bg-green-600 hover:bg-green-700"
      >
        {exportarSheetsMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4 mr-2" />
        )}
        Exportar a Sheets
      </Button>
    </div>
  );
}