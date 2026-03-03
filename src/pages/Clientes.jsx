import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Pencil, Mail, Phone, Search, Trash2, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function Clientes() {
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    coordinador_codigo: '',
    coordinador_nombre: '',
    email_1: '',
    email_2: '',
    telefono_1: '',
    telefono_2: '',
    persona_contacto_1: '',
    persona_contacto_2: '',
    notas: '',
    activo: true
  });

  const queryClient = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date')
  });

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores'],
    queryFn: () => base44.entities.Coordinador.list('nombre')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setShowForm(false);
      resetForm();
      toast.success('Cliente creado');
    },
    onError: (error) => {
      console.error('Error al crear cliente:', error);
      toast.error('Error al crear cliente: ' + (error.message || 'Error desconocido'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setShowForm(false);
      resetForm();
      toast.success('Cliente actualizado');
    },
    onError: (error) => {
      console.error('Error al actualizar cliente:', error);
      toast.error('Error al actualizar cliente: ' + (error.message || 'Error desconocido'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente eliminado');
    },
    onError: (error) => {
      console.error('Error al eliminar cliente:', error);
      toast.error('Error al eliminar cliente');
    }
  });

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      coordinador_codigo: '',
      coordinador_nombre: '',
      email_1: '',
      email_2: '',
      telefono_1: '',
      telefono_2: '',
      persona_contacto_1: '',
      persona_contacto_2: '',
      notas: '',
      activo: true
    });
    setEditingCliente(null);
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData(cliente);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let dataToSubmit = { ...formData };
    
    // Generar código automático si es nuevo cliente
    if (!editingCliente) {
      const maxCodigo = clientes.reduce((max, c) => {
        if (c.codigo && c.codigo.startsWith('CL')) {
          const num = parseInt(c.codigo.substring(2));
          return Math.max(max, isNaN(num) ? 0 : num);
        }
        return max;
      }, 0);
      dataToSubmit.codigo = `CL${String(maxCodigo + 1).padStart(3, '0')}`;
    }
    
    // Asegurar que activo está definido
    if (dataToSubmit.activo === undefined) {
      dataToSubmit.activo = true;
    }
    
    console.log('Enviando datos:', dataToSubmit);
    
    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const exportarExcel = () => {
    const headers = ['Código', 'Nombre', 'Email 1', 'Email 2', 'Teléfono 1', 'Teléfono 2', 'Contacto 1', 'Contacto 2', 'Coordinador', 'Estado', 'Notas'];
    const rows = clientesFiltrados.map(c => [
      c.codigo || '',
      c.nombre || '',
      c.email_1 || '',
      c.email_2 || '',
      c.telefono_1 || '',
      c.telefono_2 || '',
      c.persona_contacto_1 || '',
      c.persona_contacto_2 || '',
      c.coordinador_nombre || '',
      c.activo ? 'Activo' : 'Inactivo',
      c.notas || ''
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportado correctamente');
  };

  const importarExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('El archivo está vacío o no tiene datos'); return; }
      const rows = lines.slice(1); // saltar cabecera
      let creados = 0;
      const maxCodigo = clientes.reduce((max, c) => {
        if (c.codigo && c.codigo.startsWith('CL')) {
          const num = parseInt(c.codigo.substring(2));
          return Math.max(max, isNaN(num) ? 0 : num);
        }
        return max;
      }, 0);
      let counter = maxCodigo + 1;
      for (const row of rows) {
        const cols = row.split(',').map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
        const nombre = cols[1] || cols[0]; // si solo hay nombre en col 0
        if (!nombre) continue;
        await base44.entities.Cliente.create({
          codigo: cols[0] && cols[0].startsWith('CL') ? cols[0] : `CL${String(counter++).padStart(3, '0')}`,
          nombre,
          email_1: cols[2] || '',
          email_2: cols[3] || '',
          telefono_1: cols[4] || '',
          telefono_2: cols[5] || '',
          persona_contacto_1: cols[6] || '',
          persona_contacto_2: cols[7] || '',
          coordinador_nombre: cols[8] || '',
          activo: cols[9] !== 'Inactivo',
          notas: cols[10] || ''
        });
        creados++;
      }
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success(`${creados} clientes importados correctamente`);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.email_1?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.email_2?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono_1?.includes(busqueda) ||
    c.telefono_2?.includes(busqueda)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Users className="w-8 h-8 text-[#1e3a5f]" />
              Gestión de Clientes
            </h1>
            <p className="text-slate-500 mt-1">Administra la base de datos de clientes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportarExcel} className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <label>
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 cursor-pointer" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                  <input type="file" accept=".csv" className="hidden" onChange={importarExcel} />
                </span>
              </Button>
            </label>
            <Button 
              onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Cliente
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Clientes</p>
            <p className="text-2xl font-bold text-slate-800">{clientes.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Clientes Activos</p>
            <p className="text-2xl font-bold text-emerald-600">
              {clientes.filter(c => c.activo).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Clientes Inactivos</p>
            <p className="text-2xl font-bold text-slate-400">
              {clientes.filter(c => !c.activo).length}
            </p>
          </Card>
        </div>

        <Card className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por código, nombre, email o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesFiltrados.map(cliente => (
                <TableRow key={cliente.id}>
                  <TableCell>
                    <span className="font-mono font-semibold text-[#1e3a5f]">
                      {cliente.codigo || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-800">{cliente.nombre}</p>
                      {cliente.notas && (
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">
                          {cliente.notas}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{cliente.email_1 || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{cliente.telefono_1 || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{cliente.persona_contacto_1 || '-'}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cliente.activo 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-slate-100 text-slate-600'
                    }>
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(cliente)}
                        className="h-8 w-8"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará el cliente <strong>{cliente.nombre}</strong>. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(cliente.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {clientesFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                    No se encontraron clientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Código Automático */}
              {!editingCliente && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Label className="text-xs text-slate-500">Código Automático del Cliente</Label>
                  <p className="font-mono font-semibold text-lg text-[#1e3a5f]">
                    {(() => {
                      const maxCodigo = clientes.reduce((max, c) => {
                        if (c.codigo && c.codigo.startsWith('CL')) {
                          const num = parseInt(c.codigo.substring(2));
                          return Math.max(max, num);
                        }
                        return max;
                      }, 0);
                      return `CL${String(maxCodigo + 1).padStart(3, '0')}`;
                    })()}
                  </p>
                </div>
              )}

              {editingCliente && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Label className="text-xs text-slate-500">Código del Cliente</Label>
                  <p className="font-mono font-semibold text-lg text-[#1e3a5f]">
                    {formData.codigo}
                  </p>
                </div>
              )}

              {/* Nombre del Cliente */}
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Cliente *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              {/* Coordinador */}
              <div className="space-y-2">
                <Label>Coordinador</Label>
                <div className="flex items-center gap-3">
                  <Select
                    value={formData.coordinador_codigo || ''}
                    onValueChange={(val) => {
                      const coord = coordinadores.find(c => c.codigo === val);
                      setFormData({
                        ...formData,
                        coordinador_codigo: coord?.codigo || '',
                        coordinador_nombre: coord?.nombre || ''
                      });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccionar coordinador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {coordinadores.map(c => (
                        <SelectItem key={c.id} value={c.codigo}>
                          {c.codigo} — {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.coordinador_codigo && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-md text-sm text-slate-700 whitespace-nowrap">
                      <span className="font-mono font-semibold text-[#1e3a5f]">{formData.coordinador_codigo}</span>
                      <span className="text-slate-500">·</span>
                      <span>{formData.coordinador_nombre}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Emails */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email_1">Mail 1</Label>
                  <Input
                    id="email_1"
                    type="email"
                    value={formData.email_1}
                    onChange={(e) => setFormData({ ...formData, email_1: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_2">Mail 2</Label>
                  <Input
                    id="email_2"
                    type="email"
                    value={formData.email_2}
                    onChange={(e) => setFormData({ ...formData, email_2: e.target.value })}
                  />
                </div>
              </div>

              {/* Teléfonos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono_1">Teléfono 1</Label>
                  <Input
                    id="telefono_1"
                    value={formData.telefono_1}
                    onChange={(e) => setFormData({ ...formData, telefono_1: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono_2">Teléfono 2</Label>
                  <Input
                    id="telefono_2"
                    value={formData.telefono_2}
                    onChange={(e) => setFormData({ ...formData, telefono_2: e.target.value })}
                  />
                </div>
              </div>

              {/* Personas de Contacto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="persona_contacto_1">Persona de Contacto 1</Label>
                  <Input
                    id="persona_contacto_1"
                    value={formData.persona_contacto_1}
                    onChange={(e) => setFormData({ ...formData, persona_contacto_1: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="persona_contacto_2">Persona de Contacto 2</Label>
                  <Input
                    id="persona_contacto_2"
                    value={formData.persona_contacto_2}
                    onChange={(e) => setFormData({ ...formData, persona_contacto_2: e.target.value })}
                  />
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45]">
                  {editingCliente ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}