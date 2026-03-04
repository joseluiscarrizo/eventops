import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, UserPlus, Trash2 } from "lucide-react";

const STATUS_MAP = {
  pending: { label: "Pendiente", cls: "bg-gray-100 text-gray-600" },
  confirmed: { label: "Confirmado", cls: "bg-blue-100 text-blue-700" },
  checked_in: { label: "Check-in", cls: "bg-emerald-100 text-emerald-700" },
  checked_out: { label: "Check-out", cls: "bg-purple-100 text-purple-700" },
  absent: { label: "Ausente", cls: "bg-red-100 text-red-700" },
};

export default function AssignmentPanel({ event, onClose }) {
  const [assignments, setAssignments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ staff_member_id: "", zone: "", role_in_event: "" });

  const load = async () => {
    setLoading(true);
    const [a, s] = await Promise.all([
      base44.entities.Assignment.filter({ event_id: event.id }),
      base44.entities.StaffMember.filter({ status: "active" }),
    ]);
    setAssignments(a);
    setStaff(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, [event.id]);

  const assignedIds = assignments.map(a => a.staff_member_id);
  const availableStaff = staff.filter(s => !assignedIds.includes(s.id));

  const handleAdd = async (e) => {
    e.preventDefault();
    await base44.entities.Assignment.create({
      event_id: event.id,
      staff_member_id: form.staff_member_id,
      zone: form.zone,
      role_in_event: form.role_in_event,
      status: "pending",
      qr_code: `QR-${event.id}-${form.staff_member_id}-${Date.now()}`,
    });
    setForm({ staff_member_id: "", zone: "", role_in_event: "" });
    setAdding(false);
    load();
    // Send notification to assigned staff member
    const staffMember = staff.find(s => s.id === form.staff_member_id);
    if (staffMember) {
      base44.functions.invoke('notifyAssignment', {
        personal_id: form.staff_member_id,
        event_id: event.id,
        event_name: event.name,
        event_date: event.date_start ? new Date(event.date_start).toLocaleDateString("es") : "",
        event_place: event.location || "",
      }).catch(() => {});
      toast.success(`Notificación enviada a ${staffMember.full_name}`);
    }
  };

  const handleStatusChange = async (assignmentId, status) => {
    // Optimistic update
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, status } : a));
    const update = { status };
    if (status === "checked_in") update.check_in_time = new Date().toISOString();
    if (status === "checked_out") update.check_out_time = new Date().toISOString();
    await base44.entities.Assignment.update(assignmentId, update);
  };

  const handleDelete = async (id) => {
    await base44.entities.Assignment.delete(id);
    load();
  };

  const getStaffName = (id) => staff.find(s => s.id === id)?.full_name || "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <div>
            <h2 className="font-semibold text-lg">Staff asignado</h2>
            <p className="text-sm text-gray-500">{event.name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No hay staff asignado</div>
          ) : (
            <div className="space-y-2">
              {assignments.map(a => {
                const s = STATUS_MAP[a.status] || STATUS_MAP.pending;
                return (
                  <div key={a.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-indigo-700">
                        {getStaffName(a.staff_member_id).charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{getStaffName(a.staff_member_id)}</div>
                      <div className="text-xs text-gray-500">{a.zone || a.role_in_event || "Sin zona"}</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.cls}`}>{s.label}</span>
                    <Select value={a.status} onValueChange={v => handleStatusChange(a.id, v)}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_MAP).map(([val, { label }]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button onClick={() => handleDelete(a.id)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {adding && (
            <form onSubmit={handleAdd} className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <div>
                <Label>Miembro de staff</Label>
                <Select value={form.staff_member_id} onValueChange={v => setForm({ ...form, staff_member_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {availableStaff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Zona</Label>
                  <Input value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} placeholder="Ej: Entrada principal" />
                </div>
                <div>
                  <Label>Rol en evento</Label>
                  <Input value={form.role_in_event} onChange={e => setForm({ ...form, role_in_event: e.target.value })} placeholder="Ej: Supervisor" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={!form.staff_member_id} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Asignar
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="p-5 border-t flex-shrink-0">
          <Button onClick={() => setAdding(true)} disabled={adding || availableStaff.length === 0} variant="outline" className="gap-2 w-full">
            <UserPlus className="w-4 h-4" /> Agregar staff
          </Button>
        </div>
      </div>
    </div>
  );
}