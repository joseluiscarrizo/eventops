import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Trash2, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function GestionDocumentos({ open, onClose, camarero }) {
  const [uploading, setUploading] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState('cv');
  const [nombreDocumento, setNombreDocumento] = useState('');
  const queryClient = useQueryClient();

  const subirDocumentoMutation = useMutation({
    mutationFn: async (file) => {
      setUploading(true);
      
      // Subir archivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Actualizar camarero con nuevo documento
      const documentosActuales = camarero.documentos || [];
      const nuevoDocumento = {
        tipo: tipoDocumento,
        nombre: nombreDocumento || file.name,
        url: file_url,
        fecha_subida: format(new Date(), 'yyyy-MM-dd')
      };
      
      await base44.entities.Camarero.update(camarero.id, {
        documentos: [...documentosActuales, nuevoDocumento]
      });
      
      setUploading(false);
      return nuevoDocumento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      toast.success('Documento subido correctamente');
      setNombreDocumento('');
      setTipoDocumento('cv');
    },
    onError: (error) => {
      setUploading(false);
      toast.error('Error al subir documento: ' + error.message);
    }
  });

  const eliminarDocumentoMutation = useMutation({
    mutationFn: async (index) => {
      const documentosActuales = camarero.documentos || [];
      const nuevosDocumentos = documentosActuales.filter((_, i) => i !== index);
      
      await base44.entities.Camarero.update(camarero.id, {
        documentos: nuevosDocumentos
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      toast.success('Documento eliminado');
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!nombreDocumento) {
        setNombreDocumento(file.name);
      }
      subirDocumentoMutation.mutate(file);
    }
  };

  const tiposDocumento = [
    { value: 'cv', label: 'Currículum Vitae' },
    { value: 'certificado', label: 'Certificado' },
    { value: 'dni', label: 'DNI/Identificación' },
    { value: 'contrato', label: 'Contrato' },
    { value: 'otro', label: 'Otro' }
  ];

  const documentos = camarero?.documentos || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1e3a5f]" />
            Documentos - {camarero?.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Subir Documento */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-800 mb-4">Subir Nuevo Documento</h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Tipo de Documento</Label>
                  <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposDocumento.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Nombre del Documento</Label>
                  <Input
                    value={nombreDocumento}
                    onChange={(e) => setNombreDocumento(e.target.value)}
                    placeholder="Ej: CV actualizado 2024"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('file-upload').click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Subiendo...' : 'Seleccionar Archivo'}
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de Documentos */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">Documentos Guardados</h3>
            
            {documentos.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No hay documentos guardados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documentos.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-[#1e3a5f]/10 rounded">
                        <FileText className="w-5 h-5 text-[#1e3a5f]" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 text-sm">{doc.nombre}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="capitalize">{doc.tipo}</span>
                          {doc.fecha_subida && (
                            <>
                              <span>•</span>
                              <span>{format(new Date(doc.fecha_subida), 'dd/MM/yyyy')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => globalThis.open(doc.url, '_blank')}
                        title="Ver documento"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = doc.url;
                          a.download = doc.nombre;
                          a.click();
                        }}
                        title="Descargar"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        onClick={() => {
                          if (confirm('¿Eliminar este documento?')) {
                            eliminarDocumentoMutation.mutate(index);
                          }
                        }}
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}