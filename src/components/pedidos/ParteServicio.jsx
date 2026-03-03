import { useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';

export default function ParteServicio({ pedido, open, onOpenChange }) {
  const parteRef = useRef(null);

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones-parte', pedido?.id],
    queryFn: () => base44.entities.AsignacionCamarero.filter({ pedido_id: pedido.id }),
    enabled: !!pedido?.id && open,
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros-parte'],
    queryFn: () => base44.entities.Camarero.list('nombre', 200),
    enabled: open,
  });

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores-parte'],
    queryFn: () => base44.entities.Coordinador.list('nombre'),
    enabled: open,
  });

  if (!pedido) return null;

  const camareroMap = Object.fromEntries(camareros.map(c => [c.id, c]));

  // Construir filas: una por slot (posicion en turno)
  const filas = [];
  const turnos = pedido.turnos && pedido.turnos.length > 0
    ? pedido.turnos
    : [{ cantidad_camareros: pedido.cantidad_camareros || 1, entrada: pedido.entrada || '', salida: pedido.salida || '' }];

  let numeroGlobal = 1;
  turnos.forEach((turno, turnoIdx) => {
    const cantidad = turno.cantidad_camareros || 1;
    for (let i = 0; i < cantidad; i++) {
      // Buscar asignación para este slot
      let asig = asignaciones.find(a =>
        a.turno_index === turnoIdx && a.posicion_slot === i
      );
      if (!asig) {
        const asigsPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
        asig = asigsPedido[numeroGlobal - 1];
      }
      const cam = asig ? camareroMap[asig.camarero_id] : null;
      filas.push({
        num: numeroGlobal,
        codigo: cam?.codigo || asig?.camarero_codigo || '',
        perfil: cam?.nombre || asig?.camarero_nombre || '',
        horaEntrada: turno.entrada || asig?.hora_entrada || '',
        horaSalida: '',
        observaciones: '',
      });
      numeroGlobal++;
    }
  });

  // Hora del evento (primera entrada)
  const horaEvento = turnos[0]?.entrada || pedido.entrada || '';

  const fechaFormateada = pedido.dia
    ? format(parseISO(pedido.dia), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    : '';

  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297;
    const pageH = 210;
    const margin = 14;
    const colW = pageW - margin * 2;
    let y = 14;

    // ---- ENCABEZADO ----
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('PARTE DE SERVICIO', pageW / 2, 12, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y = 26;

    // ---- INFO CABECERA en dos columnas ----
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const labelW = 32;
    const col1X = margin;
    const col2X = pageW / 2 + 5;

    // Columna izquierda
    const infoLeft = [
      ['CLIENTE:', pedido.cliente || ''],
      ['EVENTO:', fechaFormateada],
      ['HORA EVENTO:', horaEvento || '—'],
    ];
    let yLeft = y;
    infoLeft.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, col1X, yLeft);
      doc.setFont('helvetica', 'normal');
      doc.text(val, col1X + labelW, yLeft);
      yLeft += 5.5;
    });

    // Columna derecha
    doc.setFont('helvetica', 'bold');
    doc.text('COORDINADOR:', col2X, y);
    doc.setFont('helvetica', 'normal');
    doc.text(coordinadores[0]?.nombre || '—', col2X + labelW + 2, y);

    y = Math.max(yLeft, y + 5.5) + 2;

    // Dirección (ancho completo)
    doc.setFont('helvetica', 'bold');
    doc.text('DIRECCIÓN:', margin, y);
    doc.setFont('helvetica', 'normal');
    const dirLines = doc.splitTextToSize(pedido.lugar_evento || pedido.direccion_completa || '—', colW - labelW);
    doc.text(dirLines, margin + labelW, y);
    y += dirLines.length * 5 + 4;

    // Línea separadora
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    // ---- TABLA (más ancha en landscape) ----
    const cols = [
      { label: 'Nº', w: 8 },
      { label: 'Código', w: 20 },
      { label: 'Perfil / Nombre', w: 72 },
      { label: 'H. Entrada', w: 25 },
      { label: 'H. Salida', w: 25 },
      { label: 'Observaciones', w: 65 },
      { label: 'Firma', w: 54 },
    ];

    // Cabecera tabla
    doc.setFillColor(30, 58, 95);
    doc.rect(margin, y, colW, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    let cx = margin + 1;
    cols.forEach(col => {
      doc.text(col.label, cx, y + 5);
      cx += col.w;
    });
    doc.setTextColor(0, 0, 0);
    y += 7;

    // Filas
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    filas.forEach((fila, idx) => {
      const rowH = 9;
      const bg = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
      doc.setFillColor(...bg);
      doc.rect(margin, y, colW, rowH, 'F');
      doc.setDrawColor(200, 200, 210);
      doc.setLineWidth(0.2);
      doc.rect(margin, y, colW, rowH);

      const vals = [
        fila.num,
        fila.codigo,
        fila.perfil || '—',
        fila.horaEntrada || '—',
        fila.horaSalida,
        fila.observaciones,
        '',
      ];
      cx = margin + 1;
      cols.forEach((col, ci) => {
        const txt = String(vals[ci] ?? '');
        doc.text(txt, cx, y + 5.5);
        cx += col.w;
      });
      // Líneas verticales internas
      let lx = margin;
      cols.forEach(col => {
        lx += col.w;
        doc.setDrawColor(200, 200, 210);
        doc.line(lx, y, lx, y + rowH);
      });
      y += rowH;
    });

    // Añadir filas vacías si hay menos de 12 (más espacio en landscape)
    const filasVacias = Math.max(0, 12 - filas.length);
    for (let i = 0; i < filasVacias; i++) {
      const rowH = 9;
      const bg = (filas.length + i) % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
      doc.setFillColor(...bg);
      doc.rect(margin, y, colW, rowH, 'F');
      doc.setDrawColor(200, 200, 210);
      doc.setLineWidth(0.2);
      doc.rect(margin, y, colW, rowH);
      let lx = margin;
      cols.forEach(col => {
        lx += col.w;
        doc.line(lx, y, lx, y + rowH);
      });
      y += rowH;
    }

    y += 8;

    // ---- PIE ----
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('POR FAVOR ENVIAR UNA CAPTURA AL COORDINADOR O CHAT DEL SERVICIO', pageW / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(11);
    doc.text('GRACIAS', pageW / 2, y, { align: 'center' });

    doc.save(`ParteServicio_${pedido.cliente}_${pedido.dia || ''}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <FileText className="w-5 h-5" />
            Parte de Servicio
          </DialogTitle>
        </DialogHeader>

        {/* Vista previa estilo PDF */}
        <div className="px-6 py-4">
          <div ref={parteRef} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden font-sans text-sm">

            {/* Cabecera azul */}
            <div className="bg-[#1e3a5f] text-white text-center py-3 font-bold text-base tracking-wide">
              PARTE DE SERVICIO
            </div>

            {/* Info evento */}
            <div className="px-5 py-3 border-b border-slate-200 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
              <div className="space-y-1">
                <div className="flex gap-2">
                  <span className="font-bold text-slate-600 min-w-[90px]">CLIENTE:</span>
                  <span className="text-slate-800 font-semibold">{pedido.cliente}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-slate-600 min-w-[90px]">EVENTO:</span>
                  <span className="text-slate-800">{fechaFormateada}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-slate-600 min-w-[90px]">HORA EVENTO:</span>
                  <span className="text-slate-800">{horaEvento || '—'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex gap-2">
                  <span className="font-bold text-slate-600 min-w-[90px]">COORDINADOR:</span>
                  <span className="text-slate-800">{coordinadores[0]?.nombre || '—'}</span>
                </div>
              </div>
              <div className="col-span-2 flex gap-2 mt-1">
                <span className="font-bold text-slate-600 min-w-[90px]">DIRECCIÓN:</span>
                <span className="text-slate-800">{pedido.lugar_evento || pedido.direccion_completa || '—'}</span>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="bg-[#1e3a5f] text-white">
                    <th className="px-2 py-2 text-left font-semibold w-8">Nº</th>
                    <th className="px-2 py-2 text-left font-semibold w-16">Código</th>
                    <th className="px-2 py-2 text-left font-semibold">Perfil / Nombre</th>
                    <th className="px-2 py-2 text-left font-semibold w-20">H. Entrada</th>
                    <th className="px-2 py-2 text-left font-semibold w-20">H. Salida</th>
                    <th className="px-2 py-2 text-left font-semibold w-28">Observaciones</th>
                    <th className="px-2 py-2 text-left font-semibold w-20">Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {(filas.length > 0 ? filas : []).map((fila, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="px-2 py-2 border border-slate-200 text-center font-semibold text-[#1e3a5f]">{fila.num}</td>
                      <td className="px-2 py-2 border border-slate-200 font-mono">{fila.codigo || '—'}</td>
                      <td className="px-2 py-2 border border-slate-200 font-medium">{fila.perfil || '—'}</td>
                      <td className="px-2 py-2 border border-slate-200 text-center">{fila.horaEntrada || '—'}</td>
                      <td className="px-2 py-2 border border-slate-200"></td>
                      <td className="px-2 py-2 border border-slate-200"></td>
                      <td className="px-2 py-2 border border-slate-200"></td>
                    </tr>
                  ))}
                  {/* Filas vacías hasta completar 8 */}
                  {Array.from({ length: Math.max(0, 8 - filas.length) }).map((_, i) => (
                    <tr key={`empty-${i}`} className={(filas.length + i) % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="px-2 py-2 border border-slate-200 text-center text-slate-400">{filas.length + i + 1}</td>
                      <td className="px-2 py-2 border border-slate-200"></td>
                      <td className="px-2 py-2 border border-slate-200"></td>
                      <td className="px-2 py-2 border border-slate-200"></td>
                      <td className="px-2 py-2 border border-slate-200"></td>
                      <td className="px-2 py-2 border border-slate-200"></td>
                      <td className="px-2 py-2 border border-slate-200"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pie */}
            <div className="px-5 py-4 text-center space-y-1 border-t border-slate-200 mt-1">
              <p className="font-bold text-[#1e3a5f] text-[13px] uppercase tracking-wide">
                POR FAVOR ENVIAR UNA CAPTURA AL COORDINADOR O CHAT DEL SERVICIO
              </p>
              <p className="font-bold text-slate-700 text-base">GRACIAS</p>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="px-6 pb-5 flex gap-3 justify-end border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button onClick={exportarPDF} className="bg-[#1e3a5f] hover:bg-[#152a45] text-white">
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}