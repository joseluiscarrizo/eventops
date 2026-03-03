import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Loader2, Sparkles, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIExtractor({ open, onClose, onPedidoExtraido }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|docx|eml)$/i)) {
      toast.error('Formato no válido. Usa PDF, TXT, DOCX o EML');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Subir archivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile({ name: file.name, url: file_url });
      
      // Extraer datos con IA
      setExtracting(true);
      const prompt = `Eres un asistente que extrae información de eventos de catering.
Analiza el documento y extrae la siguiente información:
- cliente: nombre del cliente o empresa
- lugar_evento: ubicación o lugar del evento
- direccion_completa: dirección completa si está disponible
- dia: fecha del evento en formato YYYY-MM-DD
- entrada: hora de entrada en formato HH:MM
- salida: hora de salida en formato HH:MM
- cantidad_camareros: número de camareros necesarios
- camisa: tipo o color de camisa requerida
- extra_transporte: true si se menciona transporte, false si no
- notas: notas adicionales o requisitos especiales

Si algún campo no está disponible, usa null o valores por defecto razonables.
Devuelve SOLO el objeto JSON, sin texto adicional.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            cliente: { type: "string" },
            lugar_evento: { type: "string" },
            direccion_completa: { type: "string" },
            dia: { type: "string" },
            entrada: { type: "string" },
            salida: { type: "string" },
            cantidad_camareros: { type: "number" },
            camisa: { type: "string" },
            extra_transporte: { type: "boolean" },
            notas: { type: "string" }
          }
        }
      });

      setExtractedData(response);
      toast.success('Datos extraídos correctamente');
    } catch (err) {
      console.error('Error:', err);
      setError('Error al procesar el archivo. Verifica el formato e intenta de nuevo.');
      toast.error('Error al procesar el archivo');
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleConfirm = () => {
    if (extractedData) {
      // Calcular horas si tenemos entrada y salida
      let t_horas = null;
      if (extractedData.entrada && extractedData.salida) {
        const [hE, mE] = extractedData.entrada.split(':').map(Number);
        const [hS, mS] = extractedData.salida.split(':').map(Number);
        t_horas = (hS + mS/60) - (hE + mE/60);
        if (t_horas < 0) t_horas += 24;
      }

      onPedidoExtraido({ ...extractedData, t_horas });
      handleClose();
    }
  };

  const handleClose = () => {
    setUploadedFile(null);
    setExtractedData(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Crear Pedido con IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Zona de subida */}
          {!uploadedFile && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.txt,.docx,.eml"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                    <p className="text-slate-600">Procesando archivo...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Upload className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">Sube un archivo del evento</p>
                      <p className="text-sm text-slate-500">PDF, TXT, DOCX o EML</p>
                    </div>
                    <Button type="button" className="mt-2">
                      Seleccionar archivo
                    </Button>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Archivo subido */}
          {uploadedFile && !extractedData && (
            <Card className="p-4 bg-blue-50">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{uploadedFile.name}</p>
                  {extracting && (
                    <div className="flex items-center gap-2 mt-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      <p className="text-sm text-slate-600">Extrayendo datos con IA...</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Datos extraídos */}
          <AnimatePresence>
            {extractedData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 text-emerald-600 mb-3">
                  <CheckCircle className="w-5 h-5" />
                  <p className="font-medium">Datos extraídos correctamente</p>
                </div>

                <Card className="p-4 bg-slate-50">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Cliente:</span>
                      <p className="font-medium">{extractedData.cliente || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Lugar:</span>
                      <p className="font-medium">{extractedData.lugar_evento || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Fecha:</span>
                      <p className="font-medium">{extractedData.dia || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Horario:</span>
                      <p className="font-medium">{extractedData.entrada || '-'} - {extractedData.salida || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Camareros:</span>
                      <p className="font-medium">{extractedData.cantidad_camareros || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Camisa:</span>
                      <p className="font-medium">{extractedData.camisa || '-'}</p>
                    </div>
                    {extractedData.extra_transporte && (
                      <div>
                        <Badge className="bg-blue-100 text-blue-700">Incluye Transporte</Badge>
                      </div>
                    )}
                  </div>
                  {extractedData.notas && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="text-slate-500 text-sm">Notas:</span>
                      <p className="text-sm mt-1">{extractedData.notas}</p>
                    </div>
                  )}
                </Card>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <p className="font-medium">Revisa los datos antes de crear el pedido</p>
                  <p className="text-xs text-amber-600 mt-1">Podrás editar cualquier campo después</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">{error}</p>
              </div>
            </Card>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            {extractedData && (
              <Button 
                onClick={handleConfirm}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Crear Pedido
              </Button>
            )}
            {uploadedFile && !extractedData && !extracting && (
              <Button 
                variant="outline"
                onClick={() => {
                  setUploadedFile(null);
                  setError(null);
                }}
              >
                Subir otro archivo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}