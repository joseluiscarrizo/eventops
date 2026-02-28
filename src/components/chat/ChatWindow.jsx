import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Calendar, Users, Building2 } from "lucide-react";

const TYPE_ICONS = {
  event: Calendar,
  coordinators: Users,
  client: Building2,
};

const TYPE_COLORS = {
  event: "bg-indigo-100 text-indigo-700",
  coordinators: "bg-violet-100 text-violet-700",
  client: "bg-emerald-100 text-emerald-700",
};

export default function ChatWindow({ conversationId, conversationName, conversationSubtitle, conversationType, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.entities.ChatMessage.filter({ conversation_id: conversationId }, "created_date", 100)
      .then(setMessages);

    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.conversation_id !== conversationId) return;
      if (event.type === "create") {
        setMessages(prev => [...prev, event.data]);
      }
    });
    return unsub;
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await base44.entities.ChatMessage.create({
      conversation_id: conversationId,
      text: text.trim(),
      sender_email: currentUser.email,
      sender_name: currentUser.full_name,
      sender_role: currentUser.role || "empleado",
      read_by: [currentUser.email],
    });
    setText("");
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const isMe = (msg) => msg.sender_email === currentUser.email;
  const TypeIcon = TYPE_ICONS[conversationType] || Users;
  const iconColor = TYPE_COLORS[conversationType] || "bg-gray-100 text-gray-600";

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = msg.created_date ? new Date(msg.created_date).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" }) : "Hoy";
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b bg-white">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
          <TypeIcon className="w-4 h-4" />
        </div>
        <div>
          <div className="font-semibold text-gray-900 text-sm">{conversationName}</div>
          {conversationSubtitle && <div className="text-xs text-gray-400">{conversationSubtitle}</div>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-12">Sin mensajes aún. ¡Empieza la conversación!</p>
        )}
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 capitalize">{date}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {msgs.map(msg => (
              <div key={msg.id} className={`flex mb-2 ${isMe(msg) ? "justify-end" : "justify-start"}`}>
                {!isMe(msg) && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0 mr-2 mt-auto">
                    {msg.sender_name?.[0] || "?"}
                  </div>
                )}
                <div className={`max-w-[72%] ${isMe(msg) ? "" : ""}`}>
                  {!isMe(msg) && (
                    <div className="text-xs font-semibold text-indigo-600 mb-1 ml-1">{msg.sender_name}</div>
                  )}
                  <div className={`rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                    isMe(msg)
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-white text-gray-900 border rounded-bl-sm"
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <div className={`text-xs mt-1 text-right ${isMe(msg) ? "text-indigo-200" : "text-gray-400"}`}>
                      {msg.created_date ? new Date(msg.created_date).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-white flex items-end gap-2">
        <textarea
          className="flex-1 resize-none border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 max-h-28 bg-gray-50"
          rows={1}
          placeholder="Escribe un mensaje..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl p-2.5 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}