import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Mail, Clock, ToggleLeft, ToggleRight, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DIAS_SEMANA = [
  { value: 1, label: 'Lunes' }, { value: 2, label: 'Martes' }, { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' }, { value: 5, label: 'Viernes' }, { value: 6, label: 'Sábado' }, { value: 7, label: 'Domingo' }
];

export default function InformesProgramados() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [enviando, setEnviando] = useState(null);
  const [form, setForm] = useState({
    cliente: '', frecuencia: 'mensual',
    dia_envio_semanal: 1, dia_envio_mensual: 1,
    destinatarios: [], emailInput: '', activo: true
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos-clientes'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores'],
    queryFn: () => base44.entities.Coordinador.list()
  });

  const { data: informes = [] } = useQuery({
    queryKey: ['informes-programados'],
    queryFn: () => base44.entities.InformeProgramado.list('-created_date', 100)
  });

  const clientes = [...new Set(pedidos.map(p => p.cliente).filter(Boolean))].sort();

  const crearMutation = useMutation({
    mutationFn: (data) => base44.entities.InformeProgramado.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['informes-programados'] });
      setShowDialog(false);
      toast.success('Informe programado creado');
    }
  });

  const eliminarMutation = useMutation({
    mutationFn: (id) => base44.entities.InformeProgramado.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['informes-programados'] });
      toast.success('Informe eliminado');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activo }) => base44.entities.InformeProgramado.update(id, { activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['informes-programados'] })
  });

  const agregarEmail = () => {
    const email = form.emailInput.trim();
    if (!email || !email.includes('@')) return;
    if (!form.destinatarios.includes(email)) {
      setForm(f => ({ ...f, destinatarios: [...f.destinatarios, email], emailInput: '' }));
    }
  };

  const agregarCoordinador = (email) => {
    if (email && !form.destinatarios.includes(email)) {
      setForm(f => ({ ...f, destinatarios: [...f.destinatarios, email] }));
    }
  };

  const guardar = () => {
    if (!form.cliente) return toast.error('Selecciona un cliente');
    if (!form.destinatarios.length) return toast.error('Añade al menos un destinatario');
    const { emailInput, ...data } = form;
    crearMutation.mutate(data);
  };

  const enviarAhora = async (informe) => {
    setEnviando(informe.id);
    try {
      await base44.functions.invoke('enviarInformesProgramados', { force_id: informe.id });
      toast.success('Informe enviado correctamente');
      queryClient.invalidateQueries({ queryKey: ['informes-programados'] });
    } catch {
      toast.error('Error al enviar el informe');
    } finally {
      setEnviando(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Informes Programados</h3>
          <p className="text-sm text-slate-500">Envío automático de informes por cliente por email</p>
        </div>
        <Button onClick={() => { setForm({ cliente: '', frecuencia: 'mensual', dia_envio_semanal: 1, dia_envio_mensual: 1, destinatarios: [], emailInput: '', activo: true }); setShowDialog(true); }}
          className="bg-[#1e3a5f] hover:bg-[#152a45] text-white">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Informe
        </Button>
      </div>

      {informes.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay informes programados</p>
          <p className="text-sm mt-1">Crea uno para enviar informes automáticamente por email</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {informes.map(inf => (
            <Card key={inf.id} className={`p-4 ${!inf.activo ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{inf.cliente}</span>
                    <Badge variant="outline" className={inf.frecuencia === 'semanal' ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'}>
                      {inf.frecuencia === 'semanal' ? '📅 Semanal' : '🗓 Mensual'}
                    </Badge>
                    {!inf.activo && <Badge variant="outline" className="border-slate-300 text-slate-500">Pausado</Badge>}
                  </div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{(inf.destinatarios || []).join(', ')}</span>
                  </div>
                  {inf.frecuencia === 'semanal' && (
                    <p className="text-xs text-slate-400 mt-0.5">Envío los {DIAS_SEMANA.find(d => d.value === inf.dia_envio_semanal)?.label || 'Lunes'}</p>
                  )}
                  {inf.frecuencia === 'mensual' && (
                    <p className="text-xs text-slate-400 mt-0.5">Envío el día {inf.dia_envio_mensual || 1} de cada mes</p>
                  )}
                  {inf.ultimo_envio && (
                    <p className="text-xs text-slate-400 mt-0.5">Último envío: {new Date(inf.ultimo_envio).toLocaleDateString('es-ES')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => enviarAhora(inf)} disabled={enviando === inf.id}>
                    {enviando === inf.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    <span className="hidden sm:inline ml-1">Enviar ahora</span>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => toggleMutation.mutate({ id: inf.id, activo: !inf.activo })}>
                    {inf.activo ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => eliminarMutation.mutate(inf.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Informe Programado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Cliente</label>
              <Select value={form.cliente} onValueChange={v => setForm(f => ({ ...f, cliente: v }))}>
                <SelectTrigger><SelectValue placeholder="Elegir cliente..." /></SelectTrigger>
                <SelectContent>{clientes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Frecuencia</label>
              <Select value={form.frecuencia} onValueChange={v => setForm(f => ({ ...f, frecuencia: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.frecuencia === 'semanal' && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Día de envío</label>
                <Select value={String(form.dia_envio_semanal)} onValueChange={v => setForm(f => ({ ...f, dia_envio_semanal: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIAS_SEMANA.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {form.frecuencia === 'mensual' && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Día del mes (1–28)</label>
                <Input type="number" min={1} max={28} value={form.dia_envio_mensual}
                  onChange={e => setForm(f => ({ ...f, dia_envio_mensual: Number(e.target.value) }))} />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Destinatarios</label>
              {coordinadores.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {coordinadores.map(c => (
                    <button key={c.id} onClick={() => agregarCoordinador(c.email)}
                      className="text-xs px-2 py-1 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors">
                      + {c.nombre}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input placeholder="email@ejemplo.com" value={form.emailInput}
                  onChange={e => setForm(f => ({ ...f, emailInput: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && agregarEmail()} />
                <Button variant="outline" onClick={agregarEmail} type="button">Añadir</Button>
              </div>
              {form.destinatarios.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.destinatarios.map(email => (
                    <span key={email} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                      {email}
                      <button onClick={() => setForm(f => ({ ...f, destinatarios: f.destinatarios.filter(e => e !== email) }))}
                        className="text-slate-400 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45] text-white" onClick={guardar} disabled={crearMutation.isPending}>
                {crearMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}