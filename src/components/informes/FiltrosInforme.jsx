import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw } from 'lucide-react';

const tiposCliente = [
  { value: 'all', label: 'Todos' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'catering', label: 'Catering' },
  { value: 'masia', label: 'Masía' }
];

export default function FiltrosInforme({ filtros, onFiltrosChange, onReset }) {
  const handleChange = (field, value) => {
    onFiltrosChange({ ...filtros, [field]: value });
  };

  return (
    <Card className="p-6 bg-white shadow-sm border-slate-100">
      <div className="flex items-center gap-2 mb-6">
        <Search className="w-5 h-5 text-[#1e3a5f]" />
        <h3 className="text-lg font-semibold text-slate-800">Filtros</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Fecha Desde</Label>
          <Input
            type="date"
            value={filtros.fechaDesde}
            onChange={(e) => handleChange('fechaDesde', e.target.value)}
            className="border-slate-200"
          />
        </div>

        <div className="space-y-2">
          <Label>Fecha Hasta</Label>
          <Input
            type="date"
            value={filtros.fechaHasta}
            onChange={(e) => handleChange('fechaHasta', e.target.value)}
            className="border-slate-200"
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo de Cliente</Label>
          <Select value={filtros.tipoCliente} onValueChange={(v) => handleChange('tipoCliente', v)}>
            <SelectTrigger className="border-slate-200">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {tiposCliente.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Cliente</Label>
          <Input
            value={filtros.cliente}
            onChange={(e) => handleChange('cliente', e.target.value)}
            placeholder="Buscar cliente..."
            className="border-slate-200"
          />
        </div>

        <div className="space-y-2">
          <Label>Coordinador</Label>
          <Input
            value={filtros.coordinador}
            onChange={(e) => handleChange('coordinador', e.target.value)}
            placeholder="Buscar coordinador..."
            className="border-slate-200"
          />
        </div>

        <div className="space-y-2">
          <Label>Camarero</Label>
          <Input
            value={filtros.camarero}
            onChange={(e) => handleChange('camarero', e.target.value)}
            placeholder="Buscar camarero..."
            className="border-slate-200"
          />
        </div>

        <div className="space-y-2">
          <Label>Estado Enviado</Label>
          <Select value={filtros.enviado} onValueChange={(v) => handleChange('enviado', v)}>
            <SelectTrigger className="border-slate-200">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Enviados</SelectItem>
              <SelectItem value="false">No enviados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Estado Confirmado</Label>
          <Select value={filtros.confirmado} onValueChange={(v) => handleChange('confirmado', v)}>
            <SelectTrigger className="border-slate-200">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Confirmados</SelectItem>
              <SelectItem value="false">No confirmados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button 
          variant="outline" 
          onClick={onReset}
          className="border-slate-200 hover:border-[#1e3a5f]"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Limpiar Filtros
        </Button>
      </div>
    </Card>
  );
}