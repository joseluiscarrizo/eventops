import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAppRole, CAN } from "@/components/auth/useAppRole";
import ConversationList from "@/components/chat/ConversationList";
import ChatWindow from "@/components/chat/ChatWindow";
import { MessageSquare } from "lucide-react";

export default function Chat() {
  const { user, role } = useAppRole();
  const [personal, setPersonal] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    if (CAN.managePersonal(role)) {
      // Admin/Planificador: see all personal
      base44.entities.Personal.filter({ status: "active" }, "first_name", 200)
        .then(p => { setPersonal(p); setLoading(false); });
    } else {
      // Empleado: only their own conversation (they see chat with coordinator)
      // We create a "virtual" personal entry representing the admin channel
      setPersonal([{ id: "general", first_name: "Coordinación", last_name: "", role: "admin" }]);
      setLoading(false);
    }
  }, [user, role]);

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-xl border bg-white shadow-sm overflow-hidden">
      {/* Sidebar: conversation list */}
      <div className="w-72 border-r shrink-0 flex flex-col">
        {loading ? (
          <div className="p-4 text-sm text-gray-400">Cargando...</div>
        ) : (
          <ConversationList
            personal={personal}
            currentUser={user}
            onSelect={setSelected}
            selectedId={selected?.id}
          />
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <ChatWindow
            conversationId={selected.id}
            conversationName={`${selected.first_name} ${selected.last_name}`.trim() || "Conversación"}
            currentUser={user}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Selecciona una conversación para empezar</p>
          </div>
        )}
      </div>
    </div>
  );
}