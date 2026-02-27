import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { X, Plus, Trash2, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO, isAfter } from "date-fns";
import { es } from "date-fns/locale";

const PROFILE_LABELS = {
  camarero: "Camarero",
  cocinero: "Cocinero",
  ayudante_cocina: "Ayudante Cocina",
  coctelero: "Coctelero",
  azafata: "Azafata",
};

const PROFILE_COLORS = {
  camarero: "bg-blue-50 text-blue-700 border-blue-200",
  cocinero: "bg-orange-50 text-orange-700 border-orange-200",
  ayudante_cocina: "bg-amber-50 text-amber-700 border-amber-200",
  coctelero: "bg-purple-50 text-purple-700 border-purple-200",
  azafata: "bg-pink-50 text-pink-700 border-pink-200",
};

const STATUS_CONFIG = {
  pending: { label: "Pendiente", icon: Clock, cls: "text-amber-600" },
  confirmed: { label: "Confirmado", icon: CheckCircle2, cls: "text-emerald-600" },
  cancelled: { label: "Cancelado", icon: XCircle, cls: "text-red-500" },
};

export default function OrderStaffManager({ order, onClose }) {
  const [assignments, setAssignments] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProfile, setFilterProfile] = useState("all");
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [filterAvailability, setFilterAvailability] = useState("available"); // "all" | "available"
  const [searchPersonal, setSearchPersonal] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [assigns, pers] = await Promise.all([
      base44.entities.OrderAssignment.filter({ order_id: order.id }),
      base44.entities.Personal.list("-created_date", 300),
    ]);
    setAssignments(assigns);
    setPersonal(pers.filter(p => p.status === "active"));
    setLoading(false);
  }, [order.id]);

  useEffect(() => { load(); }, [load]);

  const isPersonUnavailable = (p) => {
    if (!p.unavailable_until) return false;
    const orderDate = order.event_date ? new Date(order.event_date) : new Date();
    return isAfter(parseISO(p.unavailable_until), orderDate) || 
           p.unavailable_until >= (order.event_date || "");
  };

  const addAssignment = async (person, roleOverride) => {
    const already = assignments.find(a => a.personal_id === person.id);
    if (already) return;
    const newA = await base44.entities.OrderAssignment.create({
      order_id: order.id,
      personal_id: person.id,
      personal_name: `${person.first_name} ${person.last_name}`,
      profile_type: roleOverride || person.profile_type,
      status: "pending",
    });
    setAssignments(prev => [...prev, newA]);
  };

  const removeAssignment = async (id) => {
    await base44.entities.OrderAssignment.delete(id);
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const updateStatus = async (id, status) => {
    await base44.entities.OrderAssignment.update(id, { status });
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const onDragEnd = async (result) => {
    if (!result.destination || result.destination.droppableId !== "assigned") return;
    const draggedId = result.draggableId;
    const person = personal.find(p => p.id === draggedId);
    if (person) await addAssignment(person);
  };

  // Group assignments by profile
  const assignedByProfile = assignments.reduce((acc, a) => {
    const key = a.profile_type || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const assignedIds = new Set(assignments.map(a => a.personal_id));

  // Collect all specialties for filter dropdown
  const allSpecialties = [...new Set(personal.flatMap(p => p.specialties || []))].sort();

  const filteredPersonal = personal.filter(p => {
    const allProfiles = [p.profile_type, ...(p.extra_profiles || [])];
    const matchProfile = filterProfile === "all" || allProfiles.includes(filterProfile);
    const matchSearch = `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchPersonal.toLowerCase());
    const matchSpecialty = filterSpecialty === "all" || (p.specialties || []).includes(filterSpecialty);
    const matchAvailability = filterAvailability === "all" || !isPersonUnavailable(p);
    return matchProfile && matchSearch && matchSpecialty && matchAvailability;
  });

  const allConfirmed = assignments.length > 0 && assignments.every(a => a.status === "confirmed");

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-8 px-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl mb-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{order.order_number}</span>
              {allConfirmed
                ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />Completo</span>
                : <span className="flex items-center gap-1 text-xs text-amber-600 font-medium"><Clock className="w-3.5 h-3.5" />Pendiente</span>
              }
            </div>
            <h2 className="text-xl font-bold text-gray-900">{order.event_place}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {order.event_date ? format(new Date(order.event_date), "EEEE d 'de' MMMM yyyy", { locale: es }) : "Sin fecha"}
              {order.client_name ? ` · ${order.client_name}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex flex-col lg:flex-row gap-0 divide-y lg:divide-y-0 lg:divide-x">

            {/* LEFT: Assigned staff */}
            <Droppable droppableId="assigned">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 p-6 min-h-[400px] transition-colors ${snapshot.isDraggingOver ? "bg-indigo-50" : ""}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Personal asignado</h3>
                    <span className="text-xs text-gray-400">{assignments.length} personas</span>
                  </div>

                  {loading ? (
                    <div className="space-y-2">
                      {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : assignments.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed text-gray-400 text-sm transition-colors ${snapshot.isDraggingOver ? "border-indigo-400 text-indigo-400" : "border-gray-200"}`}>
                      <Plus className="w-8 h-8 mb-2 opacity-40" />
                      <p>Arrastra o añade personal aquí</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(assignedByProfile).map(([profile, items]) => (
                        <div key={profile}>
                          <div className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border mb-2 ${PROFILE_COLORS[profile] || "bg-gray-100 text-gray-600"}`}>
                            {PROFILE_LABELS[profile] || profile} ({items.length})
                          </div>
                          <div className="space-y-1.5">
                            {items.map(a => {
                              const stCfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending;
                              const Icon = stCfg.icon;
                              return (
                                <div key={a.id} className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                                  <Icon className={`w-4 h-4 flex-shrink-0 ${stCfg.cls}`} />
                                  <span className="flex-1 text-sm font-medium text-gray-800">{a.personal_name}</span>
                                  <select
                                    value={a.status}
                                    onChange={e => updateStatus(a.id, e.target.value)}
                                    className={`text-xs border-0 rounded-full px-2 py-0.5 cursor-pointer focus:outline-none ${
                                      a.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                                      a.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                                      'bg-amber-50 text-amber-700'
                                    }`}
                                  >
                                    <option value="pending">Pendiente</option>
                                    <option value="confirmed">Confirmado</option>
                                    <option value="cancelled">Cancelado</option>
                                  </select>
                                  <button onClick={() => removeAssignment(a.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* RIGHT: Available personal */}
            <div className="w-full lg:w-72 p-4 bg-gray-50 flex flex-col gap-3">
              <h3 className="font-semibold text-gray-800 text-sm">Personal disponible</h3>

              {/* Filters */}
              <input
                type="text"
                placeholder="Buscar..."
                value={searchPersonal}
                onChange={e => setSearchPersonal(e.target.value)}
                className="h-8 text-sm border rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
              />
              <select
                value={filterProfile}
                onChange={e => setFilterProfile(e.target.value)}
                className="h-8 text-xs border rounded-lg px-2 focus:outline-none bg-white"
              >
                <option value="all">Todos los perfiles</option>
                {Object.entries(PROFILE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>

              {/* Personal list */}
              <Droppable droppableId="available" isDropDisabled={true}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 space-y-1.5 overflow-y-auto max-h-[420px]">
                    {filteredPersonal.map((p, index) => {
                      const isAssigned = assignedIds.has(p.id);
                      return (
                        <Draggable key={p.id} draggableId={p.id} index={index} isDragDisabled={isAssigned}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all select-none
                                ${snapshot.isDragging ? "shadow-lg rotate-1 z-50 bg-white" : ""}
                                ${isAssigned ? "opacity-40 bg-white cursor-not-allowed" : "bg-white hover:border-indigo-300 cursor-grab active:cursor-grabbing"}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-800 truncate">{p.first_name} {p.last_name}</div>
                                <div className={`text-xs px-1.5 py-0.5 rounded-full inline-block border mt-0.5 ${PROFILE_COLORS[p.profile_type] || "bg-gray-100 text-gray-500"}`}>
                                  {PROFILE_LABELS[p.profile_type] || p.profile_type}
                                </div>
                              </div>
                              {!isAssigned && (
                                <button
                                  onClick={() => addAssignment(p)}
                                  className="flex-shrink-0 text-xs bg-indigo-600 text-white px-2 py-1 rounded-md hover:bg-indigo-700 transition-colors"
                                >
                                  Agregar
                                </button>
                              )}
                              {isAssigned && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {filteredPersonal.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-6">Sin resultados</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}