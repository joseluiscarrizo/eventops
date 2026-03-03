import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, User, Phone, Mail, Calendar, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function SelectorCliente({ onSelectCliente, clienteActual }) {
  const [open, setOpen] = useState(false);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    email_1: '',
    telefono_1: '',
    persona_contacto_1: '',
    notas: ''
  });

  const queryClient = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nombre')
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos-crm'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const crearClienteMutation = useMutation({
    mutationFn: (data) => {
      // Generar código automático
      const maxCodigo = clientes.reduce((max, c) => {
        const num = parseInt(c.codigo?.replace('CL', '') || '0');
        return Math.max(max, num);
      }, 0);
      
      return base44.entities.Cliente.create({
        ...data,
        codigo: `CL${String(maxCodigo + 1).padStart(3, '0')}`,
        activo: true
      });
    },
    onSuccess: (cliente) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      onSelectCliente(cliente);
      setShowNuevoCliente(false);
      setNuevoCliente({
        nombre: '',
        email_1: '',
        telefono_1: '',
        persona_contacto_1: '',
        notas: ''
      });
      toast.success('Cliente creado exitosamente');
    }
  });

  const clientesFiltrados = clientes.filter(c => 
    c.activo && (
      c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email_1?.toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  const getHistorialCliente = (clienteId) => {
    return pedidos.filter(p => p.cliente_id === clienteId);
  };

  const handleCrearCliente = () => {
    if (!nuevoCliente.nombre) {
      toast.error('El nombre del cliente es obligatorio');
      return;
    }
    crearClienteMutation.mutate(nuevoCliente);
  };

  return (
    <>
      <div className="space-y-3">
        <Label className="text-slate-700 font-medium">Cliente CRM *</Label>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-auto py-3"
            >
              {clienteActual ? (
                <div className="flex items-center gap-2 text-left">
                  <User className="w-4 h-4 text-[#1e3a5f]" />
                  <div>
                    <div className="font-semibold text-slate-800">{clienteActual.nombre}</div>
                    <div className="text-xs text-slate-500">#{clienteActual.codigo}</div>
                  </div>
                </div>
              ) : (
                <span className="text-slate-500">Seleccionar cliente...</span>
              )}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Buscar cliente..." 
                value={busqueda}
                onValueChange={setBusqueda}
              />
              <CommandList>
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <p className="text-sm text-slate-500 mb-3">No se encontró el cliente</p>
                    <Button 
                      onClick={() => {
                        setShowNuevoCliente(true);
                        setOpen(false);
                      }}
                      size="sm"
                      className="bg-[#1e3a5f]"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Nuevo Cliente
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-[300px]">
                    {clientesFiltrados.map((cliente) => {
                      const historial = getHistorialCliente(cliente.id);
                      return (
                        <CommandItem
                          key={cliente.id}
                          onSelect={() => {
                            onSelectCliente(cliente);
                            setOpen(false);
                          }}
                          className="flex items-start gap-3 p-3 cursor-pointer"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">{cliente.nombre}</span>
                              {clienteActual?.id === cliente.id && (
                                <Check className="w-4 h-4 text-[#1e3a5f]" />
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                              <div>#{cliente.codigo}</div>
                              {cliente.email_1 && (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {cliente.email_1}
                                </div>
                              )}
                              {cliente.telefono_1 && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {cliente.telefono_1}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                {historial.length} pedidos
                              </Badge>
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
            <div className="p-2 border-t">
              <Button 
                onClick={() => {
                  setShowNuevoCliente(true);
                  setOpen(false);
                }}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Nuevo Cliente
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Modal Nuevo Cliente */}
      <Dialog open={showNuevoCliente} onOpenChange={setShowNuevoCliente}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#1e3a5f]" />
              Nuevo Cliente CRM
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Cliente *</Label>
              <Input
                value={nuevoCliente.nombre}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                placeholder="Empresa o nombre completo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={nuevoCliente.email_1}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, email_1: e.target.value })}
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={nuevoCliente.telefono_1}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono_1: e.target.value })}
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Persona de Contacto</Label>
              <Input
                value={nuevoCliente.persona_contacto_1}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, persona_contacto_1: e.target.value })}
                placeholder="Nombre del contacto"
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={nuevoCliente.notas}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, notas: e.target.value })}
                placeholder="Información adicional"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNuevoCliente(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCrearCliente}
                disabled={crearClienteMutation.isPending}
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
              >
                {crearClienteMutation.isPending ? 'Creando...' : 'Crear Cliente'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}