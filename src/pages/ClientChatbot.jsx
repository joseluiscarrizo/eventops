import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Bot, Send, Loader2, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ClientChatbot() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    initConversation();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initConversation = async () => {
    setStarting(true);
    const conv = await base44.agents.createConversation({
      agent_name: "client_assistant",
      metadata: { name: "Asistente Cliente" }
    });
    setConversation(conv);
    const unsub = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
    });
    setStarting(false);
    return unsub;
  };

  const send = async () => {
    if (!input.trim() || loading || !conversation) return;
    const text = input.trim();
    setInput("");
    setLoading(true);
    await base44.agents.addMessage(conversation, { role: "user", content: text });
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (starting) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Iniciando asistente...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Asistente de Clientes</h1>
            <p className="text-sm text-gray-500">Resuelve dudas sobre pedidos y eventos automáticamente</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a
              href={base44.agents.getWhatsAppConnectURL("client_assistant")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-white bg-[#25D366] hover:bg-[#20b858] px-3 py-1.5 rounded-full transition-colors font-medium"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En línea
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm flex flex-col" style={{ height: "calc(100vh - 14rem)" }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3">
              <Bot className="w-10 h-10 opacity-20" />
              <div>
                <p className="text-sm font-medium">¡Hola! Soy el asistente de EventOps.</p>
                <p className="text-xs mt-1 opacity-70">Pregúntame sobre pedidos, eventos o servicios.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {["¿Cuál es el estado de mi pedido?", "¿Qué servicios ofrecéis?", "¿Cómo puedo contactar con un coordinador?"].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="text-xs bg-gray-50 border rounded-full px-3 py-1.5 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.filter(m => m.role !== "system").map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div key={i} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-gray-50 border text-gray-900 rounded-bl-sm"
                }`}>
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div>
                      {msg.content ? (
                        <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-xs">Pensando...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escribe tu pregunta..."
            className="flex-1 resize-none border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-gray-50 max-h-28"
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl p-2.5 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}