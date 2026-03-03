import { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExcelHandler({ pedidos, onImport }) {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const exportToCSV = () => {
    const headers = [
      'Coordinador', 'Día', 'Cliente', 'Tipo Cliente', 'Lugar Evento', 
      'Camisa', 'Cód. Camarero', 'Camarero', 'Entrada', 'Salida', 
      'Total Horas', 'Enviado', 'Confirmado', 'Notas'
    ];
    
    const rows = pedidos.map(p => [
      p.coordinador || '',
      p.dia || '',
      p.cliente || '',
      p.tipo_cliente || '',
      p.lugar_evento || '',
      p.camisa || '',
      p.cod_camarero || '',
      p.camarero || '',
      p.entrada || '',
      p.salida || '',
      p.t_horas || 0,
      p.enviado ? 'Sí' : 'No',
      p.confirmado ? 'Sí' : 'No',
      p.notas || ''
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pedidos_camareros_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(';').map(h => h.replace(/"/g, '').trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.replace(/"/g, '').trim());
      const row = {};
      
      headers.forEach((header, idx) => {
        const value = values[idx] || '';
        const headerLower = header.toLowerCase();
        
        if (headerLower.includes('coordinador')) row.coordinador = value;
        else if (headerLower.includes('día') || headerLower.includes('dia')) row.dia = value;
        else if (headerLower.includes('cliente') && !headerLower.includes('tipo')) row.cliente = value;
        else if (headerLower.includes('tipo')) row.tipo_cliente = value;
        else if (headerLower.includes('lugar')) row.lugar_evento = value;
        else if (headerLower.includes('camisa')) row.camisa = value;
        else if (headerLower.includes('cód') || headerLower.includes('cod')) row.cod_camarero = value;
        else if (headerLower.includes('camarero')) row.camarero = value;
        else if (headerLower.includes('entrada')) row.entrada = value;
        else if (headerLower.includes('salida')) row.salida = value;
        else if (headerLower.includes('horas')) row.t_horas = parseFloat(value) || 0;
        else if (headerLower.includes('enviado')) row.enviado = value.toLowerCase() === 'sí' || value.toLowerCase() === 'si' || value === 'true';
        else if (headerLower.includes('confirmado')) row.confirmado = value.toLowerCase() === 'sí' || value.toLowerCase() === 'si' || value === 'true';
        else if (headerLower.includes('notas')) row.notas = value;
      });

      if (row.cliente || row.camarero) {
        data.push(row);
      }
    }

    return data;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    
    // Solo aceptar CSV
    if (!fileName.endsWith('.csv')) {
      toast.error('Por favor, sube un archivo CSV. Los archivos Excel (.xlsx) no son compatibles.');
      e.target.value = '';
      return;
    }

    setIsLoading(true);

    try {
      // Leer el archivo CSV directamente
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length > 0) {
        onImport(data);
        toast.success(`${data.length} registros importados`);
      } else {
        toast.error('No se encontraron datos válidos en el archivo');
      }
    } catch (error) {
      console.error('Error importing file:', error);
      toast.error('Error al procesar el archivo');
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv"
        className="hidden"
      />
      <Button 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="border-slate-200 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        Importar CSV
      </Button>
      <Button 
        variant="outline" 
        onClick={exportToCSV}
        className="border-slate-200 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
      >
        <Download className="w-4 h-4 mr-2" />
        Exportar
      </Button>
    </div>
  );
}