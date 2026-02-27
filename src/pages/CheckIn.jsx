import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Search, CheckCircle2, LogOut, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CheckIn() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  useEffect(() => {
    base44.entities.Event.filter({ status: "published" }).then(e => {
      const active = [...e];
      base44.entities.Event.filter({ status: "in_progress" }).then(ip => {
        setEvents([...active, ...ip]);
      });
    });
    base44.entities.StaffMember.list("-created_date", 500).then(setStaff);
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    base44.entities.Assignment.filter({ event_id: selectedEventId }).then(data => {
      setAssignments(data);
      setLoading(false);
    });
  }, [selectedEventId]);

  const getStaff = (id) => staff.find(s => s.id === id);

  const handleAction = async (assignment, action) => {
    const update = { status: action };
    if (action === "checked_in") update.check_in_time = new Date().toISOString();
    if (action === "checked_out") update.check_out_time = new Date().toISOString();
    await base44.entities.Assignment.update(assignment.id, update);
    setAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, ...update } : a));
    const name = getStaff(assignment.staff_member_id)?.full_name || "";
    setActionMsg({ type: action, name });
    setTimeout(() => setActionMsg(null), 3000);
  };

  const filtered = assignments.filter(a => {
    const s = getStaff(a.staff_member_id);
    return !search || s?.full_name?.toLowerCase().includes(search.toLowerCase()) || a.qr_code?.includes(search);
  });

  const counts = {
    total: assignments.length,
    checkedIn: assignments.filter(a => a.status === "checked_in").length,
    checkedOut: assignments.filter(a => a.status === "checked_out").length,
    pending: assignments.filter(a => a.status === "pending" || a.status === "confirmed").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Check-in QR</h1>
        <p className="text-gray-500 mt-1">Control de asistencia del staff por evento</p>
      </div>

      {/* Event selector */}
      <div className="bg-white rounded-xl border p-5">
        <label className="text-sm font-medium text-gray-700 block mb-2">Seleccionar evento</label>
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Elegir evento..." />
          </SelectTrigger>
          <SelectContent>
            {events.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEventId && (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: counts.total, icon: QrCode, color: "text-gray-600" },
              { label: "Presentes", value: counts.checkedIn, icon: CheckCircle2, color: "text-emerald-600" },
              { label: "Salieron", value: counts.checkedOut, icon: LogOut, color: "text-purple-600" },
              { label: "Pendientes", value: counts.pending, icon: Clock, color: "text-amber-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border p-4 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9" placeholder="Buscar por nombre o QR..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Toast */}
          {actionMsg && (
            <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium z-50
              ${actionMsg.type === "checked_in" ? "bg-emerald-600" : actionMsg.type === "checked_out" ? "bg-purple-600" : "bg-red-600"}`}>
              {actionMsg.type === "checked_in" && `✅ Check-in: ${actionMsg.name}`}
              {actionMsg.type === "checked_out" && `👋 Check-out: ${actionMsg.name}`}
              {actionMsg.type === "absent" && `❌ Ausente: ${actionMsg.name}`}
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="bg-white rounded-xl border divide-y">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="p-4 flex gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No hay asignaciones para este evento</div>
          ) : (
            <div className="bg-white rounded-xl border divide-y">
              {filtered.map(a => {
                const member = getStaff(a.staff_member_id);
                return (
                  <div key={a.id} className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-indigo-700">{member?.full_name?.charAt(0) || "?"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{member?.full_name || "—"}</div>
                      <div className="text-xs text-gray-500">
                        {a.zone || a.role_in_event || "Sin zona"}
                        {a.check_in_time && ` · Entrada: ${format(new Date(a.check_in_time), "HH:mm", { locale: es })}`}
                        {a.check_out_time && ` · Salida: ${format(new Date(a.check_out_time), "HH:mm", { locale: es })}`}
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                    <div className="flex gap-2">
                      {a.status !== "checked_in" && a.status !== "checked_out" && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs gap-1"
                          onClick={() => handleAction(a, "checked_in")}>
                          <CheckCircle2 className="w-3 h-3" /> Check-in
                        </Button>
                      )}
                      {a.status === "checked_in" && (
                        <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1"
                          onClick={() => handleAction(a, "checked_out")}>
                          <LogOut className="w-3 h-3" /> Salida
                        </Button>
                      )}
                      {a.status !== "absent" && a.status !== "checked_in" && a.status !== "checked_out" && (
                        <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => handleAction(a, "absent")}>
                          <XCircle className="w-3 h-3" /> Ausente
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: "bg-gray-100 text-gray-600",
    confirmed: "bg-blue-100 text-blue-700",
    checked_in: "bg-emerald-100 text-emerald-700",
    checked_out: "bg-purple-100 text-purple-700",
    absent: "bg-red-100 text-red-700",
  };
  const labels = {
    pending: "Pendiente", confirmed: "Confirmado",
    checked_in: "Presente", checked_out: "Salió", absent: "Ausente",
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${map[status] || map.pending}`}>
      {labels[status] || status}
    </span>
  );
}