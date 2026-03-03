/**
 * useConflictosHorario.js
 * Hook que detecta conflictos de horario para todos los camareros ya asignados
 * y genera notificaciones in-app para el coordinador.
 *
 * Un conflicto se produce cuando un camarero tiene dos asignaciones solapadas
 * o con menos de 6 horas de margen en el mismo día.
 */
import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const UMBRAL_HORAS = 6; // horas mínimas entre servicios
const NOTIFICADOS_KEY = 'conflictos_notificados'; // sessionStorage key para evitar duplicados

function minutosDesde(hora) {
  if (!hora) return null;
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
}

function hayConflicto(asig1, asig2) {
  // Mismo pedido → no es conflicto
  if (asig1.pedido_id === asig2.pedido_id) return false;
  // Distinto día → no hay conflicto
  if (asig1.fecha_pedido !== asig2.fecha_pedido) return false;

  const e1 = minutosDesde(asig1.hora_entrada);
  const s1 = minutosDesde(asig1.hora_salida);
  const e2 = minutosDesde(asig2.hora_entrada);
  const s2 = minutosDesde(asig2.hora_salida);

  if (e1 === null || s1 === null || e2 === null || s2 === null) return false;

  // Solapamiento directo
  if (e1 < s2 && e2 < s1) return true;

  // Menos de UMBRAL_HORAS de margen
  const margen = Math.min(Math.abs(e2 - s1), Math.abs(e1 - s2));
  return margen < UMBRAL_HORAS * 60;
}

export function useConflictosHorario({ asignaciones = [], pedidos = [], enabled = true }) {
  const yaNotificadosRef = useRef(new Set());

  useEffect(() => {
    if (!enabled || asignaciones.length === 0) return;

    // Restaurar notificados de sessionStorage
    try {
      const stored = sessionStorage.getItem(NOTIFICADOS_KEY);
      if (stored) {
        JSON.parse(stored).forEach(k => yaNotificadosRef.current.add(k));
      }
    } catch (_) { /* empty */ }
    const porCamarero = {};
    asignaciones.forEach(a => {
      if (!porCamarero[a.camarero_id]) porCamarero[a.camarero_id] = [];
      porCamarero[a.camarero_id].push(a);
    });

    const pedidosMap = {};
    pedidos.forEach(p => { pedidosMap[p.id] = p; });

    const conflictos = [];

    Object.entries(porCamarero).forEach(([_camareroId, asigs]) => {
      for (let i = 0; i < asigs.length; i++) {
        for (let j = i + 1; j < asigs.length; j++) {
          const a1 = asigs[i];
          const a2 = asigs[j];
          if (!hayConflicto(a1, a2)) continue;

          // Clave única para este par de asignaciones
          const key = [a1.id, a2.id].sort().join('-');
          if (yaNotificadosRef.current.has(key)) continue;

          yaNotificadosRef.current.add(key);
          conflictos.push({ camarero_nombre: a1.camarero_nombre, a1, a2 });

          // Toast inmediato
          const p1 = pedidosMap[a1.pedido_id];
          const p2 = pedidosMap[a2.pedido_id];
          const label1 = p1?.cliente || 'Evento 1';
          const label2 = p2?.cliente || 'Evento 2';

          toast.warning(`⚡ Conflicto de horario: ${a1.camarero_nombre}`, {
            description: `Posible solapamiento entre "${label1}" (${a1.hora_entrada}-${a1.hora_salida}) y "${label2}" (${a2.hora_entrada}-${a2.hora_salida}) el ${a1.fecha_pedido}.`,
            duration: 10000
          });

          // Notificación persistente en BD
          base44.entities.Notificacion.create({
            tipo: 'alerta',
            titulo: `⚡ Conflicto de horario: ${a1.camarero_nombre}`,
            mensaje: `${a1.camarero_nombre} tiene asignaciones con conflicto de horario el ${a1.fecha_pedido}:\n• "${label1}": ${a1.hora_entrada} - ${a1.hora_salida}\n• "${label2}": ${a2.hora_entrada} - ${a2.hora_salida}\nVerifica y reasigna si es necesario.`,
            prioridad: 'alta',
            pedido_id: a1.pedido_id,
            leida: false
          }).catch(() => {});
        }
      }
    });

    // Persistir en sessionStorage
    try {
      sessionStorage.setItem(NOTIFICADOS_KEY, JSON.stringify([...yaNotificadosRef.current]));
    } catch (_) { /* empty */ }
  }, [asignaciones, pedidos, enabled]);
}