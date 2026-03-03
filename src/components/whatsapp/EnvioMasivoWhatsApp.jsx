import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Send, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function EnvioMasivoWhatsApp({ pedidoId, camarerosPredefinidos = [], open, onClose }) {
  const [mensaje, setMensaje] = useState('');
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState('');
  const [camarerosSeleccionados, setCamarerosSeleccionados] = useState(camarerosPredefinidos);
  const [coordinadorId, setCoordinadorId] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [resultados, setResultados] = useState(null);

  const queryClient = useQueryClient();

  const { data: plantillas = [] } = useQuery({
    queryKey: ['plantillas-whatsapp'],
    queryFn: () => base44.entities.PlantillaWhatsApp.filter({ activa: true })
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list()
  });

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores'],
    queryFn: () => base44.entities.Coordinador.list()
  });

  const enviarMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('enviarWhatsAppMasivo', {
        camareros_ids: camarerosSeleccionados,
        pedido_id: pedidoId,
        mensaje: mensaje,
        plantilla_id: plantillaSeleccionada,
        coordinador_id: coordinadorId
      });
      return response.data;
    },
    onSuccess: (data) => {
      setResultados(data);
      setMostrarResultados(true);
      queryClient.invalidateQueries({ queryKey: ['historial-whatsapp'] });
      
      // Contar mensajes enviados directamente vs por web
      const directos = data.detalles?.filter(d => d.enviado_por_api).length || 0;
      const porWeb = data.detalles?.filter(d => !d.enviado_por_api).length || 0;
      
      // Si hay mensajes enviados directamente por API, mostrar mensaje especial
      if (directos > 0 && porWeb === 0) {
        toast.success(`✅ ${directos} mensaje${directos !== 1 ? 's' : ''} enviado${directos !== 1 ? 's' : ''} directamente por WhatsApp`);
      } else if (directos > 0 && porWeb > 0) {
        toast.success(`✅ ${directos} enviados directamente por API. Revisa las ventanas de WhatsApp Web para ${porWeb} adicionales.`);
      } else if (data.exitosos > 0) {
        toast.success(`${data.exitosos} mensajes enviados. Revisa las ventanas de WhatsApp Web.`);
      }
      
      if (data.fallidos > 0) {
        toast.warning(`${data.fallidos} mensajes fallaron`);
      }
    },
    onError: (error) => {
      toast.error('Error al enviar mensajes: ' + error.message);
    }
  });

  const handlePlantillaChange = (plantillaId) => {
    setPlantillaSeleccionada(plantillaId);
    const plantilla = plantillas.find(p => p.id === plantillaId);
    if (plantilla) {
      setMensaje(plantilla.contenido);
    }
  };

  const toggleCamarero = (camareroId) => {
    setCamarerosSeleccionados(prev => 
      prev.includes(camareroId) 
        ? prev.filter(id => id !== camareroId)
        : [...prev, camareroId]
    );
  };

  const seleccionarTodos = () => {
    setCamarerosSeleccionados(camareros.map(c => c.id));
  };

  const limpiarSeleccion = () => {
    setCamarerosSeleccionados([]);
  };

  const handleCerrar = () => {
    setMostrarResultados(false);
    setResultados(null);
    setMensaje('');
    setPlantillaSeleccionada('');
    setCamarerosSeleccionados(camarerosPredefinidos);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#1e3a5f]" />
            Envío Masivo de WhatsApp
          </DialogTitle>
        </DialogHeader>

        {!mostrarResultados ? (
          <div className="space-y-4">
            {/* Selector de Coordinador */}
            <div>
              <Label>Coordinador que envía (opcional)</Label>
              <Select value={coordinadorId} onValueChange={setCoordinadorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar coordinador..." />
                </SelectTrigger>
                <SelectContent>
                  {coordinadores.map(coord => (
                    <SelectItem key={coord.id} value={coord.id}>
                      {coord.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selector de Plantilla */}
            <div>
              <Label>Plantilla predefinida (opcional)</Label>
              <Select value={plantillaSeleccionada} onValueChange={handlePlantillaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plantilla..." />
                </SelectTrigger>
                <SelectContent>
                  {plantillas.map(plantilla => (
                    <SelectItem key={plantilla.id} value={plantilla.id}>
                      {plantilla.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mensaje */}
            <div>
              <Label>Mensaje</Label>
              <Textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Variables disponibles: {'{{camarero}}, {{cliente}}, {{dia}}, {{lugar_evento}}, {{hora_entrada}}, {{hora_salida}}'}
              </p>
            </div>

            {/* Selección de Camareros */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Camareros destinatarios ({camarerosSeleccionados.length} seleccionados)</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={seleccionarTodos}>
                    Seleccionar Todos
                  </Button>
                  <Button size="sm" variant="outline" onClick={limpiarSeleccion}>
                    Limpiar
                  </Button>
                </div>
              </div>
              
              <Card className="p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {camareros.map(camarero => (
                    <div key={camarero.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={camarerosSeleccionados.includes(camarero.id)}
                        onCheckedChange={() => toggleCamarero(camarero.id)}
                      />
                      <Label className="flex-1 cursor-pointer">
                        {camarero.nombre}
                        {!camarero.telefono && (
                          <span className="text-red-500 text-xs ml-2">(Sin teléfono)</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={handleCerrar}>
                Cancelar
              </Button>
              <Button
                onClick={() => enviarMutation.mutate()}
                disabled={!mensaje || camarerosSeleccionados.length === 0 || enviarMutation.isPending}
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
              >
                {enviarMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar a {camarerosSeleccionados.length} camareros
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resultados del envío */}
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">{resultados.exitosos} Exitosos</span>
                </div>
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span className="font-semibold">{resultados.fallidos} Fallidos</span>
                </div>
              </div>
              <p className="text-sm text-slate-600">{resultados.mensaje}</p>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {resultados.detalles?.map((detalle, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {detalle.estado === 'enviado' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : detalle.estado === 'fallido' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      )}
                      <div>
                        <p className="font-medium">{detalle.camarero}</p>
                        {detalle.telefono && (
                          <p className="text-xs text-slate-500">{detalle.telefono}</p>
                        )}
                        {detalle.error && (
                          <p className="text-xs text-red-500">{detalle.error}</p>
                        )}
                        {detalle.enviado_por_api ? (
                          <p className="text-xs text-green-600 font-medium">✓ Enviado directamente por WhatsApp API</p>
                        ) : detalle.proveedor && (
                          <p className="text-xs text-slate-400">Vía: {detalle.proveedor}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleCerrar}>Cerrar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}