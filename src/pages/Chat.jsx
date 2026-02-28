import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAppRole, CAN } from "@/components/auth/useAppRole";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatSidebar from "@/components/chat/ChatSidebar.jsx";
import { MessageSquare } from "lucide-react";

export default function Chat() {
  const { user, role } = useAppRole();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user, role]);

  const loadConversations = async () => {
    setLoading(true);
    const convs = [];

    const isManager = CAN.managePersonal(role);

    // 1. GROUP CHATS: Events that are "completed" or "in_progress"
    const events = await base44.entities.Event.filter(
      { status: isManager ? undefined : "in_progress" }, "-date_start", 50
    );
    const eventConvs = events
      .filter(e => ["completed", "in_progress", "published"].includes(e.status))
      .map(e => ({
        id: `event_${e.id}`,
        name: e.name,
        subtitle: `Evento · ${e.status === "in_progress" ? "En curso" : e.status === "published" ? "Publicado" : "Completado"}`,
        type: "event",
        avatar: e.name[0],
        avatarColor: "bg-indigo-100 text-indigo-700",
        status: e.status,
      }));
    convs.push(...eventConvs);

    if (isManager) {
      // 2. COORDINATORS CHAT (admin/planificador only)
      convs.push({
        id: "coordinators",
        name: "Coordinadores",
        subtitle: "Canal interno de coordinación",
        type: "coordinators",
        avatar: "C",
        avatarColor: "bg-violet-100 text-violet-700",
      });

      // 3. CLIENT CHATS
      const clients = await base44.entities.Client.list("name", 100);
      const clientConvs = clients.map(c => ({
        id: `client_${c.id}`,
        name: c.name,
        subtitle: `Cliente · ${c.contact_person_1 || c.email_1 || ""}`,
        type: "client",
        avatar: c.name[0],
        avatarColor: "bg-emerald-100 text-emerald-700",
      }));
      convs.push(...clientConvs);
    } else {
      // Employee: also see general coordination channel
      convs.unshift({
        id: "coordinators",
        name: "Coordinación",
        subtitle: "Canal con coordinadores",
        type: "coordinators",
        avatar: "C",
        avatarColor: "bg-violet-100 text-violet-700",
      });
    }

    setConversations(convs);
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="w-72 border-r shrink-0 flex flex-col">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ChatSidebar
            conversations={conversations}
            currentUser={user}
            selected={selected}
            onSelect={setSelected}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {selected ? (
          <ChatWindow
            conversationId={selected.id}
            conversationName={selected.name}
            conversationSubtitle={selected.subtitle}
            conversationType={selected.type}
            currentUser={user}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 gap-3">
            <MessageSquare className="w-12 h-12 opacity-20" />
            <div>
              <p className="text-sm font-medium">Selecciona una conversación</p>
              <p className="text-xs mt-1 opacity-70">Eventos, coordinadores y clientes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}