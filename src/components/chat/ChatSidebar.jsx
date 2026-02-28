import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Users, Calendar, Building2, Search } from "lucide-react";

const TYPE_ICONS = {
  event: Calendar,
  coordinators: Users,
  client: Building2,
};

const TYPE_LABELS = {
  event: "Eventos",
  coordinators: "Coordinadores",
  client: "Clientes",
};

export default function ChatSidebar({ conversations, currentUser, selected, onSelect }) {
  const [lastMessages, setLastMessages] = useState({});
  const [unread, setUnread] = useState({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const lm = {};
      const ur = {};
      for (const c of conversations) {
        const msgs = await base44.entities.ChatMessage.filter(
          { conversation_id: c.id }, "-created_date", 1
        );
        if (msgs.length) {
          lm[c.id] = msgs[0];
          const unreadCount = await base44.entities.ChatMessage.filter(
            { conversation_id: c.id }, "-created_date", 50
          );
          ur[c.id] = unreadCount.filter(m => !(m.read_by || []).includes(currentUser.email)).length;
        }
      }
      setLastMessages(lm);
      setUnread(ur);
    };
    if (conversations.length) load();
  }, [conversations, currentUser]);

  useEffect(() => {
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === "create") {
        const cid = event.data?.conversation_id;
        setLastMessages(prev => ({ ...prev, [cid]: event.data }));
        if (event.data?.sender_email !== currentUser.email && cid !== selected?.id) {
          setUnread(prev => ({ ...prev, [cid]: (prev[cid] || 0) + 1 }));
        }
      }
    });
    return unsub;
  }, [currentUser, selected]);

  // Group by type
  const groups = ["event", "coordinators", "client"];
  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" /> Chat
          {totalUnread > 0 && (
            <span className="ml-auto bg-indigo-500 text-white text-xs rounded-full px-1.5 py-0.5">{totalUnread}</span>
          )}
        </h3>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-gray-50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groups.map(type => {
          const items = filtered.filter(c => c.type === type);
          if (!items.length) return null;
          const GroupIcon = TYPE_ICONS[type];
          return (
            <div key={type}>
              <div className="px-4 py-2 flex items-center gap-1.5 bg-gray-50 border-b">
                <GroupIcon className="w-3 h-3 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{TYPE_LABELS[type]}</span>
              </div>
              {items.map(conv => {
                const last = lastMessages[conv.id];
                const u = unread[conv.id] || 0;
                const isSelected = selected?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      onSelect(conv);
                      setUnread(prev => ({ ...prev, [conv.id]: 0 }));
                    }}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b hover:bg-gray-50 transition-colors ${isSelected ? "bg-indigo-50 border-l-2 border-l-indigo-500" : ""}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${conv.avatarColor}`}>
                      {conv.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium text-gray-900 truncate">{conv.name}</span>
                        {u > 0 && (
                          <span className="bg-indigo-500 text-white text-xs rounded-full px-1.5 py-0.5 shrink-0">{u}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {last ? last.text : conv.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-xs py-8">Sin resultados</p>
        )}
      </div>
    </div>
  );
}