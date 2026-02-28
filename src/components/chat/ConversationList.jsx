import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare } from "lucide-react";

export default function ConversationList({ personal, currentUser, onSelect, selectedId }) {
  const [lastMessages, setLastMessages] = useState({});
  const [unread, setUnread] = useState({});

  useEffect(() => {
    // Load last message per person for preview
    const load = async () => {
      const lm = {};
      const ur = {};
      for (const p of personal) {
        const msgs = await base44.entities.ChatMessage.filter(
          { conversation_id: p.id }, "-created_date", 1
        );
        if (msgs.length) {
          lm[p.id] = msgs[0];
          ur[p.id] = msgs.filter(m => !(m.read_by || []).includes(currentUser.email)).length;
        }
      }
      setLastMessages(lm);
      setUnread(ur);
    };
    if (personal.length) load();
  }, [personal, currentUser]);

  useEffect(() => {
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === "create") {
        const cid = event.data?.conversation_id;
        setLastMessages(prev => ({ ...prev, [cid]: event.data }));
        if (event.data?.sender_email !== currentUser.email && cid !== selectedId) {
          setUnread(prev => ({ ...prev, [cid]: (prev[cid] || 0) + 1 }));
        }
      }
    });
    return unsub;
  }, [currentUser, selectedId]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" /> Conversaciones
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {personal.length === 0 && (
          <p className="text-center text-gray-400 text-xs py-8">No hay personal disponible</p>
        )}
        {personal.map(p => {
          const last = lastMessages[p.id];
          const u = unread[p.id] || 0;
          const isSelected = selectedId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p);
                setUnread(prev => ({ ...prev, [p.id]: 0 }));
              }}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b hover:bg-gray-50 transition-colors ${isSelected ? "bg-indigo-50 border-l-2 border-l-indigo-500" : ""}`}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                {p.first_name?.[0]}{p.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 truncate">{p.first_name} {p.last_name}</span>
                  {u > 0 && (
                    <span className="ml-2 bg-indigo-500 text-white text-xs rounded-full px-1.5 py-0.5 shrink-0">{u}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {last ? last.text : "Sin mensajes"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}