import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCheck, Check, FileIcon, ExternalLink, Megaphone } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

function LecturaBadge({ mensaje, user, miembros }) {
  const [mostrar, setMostrar] = useState(false);
  const leidoPor = mensaje.leido_por || [];
  const leidoSinMi = leidoPor.filter(id => id !== mensaje.user_id);
  const totalDestinatarios = mensaje.destinatario_id
    ? 1
    : (miembros?.filter(m => m.user_id !== mensaje.user_id).length || 0);

  const todoLeyeron = leidoSinMi.length >= totalDestinatarios && totalDestinatarios > 0;

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={() => setMostrar(!mostrar)}
        className="flex items-center gap-0.5"
        title={`Leído por ${leidoSinMi.length}/${totalDestinatarios}`}
      >
        {todoLeyeron ? (
          <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
        ) : leidoSinMi.length > 0 ? (
          <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <Check className="w-3.5 h-3.5 text-slate-300" />
        )}
        {totalDestinatarios > 1 && (
          <span className="text-xs text-slate-400">{leidoSinMi.length}/{totalDestinatarios}</span>
        )}
      </button>

      {mostrar && mensaje.leido_por_nombres?.length > 0 && (
        <div className="absolute bottom-5 right-0 z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-[140px]">
          <p className="text-xs font-semibold text-slate-600 mb-1">Leído por:</p>
          {mensaje.leido_por_nombres
            .filter(n => n !== mensaje.nombre_usuario)
            .map((n, i) => (
              <p key={i} className="text-xs text-slate-500">{n}</p>
            ))}
          {mensaje.leido_por_nombres.filter(n => n !== mensaje.nombre_usuario).length === 0 && (
            <p className="text-xs text-slate-400">Nadie todavía</p>
          )}
        </div>
      )}
    </div>
  );
}

function ArchivoPreview({ url, nombre, tipo }) {
  const esImagen = tipo?.startsWith('image/');

  if (esImagen) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img src={url} alt={nombre} className="max-w-[220px] rounded-lg border border-white/20 cursor-pointer hover:opacity-90 transition-opacity" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-2 bg-black/10 rounded-lg px-3 py-2 hover:bg-black/20 transition-colors"
    >
      <FileIcon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm truncate max-w-[160px]">{nombre || 'Archivo'}</span>
      <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-70" />
    </a>
  );
}

export default function ChatBubble({ mensaje, user, miembros = [] }) {
  const esUsuarioActual = mensaje.user_id === user?.id;
  const esMensajeSistema = mensaje.tipo === 'sistema';
  const esMasivo = mensaje.tipo === 'masivo' && !mensaje.destinatario_id;
  const esIndividual = !!mensaje.destinatario_id;

  if (esMensajeSistema) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full">
          {mensaje.mensaje}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 mb-4", esUsuarioActual ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold",
        esUsuarioActual
          ? "bg-[#1e3a5f]"
          : mensaje.rol_usuario === 'coordinador' ? "bg-purple-600" : "bg-emerald-600"
      )}>
        {(mensaje.nombre_usuario || 'U').charAt(0).toUpperCase()}
      </div>

      <div className={cn("max-w-[75%]", esUsuarioActual && "flex flex-col items-end")}>
        {/* Sender name */}
        {!esUsuarioActual && (
          <div className="flex items-center gap-1 mb-1 px-1">
            <p className="text-xs text-slate-500 font-medium">{mensaje.nombre_usuario}</p>
            {mensaje.rol_usuario === 'coordinador' && (
              <Badge className="text-xs bg-purple-100 text-purple-700 px-1 py-0 h-4">Coord.</Badge>
            )}
          </div>
        )}

        {/* Message type badges */}
        {(esMasivo || esIndividual) && esUsuarioActual && (
          <div className="flex items-center gap-1 mb-1 px-1">
            {esMasivo && (
              <Badge className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0 h-4 flex items-center gap-1">
                <Megaphone className="w-2.5 h-2.5" /> Masivo
              </Badge>
            )}
            {esIndividual && (
              <Badge className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0 h-4">
                → {mensaje.destinatario_nombre}
              </Badge>
            )}
          </div>
        )}
        {esIndividual && !esUsuarioActual && (
          <div className="flex mb-1 px-1">
            <Badge className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0 h-4">
              Mensaje directo
            </Badge>
          </div>
        )}

        {/* Bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-2.5",
          esUsuarioActual
            ? "bg-[#1e3a5f] text-white rounded-tr-sm"
            : "bg-white border border-slate-200 rounded-tl-sm text-slate-800"
        )}>
          {mensaje.mensaje && !(mensaje.archivo_url && mensaje.mensaje === `📎 ${mensaje.archivo_nombre}`) && (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{mensaje.mensaje}</p>
          )}
          {mensaje.archivo_url && (
            <ArchivoPreview
              url={mensaje.archivo_url}
              nombre={mensaje.archivo_nombre}
              tipo={mensaje.archivo_tipo}
            />
          )}
        </div>

        {/* Timestamp & read receipts */}
        <div className={cn("flex items-center gap-1.5 mt-1 px-1", esUsuarioActual ? "flex-row-reverse" : "flex-row")}>
          <span className="text-xs text-slate-400">
            {format(new Date(mensaje.created_date), 'HH:mm', { locale: es })}
          </span>
          {esUsuarioActual && (
            <LecturaBadge mensaje={mensaje} user={user} miembros={miembros} />
          )}
        </div>
      </div>
    </div>
  );
}