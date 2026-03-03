import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { X, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import SelectorCliente from '../crm/SelectorCliente';

export default function PedidoFormNuevo({ pedido, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    codigo_pedido: '',
    cliente: '',
    cliente_id: null,
    camisa: 'blanca',
    dia: '',
    lugar_evento: '',
    link_ubicacion: '',
    turnos: [{ cantidad_camareros: 1, entrada: '' }],
    extra_transporte: false,
    notas: ''
  });

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-codigo_pedido', 1000)
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nombre')
  });

  useEffect(() => {
    if (pedido) {
      setFormData({
        ...pedido,
        dia: pedido.dia ? pedido.dia.split('T')[0] : '',
        turnos: pedido.turnos?.length > 0 ? pedido.turnos : [{ cantidad_camareros: 1, entrada: '' }]
      });
      
      if (pedido.cliente_id) {
        const cliente = clientes.find(c => c.id === pedido.cliente_id);
        if (cliente) setClienteSeleccionado(cliente);
      }
    } else {
      // Generar código automático P001, P002, etc.
      const codigosExistentes = pedidos
        .map(p => p.codigo_pedido)
        .filter(c => c && c.startsWith('P'))
        .map(c => parseInt(c.substring(1)))
        .filter(n => !isNaN(n));
      
      const maxNumero = codigosExistentes.length > 0 ? Math.max(...codigosExistentes) : 0;
      const nuevoCodigo = `P${String(maxNumero + 1).padStart(3, '0')}`;
      
      setFormData(prev => ({
        ...prev,
        codigo_pedido: nuevoCodigo
      }));
    }
  }, [pedido, pedidos, clientes]);

  const handleSelectCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setFormData(prev => ({
      ...prev,
      cliente_id: cliente.id,
      cliente: cliente.nombre,
      // Propagar emails del cliente al pedido para que enviarParteAutomatico los encuentre
      cliente_email_1: cliente.email_1 || '',
      cliente_email_2: cliente.email_2 || '',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Calcular totales de turnos
    const cantidadTotal = (formData.turnos || []).reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0);
    const primerTurno = (formData.turnos || [])[0] || {};
    
    const dataToSubmit = {
      ...formData,
      cantidad_camareros: cantidadTotal,
      entrada: primerTurno.entrada,
    };
    
    onSubmit(dataToSubmit);
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-generar link de Google Maps cuando se escribe una dirección
      if (field === 'lugar_evento' && value && value.length > 5) {
        const encodedAddress = encodeURIComponent(value);
        newData.link_ubicacion = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      }
      
      return newData;
    });
  };

  const handleTurnoChange = (index, field, value) => {
    const newTurnos = [...formData.turnos];
    newTurnos[index] = { ...newTurnos[index], [field]: value };
    setFormData(prev => ({ ...prev, turnos: newTurnos }));
  };

  const agregarTurno = () => {
    setFormData(prev => ({
      ...prev,
      turnos: [...prev.turnos, { cantidad_camareros: 1, entrada: '' }]
    }));
  };

  const eliminarTurno = (index) => {
    if (formData.turnos.length > 1) {
      setFormData(prev => ({
        ...prev,
        turnos: prev.turnos.filter((_, i) => i !== index)
      }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/30 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[96vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-3 border-b bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8f] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{pedido ? '✏️' : '✨'}</span>
            <h2 className="text-xl font-bold text-white">
              {pedido ? 'Editar Pedido' : 'Nuevo Pedido'}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/20">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="pedido-form" onSubmit={handleSubmit} className="space-y-4 max-w-4xl mx-auto">
            {/* Código de Pedido */}
            <Card className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200">
              <Label className="text-sm font-semibold text-indigo-900 mb-2 block">Código de Pedido</Label>
              <Input
                value={formData.codigo_pedido}
                readOnly
                className="bg-white font-mono font-bold text-2xl text-indigo-900 border-2 border-indigo-300 h-12 text-center"
              />
            </Card>

            {/* Cliente */}
            <div>
              <Label className="text-sm font-semibold text-slate-800 mb-2 block">Cliente *</Label>
              <SelectorCliente 
                onSelectCliente={handleSelectCliente}
                clienteActual={clienteSeleccionado}
              />
            </div>

            {/* Camisa */}
            <div>
              <Label htmlFor="camisa" className="text-sm font-semibold text-slate-800 mb-2 block">Camisa</Label>
              <Select value={formData.camisa} onValueChange={(v) => handleChange('camisa', v)}>
                <SelectTrigger className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blanca">👕 Blanca</SelectItem>
                  <SelectItem value="negra">👔 Negra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Día del evento */}
            <div>
              <Label htmlFor="dia" className="text-sm font-semibold text-slate-800 mb-2 block">Día del Evento *</Label>
              <Input
                id="dia"
                type="date"
                value={formData.dia}
                onChange={(e) => handleChange('dia', e.target.value)}
                required
                className="h-11 text-base"
              />
            </div>

            {/* Lugar del evento */}
            <div>
              <Label htmlFor="lugar_evento" className="text-sm font-semibold text-slate-800 mb-2 block">Lugar del Evento</Label>
              <Input
                id="lugar_evento"
                value={formData.lugar_evento}
                onChange={(e) => handleChange('lugar_evento', e.target.value)}
                placeholder="Dirección completa del evento"
                className="h-11 text-base"
              />
            </div>

            {/* Link Google Maps */}
            <div>
              <Label htmlFor="link_ubicacion" className="text-sm font-semibold text-slate-800 mb-2 block">Link Google Maps</Label>
              <Input
                id="link_ubicacion"
                value={formData.link_ubicacion}
                onChange={(e) => handleChange('link_ubicacion', e.target.value)}
                placeholder="Se genera automáticamente al escribir la dirección"
                className="h-11 text-base"
              />
              {formData.link_ubicacion && (
                <a 
                  href={formData.link_ubicacion} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                >
                  Ver en Google Maps →
                </a>
              )}
            </div>

            {/* Turnos y Horarios */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold text-slate-800">Turnos y Horarios</Label>
                <Button type="button" onClick={agregarTurno} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Entrada
                </Button>
              </div>
              <div className="space-y-2">
                {formData.turnos.map((turno, index) => (
                  <Card key={index} className="p-3 bg-slate-50 border border-slate-300">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1e3a5f] text-white text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-slate-600 mb-1 block">Cantidad de Camareros</Label>
                        <Input
                          type="number"
                          min="1"
                          value={turno.cantidad_camareros || 1}
                          onChange={(e) => handleTurnoChange(index, 'cantidad_camareros', parseInt(e.target.value) || 1)}
                          className="h-10"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-slate-600 mb-1 block">Hora de Entrada</Label>
                        <Input
                          type="time"
                          value={turno.entrada}
                          onChange={(e) => handleTurnoChange(index, 'entrada', e.target.value)}
                          className="h-10"
                        />
                      </div>
                      {formData.turnos.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarTurno(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-100 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Extra Transporte */}
            <Card className="p-4 bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-3">
                <Switch
                  id="extra_transporte"
                  checked={formData.extra_transporte}
                  onCheckedChange={(v) => handleChange('extra_transporte', v)}
                />
                <Label htmlFor="extra_transporte" className="cursor-pointer text-sm font-semibold text-blue-900">
                  Extra Transporte (Catering)
                </Label>
              </div>
            </Card>

            {/* Notas */}
            <div>
              <Label htmlFor="notas" className="text-sm font-semibold text-slate-800 mb-2 block">Notas</Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => handleChange('notas', e.target.value)}
                placeholder="Información adicional, requisitos especiales..."
                rows={4}
                className="resize-none text-base"
              />
            </div>
          </form>
        </div>

        {/* Botones fijos abajo */}
        <div className="flex justify-end gap-3 px-6 py-3 border-t bg-slate-50 flex-shrink-0">
        <Button type="button" variant="outline" onClick={onCancel} className="px-6 h-9 text-sm">
          Cancelar
        </Button>
        <Button type="submit" form="pedido-form" className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8f] hover:from-[#152a45] hover:to-[#1e3a5f] text-white px-8 h-9 text-sm font-bold">
          {pedido ? '💾 Guardar' : '✨ Crear'}
        </Button>
        </div>
      </div>
    </motion.div>
  );
}