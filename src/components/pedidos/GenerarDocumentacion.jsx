import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Download, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function GenerarDocumentacion({ pedido, variant = "outline", size = "sm" }) {
  const [open, setOpen] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [documentacion, setDocumentacion] = useState(null);

  const generarDocumentacion = async () => {
    setGenerando(true);
    try {
      const resultado = await base44.functions.invoke('generarDocumentacionServicio', {
        pedido_id: pedido.id
      });

      setDocumentacion(resultado);
      toast.success('Documentación generada con IA');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al generar documentación');
    } finally {
      setGenerando(false);
    }
  };

  const exportarPDF = () => {
    if (!documentacion?.documentacion) return;

    const doc = new jsPDF();
    const doc_data = documentacion.documentacion;
    let y = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const maxWidth = 170;

    // Función para añadir texto con salto de página automático
    const addText = (text, fontSize = 10, isBold = false, indent = 0) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      
      const lines = doc.splitTextToSize(text, maxWidth - indent);
      lines.forEach(line => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin + indent, y);
        y += fontSize * 0.5;
      });
      y += 3;
    };

    const addSection = (title) => {
      y += 5;
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(30, 58, 95);
      doc.rect(margin - 5, y - 5, maxWidth + 10, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, y);
      doc.setTextColor(0, 0, 0);
      y += 10;
    };

    // Encabezado
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DOCUMENTACIÓN DE SERVICIO', margin, 15);
    doc.setFontSize(11);
    doc.text(`${pedido.cliente} - ${pedido.codigo_pedido || ''}`, margin, 25);
    doc.setTextColor(0, 0, 0);
    y = 45;

    // Fecha de generación
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    // 1. RESUMEN EJECUTIVO
    if (doc_data.resumen_ejecutivo) {
      addSection('1. RESUMEN EJECUTIVO');
      addText(doc_data.resumen_ejecutivo.vision_general, 10);
      
      if (doc_data.resumen_ejecutivo.puntos_clave?.length > 0) {
        addText('Puntos Clave:', 10, true);
        doc_data.resumen_ejecutivo.puntos_clave.forEach(punto => {
          addText(`• ${punto}`, 9, false, 5);
        });
      }
      
      if (doc_data.resumen_ejecutivo.nivel_complejidad) {
        addText(`Complejidad: ${doc_data.resumen_ejecutivo.nivel_complejidad}`, 10, true);
      }
    }

    // 2. INFORMACIÓN DEL CLIENTE
    if (doc_data.informacion_cliente) {
      addSection('2. INFORMACIÓN DEL CLIENTE');
      const cliente = doc_data.informacion_cliente;
      if (cliente.nombre) addText(`Cliente: ${cliente.nombre}`, 10, true);
      if (cliente.contacto_principal) addText(`Contacto: ${cliente.contacto_principal}`, 10);
      if (cliente.telefono) addText(`Teléfono: ${cliente.telefono}`, 10);
      if (cliente.email) addText(`Email: ${cliente.email}`, 10);
      if (cliente.observaciones) addText(`Observaciones: ${cliente.observaciones}`, 9);
    }

    // 3. DETALLES DEL SERVICIO
    if (doc_data.detalles_servicio) {
      addSection('3. DETALLES DEL SERVICIO');
      const servicio = doc_data.detalles_servicio;
      if (servicio.fecha_completa) addText(`📅 ${servicio.fecha_completa}`, 10, true);
      if (servicio.ubicacion_completa) addText(`📍 ${servicio.ubicacion_completa}`, 10);
      if (servicio.tipo_evento) addText(`Tipo de Evento: ${servicio.tipo_evento}`, 10);
      if (servicio.horarios) addText(`⏰ ${servicio.horarios}`, 10);
      if (servicio.uniforme_requerido) addText(`👔 Uniforme: ${servicio.uniforme_requerido}`, 10);
      if (servicio.transporte_incluido) addText(`🚗 Transporte incluido`, 10, true);
      if (servicio.instrucciones_acceso) addText(`Acceso: ${servicio.instrucciones_acceso}`, 9);
      
      if (servicio.requerimientos_especiales?.length > 0) {
        addText('Requerimientos Especiales:', 10, true);
        servicio.requerimientos_especiales.forEach(req => {
          addText(`• ${req}`, 9, false, 5);
        });
      }
    }

    // 4. EQUIPO ASIGNADO
    if (doc_data.equipo_asignado) {
      addSection('4. EQUIPO ASIGNADO');
      const equipo = doc_data.equipo_asignado;
      
      if (equipo.resumen_equipo) addText(equipo.resumen_equipo, 10);
      if (equipo.total_camareros) addText(`Total de camareros: ${equipo.total_camareros}`, 10, true);
      if (equipo.experiencia_promedio) addText(`Experiencia: ${equipo.experiencia_promedio}`, 10);
      if (equipo.distribucion_turnos) addText(equipo.distribucion_turnos, 9);
      
      if (equipo.listado_detallado?.length > 0) {
        y += 3;
        addText('Listado del Equipo:', 10, true);
        equipo.listado_detallado.forEach((miembro, idx) => {
          addText(`${idx + 1}. ${miembro.nombre}`, 10, true, 5);
          if (miembro.rol) addText(`   Rol: ${miembro.rol}`, 9, false, 5);
          if (miembro.horario) addText(`   Horario: ${miembro.horario}`, 9, false, 5);
          if (miembro.estado) addText(`   Estado: ${miembro.estado}`, 9, false, 5);
          if (miembro.observaciones) addText(`   ${miembro.observaciones}`, 9, false, 5);
        });
      }
    }

    // 5. COORDINACIÓN
    if (doc_data.coordinacion) {
      addSection('5. COORDINACIÓN Y COMUNICACIÓN');
      const coord = doc_data.coordinacion;
      if (coord.estado_confirmaciones) addText(coord.estado_confirmaciones, 10);
      if (coord.mensajes_enviados) addText(`Mensajes enviados: ${coord.mensajes_enviados}`, 10);
      if (coord.instrucciones_especiales) addText(`Instrucciones: ${coord.instrucciones_especiales}`, 9);
      
      if (coord.puntos_contacto?.length > 0) {
        addText('Puntos de Contacto:', 10, true);
        coord.puntos_contacto.forEach(punto => {
          addText(`• ${punto}`, 9, false, 5);
        });
      }
    }

    // 6. CONSIDERACIONES OPERATIVAS
    if (doc_data.consideraciones_operativas) {
      addSection('6. CONSIDERACIONES OPERATIVAS');
      const ops = doc_data.consideraciones_operativas;
      
      if (ops.checklist_preparacion?.length > 0) {
        addText('✓ Checklist de Preparación:', 10, true);
        ops.checklist_preparacion.forEach(item => {
          addText(`☐ ${item}`, 9, false, 5);
        });
      }
      
      if (ops.puntos_criticos?.length > 0) {
        addText('⚠ Puntos Críticos:', 10, true);
        ops.puntos_criticos.forEach(punto => {
          addText(`• ${punto}`, 9, false, 5);
        });
      }
      
      if (ops.recomendaciones?.length > 0) {
        addText('💡 Recomendaciones:', 10, true);
        ops.recomendaciones.forEach(rec => {
          addText(`• ${rec}`, 9, false, 5);
        });
      }
      
      if (ops.riesgos_mitigaciones?.length > 0) {
        addText('🛡️ Riesgos y Mitigaciones:', 10, true);
        ops.riesgos_mitigaciones.forEach(riesgo => {
          addText(`• ${riesgo}`, 9, false, 5);
        });
      }
    }

    // 7. NOTAS ADICIONALES
    if (doc_data.notas_adicionales?.length > 0) {
      addSection('7. NOTAS ADICIONALES');
      doc_data.notas_adicionales.forEach(nota => {
        addText(`• ${nota}`, 9, false, 5);
      });
    }

    // Footer en todas las páginas
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${totalPages} | ${pedido.codigo_pedido || 'Sin código'} | Generado con IA`,
        105,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Guardar PDF
    const fileName = `Documentacion_${pedido.cliente}_${pedido.dia || 'sin-fecha'}.pdf`;
    doc.save(fileName);
    toast.success('PDF descargado correctamente');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Sparkles className="w-4 h-4 mr-2" />
          Documentación IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documentación Inteligente del Servicio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{pedido.cliente}</h3>
            <p className="text-sm text-slate-600">
              {pedido.dia} • {pedido.lugar_evento}
            </p>
            {pedido.codigo_pedido && (
              <p className="text-xs text-slate-500 mt-1">Código: {pedido.codigo_pedido}</p>
            )}
          </div>

          {!documentacion ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 mb-4">
                Genera una documentación completa y profesional del servicio usando IA
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Incluye resumen ejecutivo, detalles del equipo, coordinación, consideraciones operativas y más
              </p>
              <Button
                onClick={generarDocumentacion}
                disabled={generando}
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
              >
                {generando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generar Documentación
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-green-800 font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Documentación generada exitosamente
                </p>
              </div>

              {/* Vista previa de secciones */}
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto bg-white">
                <h4 className="font-semibold mb-3">Vista Previa</h4>
                
                {documentacion.documentacion.resumen_ejecutivo && (
                  <div className="mb-4">
                    <h5 className="font-medium text-sm text-slate-700 mb-1">Resumen Ejecutivo</h5>
                    <p className="text-sm text-slate-600">
                      {documentacion.documentacion.resumen_ejecutivo.vision_general?.substring(0, 200)}...
                    </p>
                  </div>
                )}

                {documentacion.documentacion.equipo_asignado && (
                  <div className="mb-4">
                    <h5 className="font-medium text-sm text-slate-700 mb-1">Equipo Asignado</h5>
                    <p className="text-sm text-slate-600">
                      Total: {documentacion.documentacion.equipo_asignado.total_camareros} camareros
                    </p>
                    <p className="text-sm text-slate-600">
                      {documentacion.documentacion.equipo_asignado.resumen_equipo?.substring(0, 150)}...
                    </p>
                  </div>
                )}

                <p className="text-xs text-slate-500 mt-4">
                  📄 La documentación completa incluye 7 secciones detalladas
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={exportarPDF}
                  className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
                <Button
                  onClick={() => {
                    setDocumentacion(null);
                    generarDocumentacion();
                  }}
                  variant="outline"
                  disabled={generando}
                >
                  {generando ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Regenerar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}