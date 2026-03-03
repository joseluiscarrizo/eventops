import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export class ExportadorPDF {
  constructor() {
    this.pdf = new jsPDF();
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
    this.lineHeight = 7;
  }

  addHeader(titulo, subtitulo = '') {
    // Logo/Título principal
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(titulo, this.margin, this.currentY);
    this.currentY += 10;

    if (subtitulo) {
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(100);
      this.pdf.text(subtitulo, this.margin, this.currentY);
      this.currentY += 8;
    }

    // Línea separadora
    this.pdf.setDrawColor(30, 58, 95);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;
    this.pdf.setTextColor(0);
  }

  addSection(titulo) {
    this.checkPageBreak(15);
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(30, 58, 95);
    this.pdf.text(titulo, this.margin, this.currentY);
    this.currentY += 8;
    this.pdf.setTextColor(0);
  }

  addKeyValue(key, value, bold = false) {
    this.checkPageBreak();
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(`${key}:`, this.margin, this.currentY);
    this.pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    this.pdf.text(String(value), this.margin + 50, this.currentY);
    this.currentY += this.lineHeight;
  }

  addTable(headers, rows, columnWidths = null) {
    const startX = this.margin;
    const tableWidth = this.pageWidth - 2 * this.margin;
    
    // Calcular anchos de columna automáticamente si no se proporcionan
    const colWidths = columnWidths || headers.map(() => tableWidth / headers.length);
    
    // Verificar espacio suficiente
    this.checkPageBreak(20);

    // Dibujar encabezados
    this.pdf.setFillColor(30, 58, 95);
    this.pdf.rect(startX, this.currentY - 5, tableWidth, 8, 'F');
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(255, 255, 255);
    
    let currentX = startX + 2;
    headers.forEach((header, i) => {
      this.pdf.text(header, currentX, this.currentY);
      currentX += colWidths[i];
    });
    
    this.currentY += 10;
    this.pdf.setTextColor(0);
    this.pdf.setFont('helvetica', 'normal');

    // Dibujar filas
    rows.forEach((row, rowIndex) => {
      this.checkPageBreak();
      
      // Alternar color de fondo
      if (rowIndex % 2 === 0) {
        this.pdf.setFillColor(248, 250, 252);
        this.pdf.rect(startX, this.currentY - 5, tableWidth, 7, 'F');
      }
      
      currentX = startX + 2;
      row.forEach((cell, i) => {
        const text = String(cell || '-');
        this.pdf.text(text.substring(0, 25), currentX, this.currentY);
        currentX += colWidths[i];
      });
      
      this.currentY += 7;
    });

    this.currentY += 5;
  }

  addStats(stats) {
    this.checkPageBreak(40);
    
    const boxWidth = (this.pageWidth - 2 * this.margin - 20) / 3;
    const boxHeight = 25;
    let currentX = this.margin;

    stats.forEach((stat, index) => {
      if (index > 0 && index % 3 === 0) {
        this.currentY += boxHeight + 5;
        currentX = this.margin;
      }

      // Caja de estadística
      this.pdf.setFillColor(248, 250, 252);
      this.pdf.roundedRect(currentX, this.currentY, boxWidth, boxHeight, 3, 3, 'F');
      this.pdf.setDrawColor(226, 232, 240);
      this.pdf.roundedRect(currentX, this.currentY, boxWidth, boxHeight, 3, 3, 'S');

      // Label
      this.pdf.setFontSize(8);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(100);
      this.pdf.text(stat.label, currentX + 5, this.currentY + 8);

      // Valor
      this.pdf.setFontSize(16);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(0);
      this.pdf.text(String(stat.value), currentX + 5, this.currentY + 18);

      currentX += boxWidth + 10;
    });

    this.currentY += boxHeight + 10;
    this.pdf.setTextColor(0);
  }

  addText(text, size = 10, bold = false) {
    this.checkPageBreak();
    this.pdf.setFontSize(size);
    this.pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = this.pdf.splitTextToSize(text, this.pageWidth - 2 * this.margin);
    lines.forEach(line => {
      this.checkPageBreak();
      this.pdf.text(line, this.margin, this.currentY);
      this.currentY += this.lineHeight;
    });
  }

  addFooter() {
    const pageCount = this.pdf.internal.getNumberOfPages();
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(150);
    
    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i);
      this.pdf.text(
        `Página ${i} de ${pageCount} - Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`,
        this.margin,
        this.pageHeight - 10
      );
    }
    this.pdf.setTextColor(0);
  }

  checkPageBreak(spaceNeeded = 10) {
    if (this.currentY + spaceNeeded > this.pageHeight - this.margin) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }
  }

  save(filename) {
    this.addFooter();
    this.pdf.save(filename);
  }

  // Métodos específicos para informes

  static generarInformeRendimiento(datos, filename = 'informe_rendimiento.pdf') {
    const pdf = new ExportadorPDF();
    
    pdf.addHeader(
      'Informe de Rendimiento de Camareros',
      `Período: ${datos.fechaInicio} a ${datos.fechaFin}`
    );

    // Estadísticas globales
    pdf.addSection('Resumen General');
    pdf.addStats([
      { label: 'Total Horas', value: `${datos.totalHoras}h` },
      { label: 'Promedio/Camarero', value: `${datos.promedioHoras}h` },
      { label: 'Total Asignaciones', value: datos.totalAsignaciones },
      { label: 'Tasa Confirmación', value: `${datos.tasaGlobal}%` }
    ]);

    // Tabla de rendimiento
    pdf.addSection('Detalle por Camarero');
    const headers = ['Nombre', 'Pedidos', 'Horas', 'Confirmados', 'Tasa'];
    const rows = datos.camareros.map(c => [
      c.nombre,
      c.pedidosAsignados,
      `${c.horasTrabajadas.toFixed(1)}h`,
      c.confirmados,
      `${c.tasaConfirmacion}%`
    ]);
    pdf.addTable(headers, rows, [70, 30, 30, 30, 30]);

    pdf.save(filename);
  }

  static generarInformeCamarero(datos, filename = 'informe_camarero.pdf') {
    const pdf = new ExportadorPDF();
    
    pdf.addHeader(
      `Informe de Camarero: ${datos.nombre}`,
      `Código: ${datos.codigo || 'Sin código'}`
    );

    // Resumen
    pdf.addSection('Resumen');
    pdf.addStats([
      { label: 'Total Eventos', value: datos.totalEventos },
      { label: 'Total Horas', value: `${datos.totalHoras}h` }
    ]);

    // Historial de eventos
    pdf.addSection('Historial de Eventos');
    const headers = ['Fecha', 'Cliente', 'Lugar', 'Horas'];
    const rows = datos.eventos.map(e => [
      e.fecha,
      e.cliente,
      e.lugar.substring(0, 25),
      `${e.horas}h`
    ]);
    pdf.addTable(headers, rows, [40, 50, 60, 30]);

    pdf.save(filename);
  }

  static generarInformeCliente(datos, filename = 'informe_cliente.pdf') {
    const pdf = new ExportadorPDF();
    
    pdf.addHeader(
      `Informe de Cliente: ${datos.cliente}`,
      `Lugar: ${datos.lugar}`
    );

    // Información del evento
    pdf.addSection('Información del Evento');
    pdf.addKeyValue('Fecha', datos.fecha);
    pdf.addKeyValue('Total Camareros', datos.totalCamareros, true);
    pdf.addKeyValue('Total Horas', `${datos.totalHoras}h`, true);

    // Detalle de turnos
    pdf.addSection('Detalle de Turnos');
    const headers = ['Turno', 'Camareros', 'Entrada', 'Salida', 'Horas', 'Total Horas'];
    const rows = datos.turnos.map((t, i) => [
      `Turno ${i + 1}`,
      t.cantidad,
      t.entrada,
      t.salida,
      `${t.horas}h`,
      `${t.total}h`
    ]);
    pdf.addTable(headers, rows, [30, 30, 25, 25, 25, 30]);

    pdf.save(filename);
  }

  static generarInformePeriodo(datos, filename = 'informe_periodo.pdf') {
    const pdf = new ExportadorPDF();
    
    pdf.addHeader(
      'Informe Resumen por Período',
      `${datos.periodo} - ${datos.fechaInicio} a ${datos.fechaFin}`
    );

    // Estadísticas
    pdf.addSection('Estadísticas del Período');
    pdf.addStats([
      { label: 'Pedidos', value: datos.totalPedidos },
      { label: 'Camareros', value: datos.totalCamareros },
      { label: 'Horas', value: `${datos.totalHoras}h` },
      { label: 'Confirmados', value: datos.confirmados },
      { label: 'Enviados', value: datos.enviados },
      { label: 'Pendientes', value: datos.pendientes }
    ]);

    // Resumen por cliente
    pdf.addSection('Resumen por Cliente');
    const headers = ['Cliente', 'Pedidos', 'Camareros', 'Horas'];
    const rows = datos.porCliente.slice(0, 15).map(c => [
      c.cliente,
      c.pedidos,
      c.camareros,
      `${c.horas.toFixed(1)}h`
    ]);
    pdf.addTable(headers, rows, [70, 30, 30, 30]);

    pdf.save(filename);
  }
}