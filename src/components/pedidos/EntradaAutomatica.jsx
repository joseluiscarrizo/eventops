import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EntradaAutomatica() {
  const [emailText, setEmailText] = useState('');
  const [whatsappText, setWhatsappText] = useState('');
  const [remitente, setRemitente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [processingEmail, setProcessingEmail] = useState(false);
  const [processingWhatsApp, setProcessingWhatsApp] = useState(false);
  const [resultadoEmail, setResultadoEmail] = useState(null);
  const [resultadoWhatsApp, setResultadoWhatsApp] = useState(null);

  const queryClient = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nombre')
  });

  const buscarClientePorEmail = (email) => {
    return clientes.find(c => 
      c.email_principal?.toLowerCase() === email?.toLowerCase() ||
      c.email_secundario?.toLowerCase() === email?.toLowerCase() ||
      c.email_terciario?.toLowerCase() === email?.toLowerCase()
    );
  };

  const buscarClientePorTelefono = (tel) => {
    const telLimpio = tel?.replace(/\D/g, '');
    return clientes.find(c => 
      c.telefono?.replace(/\D/g, '').includes(telLimpio) ||
      c.telefono_secundario?.replace(/\D/g, '').includes(telLimpio)
    );
  };

  const procesarEmailMutation = useMutation({
    mutationFn: async () => {
      setProcessingEmail(true);
      setResultadoEmail(null);

      // Buscar cliente por email
      const clienteEncontrado = buscarClientePorEmail(remitente);

      // Extraer datos del email usando IA
      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: `Extrae la siguiente información de este email de solicitud de servicio de camareros:
- Cliente (nombre de la persona o empresa)
- Fecha del evento (formato YYYY-MM-DD)
- Hora de inicio
- Hora de fin
- Lugar del evento
- Cantidad de camareros necesarios
- Notas adicionales (todo lo relevante que no entre en las categorías anteriores)

Email:
${emailText}

IMPORTANTE: Si no encuentras algún dato, devuelve null en ese campo.`,
        response_json_schema: {
          type: "object",
          properties: {
            cliente: { type: "string" },
            fecha: { type: "string" },
            hora_inicio: { type: "string" },
            hora_fin: { type: "string" },
            lugar: { type: "string" },
            cantidad_camareros: { type: "number" },
            notas: { type: "string" }
          }
        }
      });

      return { datos: resultado, clienteEncontrado };
    },
    onSuccess: ({ datos, clienteEncontrado }) => {
      setProcessingEmail(false);
      setResultadoEmail({
        ...datos,
        cliente_identificado: clienteEncontrado,
        remitente: remitente
      });
      toast.success('Email procesado correctamente');
    },
    onError: () => {
      setProcessingEmail(false);
      toast.error('Error al procesar el email');
    }
  });

  const procesarWhatsAppMutation = useMutation({
    mutationFn: async () => {
      setProcessingWhatsApp(true);
      setResultadoWhatsApp(null);

      // Buscar cliente por teléfono
      const clienteEncontrado = buscarClientePorTelefono(telefono);

      // Extraer datos del mensaje usando IA
      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: `Extrae la siguiente información de este mensaje de WhatsApp sobre un servicio de camareros:
- Cliente (nombre de la persona o empresa)
- Fecha del evento (formato YYYY-MM-DD)
- Hora de inicio
- Hora de fin
- Lugar del evento
- Cantidad de camareros necesarios
- Notas adicionales

Mensaje:
${whatsappText}

IMPORTANTE: Si no encuentras algún dato, devuelve null en ese campo.`,
        response_json_schema: {
          type: "object",
          properties: {
            cliente: { type: "string" },
            fecha: { type: "string" },
            hora_inicio: { type: "string" },
            hora_fin: { type: "string" },
            lugar: { type: "string" },
            cantidad_camareros: { type: "number" },
            notas: { type: "string" }
          }
        }
      });

      return { datos: resultado, clienteEncontrado };
    },
    onSuccess: ({ datos, clienteEncontrado }) => {
      setProcessingWhatsApp(false);
      setResultadoWhatsApp({
        ...datos,
        cliente_identificado: clienteEncontrado,
        telefono: telefono
      });
      toast.success('Mensaje procesado correctamente');
    },
    onError: () => {
      setProcessingWhatsApp(false);
      toast.error('Error al procesar el mensaje');
    }
  });

  const crearPedidoDesdeDatos = async (datos, origen) => {
    const pedidoData = {
      cliente: datos.cliente || 'Sin nombre',
      cliente_email: origen === 'email' ? datos.remitente : '',
      cliente_telefono: origen === 'whatsapp' ? datos.telefono : '',
      cliente_id: datos.cliente_identificado?.id || null,
      dia: datos.fecha,
      entrada: datos.hora_inicio,
      salida: datos.hora_fin,
      lugar_evento: datos.lugar,
      cantidad_camareros: datos.cantidad_camareros || 1,
      notas: datos.notas || '',
      origen_pedido: origen
    };

    await base44.entities.Pedido.create(pedidoData);
    queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    toast.success('Pedido creado exitosamente');

    // Limpiar formulario
    if (origen === 'email') {
      setEmailText('');
      setRemitente('');
      setResultadoEmail(null);
    } else {
      setWhatsappText('');
      setTelefono('');
      setResultadoWhatsApp(null);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-600" />
        Entrada Automatizada de Pedidos
      </h2>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            Por Email
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <MessageSquare className="w-4 h-4 mr-2" />
            Por WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="remitente">Email del Remitente</Label>
              <Input
                id="remitente"
                type="email"
                placeholder="cliente@ejemplo.com"
                value={remitente}
                onChange={(e) => setRemitente(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="email">Contenido del Email</Label>
              <Textarea
                id="email"
                placeholder="Pega aquí el contenido del email..."
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                rows={8}
              />
            </div>

            <Button 
              onClick={() => procesarEmailMutation.mutate()}
              disabled={!emailText || !remitente || processingEmail}
              className="w-full"
            >
              {processingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Procesar Email
                </>
              )}
            </Button>
          </div>

          {resultadoEmail && (
            <Card className="p-4 bg-emerald-50 border-emerald-200">
              <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Datos Extraídos
              </h3>
              
              {resultadoEmail.cliente_identificado && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">
                    ✓ Cliente identificado: {resultadoEmail.cliente_identificado.nombre}
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <p><strong>Cliente:</strong> {resultadoEmail.cliente || 'No especificado'}</p>
                <p><strong>Fecha:</strong> {resultadoEmail.fecha || 'No especificada'}</p>
                <p><strong>Horario:</strong> {resultadoEmail.hora_inicio} - {resultadoEmail.hora_fin}</p>
                <p><strong>Lugar:</strong> {resultadoEmail.lugar || 'No especificado'}</p>
                <p><strong>Camareros:</strong> {resultadoEmail.cantidad_camareros || 'No especificado'}</p>
                {resultadoEmail.notas && (
                  <p><strong>Notas:</strong> {resultadoEmail.notas}</p>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => crearPedidoDesdeDatos(resultadoEmail, 'email')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  Crear Pedido
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setResultadoEmail(null)}
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="telefono">Teléfono del Cliente</Label>
              <Input
                id="telefono"
                placeholder="+34 600 000 000"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="whatsapp">Mensaje de WhatsApp</Label>
              <Textarea
                id="whatsapp"
                placeholder="Pega aquí el contenido del mensaje..."
                value={whatsappText}
                onChange={(e) => setWhatsappText(e.target.value)}
                rows={8}
              />
            </div>

            <Button 
              onClick={() => procesarWhatsAppMutation.mutate()}
              disabled={!whatsappText || !telefono || processingWhatsApp}
              className="w-full"
            >
              {processingWhatsApp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Procesar WhatsApp
                </>
              )}
            </Button>
          </div>

          {resultadoWhatsApp && (
            <Card className="p-4 bg-emerald-50 border-emerald-200">
              <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Datos Extraídos
              </h3>
              
              {resultadoWhatsApp.cliente_identificado && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">
                    ✓ Cliente identificado: {resultadoWhatsApp.cliente_identificado.nombre}
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <p><strong>Cliente:</strong> {resultadoWhatsApp.cliente || 'No especificado'}</p>
                <p><strong>Fecha:</strong> {resultadoWhatsApp.fecha || 'No especificada'}</p>
                <p><strong>Horario:</strong> {resultadoWhatsApp.hora_inicio} - {resultadoWhatsApp.hora_fin}</p>
                <p><strong>Lugar:</strong> {resultadoWhatsApp.lugar || 'No especificado'}</p>
                <p><strong>Camareros:</strong> {resultadoWhatsApp.cantidad_camareros || 'No especificado'}</p>
                {resultadoWhatsApp.notas && (
                  <p><strong>Notas:</strong> {resultadoWhatsApp.notas}</p>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => crearPedidoDesdeDatos(resultadoWhatsApp, 'whatsapp')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  Crear Pedido
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setResultadoWhatsApp(null)}
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}