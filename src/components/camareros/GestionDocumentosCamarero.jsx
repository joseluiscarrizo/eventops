import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, CheckCircle, XCircle, Clock, AlertTriangle, Trash2, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function GestionDocumentosCamarero({ camarero, soloLectura = false }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [tipoDoc, setTipoDoc] = useState('certificado');
  const [nombreDoc, setNombreDoc] = useState('');
  const [fechaExpiracion, setFechaExpiracion] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const esAdmin = user?.role === 'admin' || user?.role === 'coordinador';

  const updateCamareroMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Camarero.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      toast.success('Documento actualizado');
    }
  });

  const handleSubirDocumento = async () => {
    if (!archivo || !nombreDoc) {
      toast.error('Completa todos los campos');
      return;
    }

    setSubiendo(true);
    try {
      // Subir archivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file: archivo });

      // Añadir documento al array
      const documentosActuales = camarero.documentos || [];
      const nuevoDocumento = {
        tipo: tipoDoc,
        nombre: nombreDoc,
        url: file_url,
        fecha_subida: new Date().toISOString(),
        fecha_expiracion: fechaExpiracion || null,
        estado: 'pendiente',
        aprobado_por: null,
        fecha_aprobacion: null
      };

      updateCamareroMutation.mutate({
        id: camarero.id,
        data: {
          documentos: [...documentosActuales, nuevoDocumento]
        }
      });

      // Reset
      setDialogOpen(false);
      setArchivo(null);
      setNombreDoc('');
      setTipoDoc('certificado');
      setFechaExpiracion('');
      toast.success('Documento subido correctamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al subir documento');
    } finally {
      setSubiendo(false);
    }
  };

  const handleAprobarDocumento = (index, estado) => {
    const documentosActuales = [...(camarero.documentos || [])];
    documentosActuales[index] = {
      ...documentosActuales[index],
      estado: estado,
      aprobado_por: user.full_name,
      fecha_aprobacion: new Date().toISOString()
    };

    updateCamareroMutation.mutate({
      id: camarero.id,
      data: { documentos: documentosActuales }
    });
  };

  const handleEliminarDocumento = (index) => {
    if (!confirm('¿Eliminar este documento?')) return;
    
    const documentosActuales = [...(camarero.documentos || [])];
    documentosActuales.splice(index, 1);

    updateCamareroMutation.mutate({
      id: camarero.id,
      data: { documentos: documentosActuales }
    });
  };

  const getEstadoColor = (doc) => {
    if (doc.estado === 'rechazado') return 'bg-red-100 text-red-700 border-red-300';
    if (doc.estado === 'aprobado') {
      // Verificar expiración
      if (doc.fecha_expiracion) {
        const hoy = new Date();
        const expiracion = new Date(doc.fecha_expiracion);
        const diasRestantes = Math.ceil((expiracion - hoy) / (1000 * 60 * 60 * 24));
        
        if (diasRestantes < 0) return 'bg-red-100 text-red-700 border-red-300';
        if (diasRestantes <= 30) return 'bg-amber-100 text-amber-700 border-amber-300';
      }
      return 'bg-green-100 text-green-700 border-green-300';
    }
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const getEstadoIcono = (doc) => {
    if (doc.estado === 'aprobado') {
      // Verificar expiración
      if (doc.fecha_expiracion) {
        const hoy = new Date();
        const expiracion = new Date(doc.fecha_expiracion);
        const diasRestantes = Math.ceil((expiracion - hoy) / (1000 * 60 * 60 * 24));
        
        if (diasRestantes < 0) return <XCircle className="w-4 h-4" />;
        if (diasRestantes <= 30) return <AlertTriangle className="w-4 h-4" />;
      }
      return <CheckCircle className="w-4 h-4" />;
    }
    if (doc.estado === 'rechazado') return <XCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getEstadoTexto = (doc) => {
    if (doc.estado === 'aprobado') {
      if (doc.fecha_expiracion) {
        const hoy = new Date();
        const expiracion = new Date(doc.fecha_expiracion);
        const diasRestantes = Math.ceil((expiracion - hoy) / (1000 * 60 * 60 * 24));
        
        if (diasRestantes < 0) return 'Expirado';
        if (diasRestantes <= 30) return `Expira en ${diasRestantes} días`;
      }
      return 'Aprobado';
    }
    if (doc.estado === 'rechazado') return 'Rechazado';
    return 'Pendiente';
  };

  const documentos = camarero.documentos || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documentos y Certificados
        </h3>
        {!soloLectura && (
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Subir Documento
          </Button>
        )}
      </div>

      {documentos.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No hay documentos subidos</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documentos.map((doc, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {doc.tipo}
                    </Badge>
                    <Badge className={getEstadoColor(doc)}>
                      {getEstadoIcono(doc)}
                      <span className="ml-1">{getEstadoTexto(doc)}</span>
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-slate-800">{doc.nombre}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Subido: {format(new Date(doc.fecha_subida), 'dd/MM/yyyy', { locale: es })}
                  </p>
                  {doc.fecha_expiracion && (
                    <p className="text-xs text-slate-500">
                      Expira: {format(new Date(doc.fecha_expiracion), 'dd/MM/yyyy', { locale: es })}
                    </p>
                  )}
                  {doc.estado === 'aprobado' && doc.aprobado_por && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Por {doc.aprobado_por}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => globalThis.open(doc.url, '_blank')}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Ver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = doc.url;
                    a.download = doc.nombre;
                    a.click();
                  }}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Descargar
                </Button>
                
                {esAdmin && doc.estado === 'pendiente' && (
                  <>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleAprobarDocumento(index, 'aprobado')}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAprobarDocumento(index, 'rechazado')}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Rechazar
                    </Button>
                  </>
                )}
                
                {!soloLectura && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEliminarDocumento(index)}
                    className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para subir documento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Nuevo Documento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Tipo de Documento</Label>
              <Select value={tipoDoc} onValueChange={setTipoDoc}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="certificado">Certificado</SelectItem>
                  <SelectItem value="dni">DNI</SelectItem>
                  <SelectItem value="permiso">Permiso de Trabajo</SelectItem>
                  <SelectItem value="carnet">Carnet Profesional</SelectItem>
                  <SelectItem value="seguro">Seguro</SelectItem>
                  <SelectItem value="cv">CV</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nombre del Documento *</Label>
              <Input
                value={nombreDoc}
                onChange={(e) => setNombreDoc(e.target.value)}
                placeholder="Ej: Certificado de manipulación de alimentos"
              />
            </div>

            <div>
              <Label>Fecha de Expiración (opcional)</Label>
              <Input
                type="date"
                value={fechaExpiracion}
                onChange={(e) => setFechaExpiracion(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label>Archivo *</Label>
              <Input
                type="file"
                onChange={(e) => setArchivo(e.target.files?.[0])}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <p className="text-xs text-slate-500 mt-1">
                Formatos: PDF, JPG, PNG, DOC (máx. 10MB)
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubirDocumento}
                disabled={subiendo || !archivo || !nombreDoc}
              >
                {subiendo ? 'Subiendo...' : 'Subir Documento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}