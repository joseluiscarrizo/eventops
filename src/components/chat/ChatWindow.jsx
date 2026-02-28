import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, X } from "lucide-react";

export default function ChatWindow({ conversationId, conversationName, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Load initial messages
    base44.entities.ChatMessage.filter({ conversation_id: conversationId }, "created_date", 100)
      .then(setMessages);

    // Real-time subscription
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div>
          <div className="font-semibold text-gray-900 text-sm">{conversationName}</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">Sin mensajes aún. ¡Empieza la conversación!</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${isMe(msg) ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
              isMe(msg)
                ? "bg-indigo-600 text-white rounded-br-sm"
                : "bg-white text-gray-900 border rounded-bl-sm"
            }`}>
              {!isMe(msg) && (
                <div className="text-xs font-semibold text-indigo-500 mb-0.5">{msg.sender_name}</div>
              )}
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              <div className={`text-xs mt-1 ${isMe(msg) ? "text-indigo-200" : "text-gray-400"}`}>
                {msg.created_date ? new Date(msg.created_date).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : ""}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-white flex items-end gap-2">
        <textarea
          className="flex-1 resize-none border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 max-h-28"
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