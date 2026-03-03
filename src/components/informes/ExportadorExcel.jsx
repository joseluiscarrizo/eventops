import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Genera y descarga un archivo Excel (.xlsx) sin dependencias externas,
 * usando el formato XML SpreadsheetML (compatible con Excel y LibreOffice).
 */
function escapeXml(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildXlsx(sheets) {
  // sheets = [{ name, headers, rows, boldFirstRow }]
  const sheetsXml = sheets.map(({ name, headers, rows }) => {
    const headerRow = headers.map(h =>
      `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
    ).join('');

    const dataRows = rows.map(row => {
      const cells = row.map(cell => {
        const isNum = typeof cell === 'number' || (!isNaN(cell) && cell !== '' && cell !== null && cell !== undefined);
        const type = isNum ? 'Number' : 'String';
        return `<Cell><Data ss:Type="${type}">${escapeXml(isNum ? cell : cell)}</Data></Cell>`;
      }).join('');
      return `<Row>${cells}</Row>`;
    }).join('');

    return `<Worksheet ss:Name="${escapeXml(name)}">
      <Table>
        <Row>${headerRow}</Row>
        ${dataRows}
      </Table>
    </Worksheet>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1e3a5f" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  ${sheetsXml}
</Workbook>`;
}

function download(xml, filename) {
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const ExportadorExcel = {
  exportarResumenPeriodo(pedidosFiltrados, stats, datosPorCliente, periodo, fechaInicio, fechaFin) {
    const filename = `resumen_${periodo}_${format(new Date(), 'yyyy-MM-dd')}.xls`;

    const sheets = [
      {
        name: 'Resumen',
        headers: ['Métrica', 'Valor'],
        rows: [
          ['Período', periodo],
          ['Desde', fechaInicio],
          ['Hasta', fechaFin],
          ['Total Pedidos', stats.totalPedidos],
          ['Total Camareros', stats.totalCamareros],
          ['Total Horas', stats.totalHoras.toFixed(1)],
          ['Confirmados', stats.confirmados],
          ['Enviados', stats.enviados],
          ['Pendientes', stats.pendientes],
          ['Tasa Confirmación (%)', stats.tasaConfirmacion],
        ]
      },
      {
        name: 'Pedidos',
        headers: ['Fecha', 'Cliente', 'Lugar', 'Camareros', 'Horas', 'Entrada', 'Salida'],
        rows: pedidosFiltrados.map(p => [
          p.dia, p.cliente, p.lugar_evento, p.cantidad_camareros, p.t_horas, p.entrada, p.salida
        ])
      },
      {
        name: 'Por Cliente',
        headers: ['Cliente', 'Pedidos', 'Camareros', 'Horas Totales'],
        rows: datosPorCliente.map(c => [c.cliente, c.pedidos, c.camareros, Number(c.horas.toFixed(1))])
      }
    ];

    download(buildXlsx(sheets), filename);
  },

  exportarRendimientoCamareros(rendimientoFiltrado, statsGlobales, fechaInicio, fechaFin) {
    const filename = `rendimiento_camareros_${format(new Date(), 'yyyy-MM-dd')}.xls`;

    const sheets = [
      {
        name: 'Resumen',
        headers: ['Métrica', 'Valor'],
        rows: [
          ['Desde', fechaInicio],
          ['Hasta', fechaFin],
          ['Total Horas', Number(statsGlobales.totalHoras.toFixed(1))],
          ['Promedio Horas/Camarero', Number(statsGlobales.promedioHoras.toFixed(1))],
          ['Total Asignaciones', statsGlobales.totalPedidos],
          ['Tasa Confirmación (%)', statsGlobales.tasaGlobal],
        ]
      },
      {
        name: 'Rendimiento',
        headers: ['Código', 'Nombre', 'Especialidad', 'Pedidos', 'Horas', 'Confirmados', 'Enviados', 'Alta', 'Pendientes', 'Tasa Confirm. (%)'],
        rows: rendimientoFiltrado.map(r => [
          r.codigo, r.nombre, r.especialidad, r.pedidosAsignados,
          Number(r.horasTrabajadas.toFixed(1)), r.confirmados, r.enviados, r.altas, r.pendientes, r.tasaConfirmacion
        ])
      }
    ];

    download(buildXlsx(sheets), filename);
  },

  exportarDisponibilidad(estadisticas, fechaInicio, fechaFin) {
    const filename = `disponibilidad_${fechaInicio}_${fechaFin}.xls`;

    const sheets = [
      {
        name: 'Disponibilidad',
        headers: ['Camarero', 'Código', 'Días Disponibles', 'Días No Disponibles', 'Parciales', 'Vacaciones', 'Bajas', 'Tasa Disponibilidad (%)'],
        rows: estadisticas.map(e => [
          e.nombre, e.codigo, e.disponibles, e.noDisponibles, e.parciales, e.vacaciones, e.bajas, e.tasaDisponibilidad
        ])
      }
    ];

    download(buildXlsx(sheets), filename);
  },

  exportarInformeCliente(pedido, datosInforme, selectedCliente) {
    const filename = `informe_cliente_${selectedCliente}_${datosInforme.dia}.xls`;

    const turnosRows = datosInforme.turnos.length > 0
      ? datosInforme.turnos.map((t, i) => [
          `Turno ${i + 1}`,
          t.cantidad_camareros || 0,
          t.entrada || '-',
          t.salida || '-',
          t.t_horas || 0,
          Number(((t.t_horas || 0) * (t.cantidad_camareros || 0)).toFixed(2))
        ])
      : [[
          'Único',
          pedido.cantidad_camareros || 0,
          pedido.entrada || '-',
          pedido.salida || '-',
          pedido.t_horas || 0,
          Number(datosInforme.total_horas.toFixed(2))
        ]];

    const sheets = [
      {
        name: 'Informe Cliente',
        headers: ['Turno', 'Camareros', 'Entrada', 'Salida', 'Horas', 'Total Horas'],
        rows: turnosRows
      },
      {
        name: 'Resumen',
        headers: ['Campo', 'Valor'],
        rows: [
          ['Cliente', pedido.cliente],
          ['Lugar', pedido.lugar_evento || '-'],
          ['Día', datosInforme.dia ? format(new Date(datosInforme.dia), 'dd/MM/yyyy', { locale: es }) : '-'],
          ['Total Camareros', datosInforme.cantidad_camareros],
          ['Total Horas', Number(datosInforme.total_horas.toFixed(2))],
        ]
      }
    ];

    download(buildXlsx(sheets), filename);
  },

  exportarInformeCamarero(camarero, asignacionesCamarero, totalEventos, totalHoras) {
    const filename = `informe_camarero_${camarero.nombre.replace(/\s/g, '_')}.xls`;

    const sheets = [
      {
        name: 'Resumen',
        headers: ['Campo', 'Valor'],
        rows: [
          ['Camarero', camarero.nombre],
          ['Código', camarero.codigo || '-'],
          ['Total Eventos', totalEventos],
          ['Total Horas', Number(totalHoras.toFixed(2))],
        ]
      },
      {
        name: 'Historial Eventos',
        headers: ['Día', 'Cliente', 'Lugar del Evento', 'Horas'],
        rows: asignacionesCamarero.map(a => [
          a.dia ? format(new Date(a.dia), 'dd/MM/yyyy', { locale: es }) : '-',
          a.cliente || '-',
          a.lugar_evento || '-',
          Number(a.horas.toFixed(2))
        ])
      }
    ];

    download(buildXlsx(sheets), filename);
  }
};