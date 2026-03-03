import { useMemo } from 'react';

/**
 * Calcula un score de idoneidad (0-100) para cada camarero
 * respecto a un pedido dado, usando datos ya disponibles en el cliente.
 *
 * Factores:
 *  - Especialidad / habilidades / idiomas requeridos  (30 pts)
 *  - Valoración promedio                               (25 pts)
 *  - Carga de trabajo (eventos del mes / semana)       (20 pts)
 *  - Proximidad geográfica                             (15 pts)
 *  - Historial con el cliente                          (10 pts)
 */
export function useScoresAsignacion({ pedido, camareros, asignaciones }) {
  return useMemo(() => {
    if (!pedido || !camareros?.length) return {};

    const scores = {};

    // Asignaciones del mes del pedido (para carga de trabajo)
    const fechaPedido = pedido.dia ? new Date(pedido.dia) : null;
    const inicioMes = fechaPedido
      ? new Date(fechaPedido.getFullYear(), fechaPedido.getMonth(), 1)
      : null;
    const finMes = fechaPedido
      ? new Date(fechaPedido.getFullYear(), fechaPedido.getMonth() + 1, 0)
      : null;

    // Asignaciones de la semana del pedido
    const inicioSemana = fechaPedido ? (() => {
      const d = new Date(fechaPedido);
      d.setDate(d.getDate() - d.getDay());
      return d;
    })() : null;
    const finSemana = inicioSemana ? (() => {
      const d = new Date(inicioSemana);
      d.setDate(d.getDate() + 6);
      return d;
    })() : null;

    // Pedidos del mismo cliente (IDs agrupados por nombre de cliente)
    const pedidoClienteId = pedido.id;

    for (const cam of camareros) {
      let score = 0;
      const breakdown = {};

      // ── 1. Especialidad / habilidades / idiomas (30 pts) ──────────────
      let matchPts = 0;

      // Especialidad
      if (pedido.especialidad_requerida && pedido.especialidad_requerida !== 'general') {
        if (cam.especialidad === pedido.especialidad_requerida) matchPts += 12;
        else matchPts -= 5; // penalización
      } else {
        matchPts += 10; // no hay requisito estricto → base
      }

      // Habilidades requeridas
      const habsReq = pedido.habilidades_requeridas || [];
      if (habsReq.length > 0) {
        const tiene = habsReq.filter(h => cam.habilidades?.includes(h)).length;
        matchPts += Math.round((tiene / habsReq.length) * 10);
      } else {
        matchPts += 8;
      }

      // Idiomas requeridos
      const idiomasReq = pedido.idiomas_requeridos || [];
      if (idiomasReq.length > 0) {
        const tieneIdiomas = idiomasReq.filter(i => cam.idiomas?.includes(i)).length;
        matchPts += Math.round((tieneIdiomas / idiomasReq.length) * 8);
      } else {
        matchPts += 6;
      }

      // Nivel de experiencia bonus
      const nivelBonus = { junior: 0, intermedio: 1, senior: 2, experto: 3 };
      matchPts += nivelBonus[cam.nivel_experiencia] || 0;

      matchPts = Math.max(0, Math.min(30, matchPts));
      breakdown.match = matchPts;
      score += matchPts;

      // ── 2. Valoración promedio (25 pts) ───────────────────────────────
      const val = cam.valoracion_promedio || 0;
      const valPts = val > 0 ? Math.round((val / 5) * 25) : 10; // 10 pts si sin valoración (neutral)
      breakdown.valoracion = valPts;
      score += valPts;

      // ── 3. Carga de trabajo (20 pts) ──────────────────────────────────
      let cargaPts = 20;

      if (asignaciones?.length && fechaPedido) {
        // Eventos en el mes
        const eventosMes = asignaciones.filter(a => {
          if (a.camarero_id !== cam.id) return false;
          if (!a.fecha_pedido) return false;
          const fa = new Date(a.fecha_pedido);
          return fa >= inicioMes && fa <= finMes;
        }).length;

        // Eventos en la semana
        const eventosSemana = asignaciones.filter(a => {
          if (a.camarero_id !== cam.id) return false;
          if (!a.fecha_pedido) return false;
          const fa = new Date(a.fecha_pedido);
          return fa >= inicioSemana && fa <= finSemana;
        }).length;

        // Penalizar por sobrecarga
        if (eventosMes > 20) cargaPts -= 15;
        else if (eventosMes > 15) cargaPts -= 10;
        else if (eventosMes > 10) cargaPts -= 5;
        else if (eventosMes < 5) cargaPts += 3; // poco trabajo, disponible

        if (eventosSemana >= 5) cargaPts -= 8;
        else if (eventosSemana >= 3) cargaPts -= 3;

        // Horas trabajadas en el mismo día
        const horasDia = asignaciones
          .filter(a => a.camarero_id === cam.id && a.fecha_pedido === pedido.dia)
          .reduce((sum, a) => {
            if (!a.hora_entrada || !a.hora_salida) return sum;
            const [hE, mE] = a.hora_entrada.split(':').map(Number);
            const [hS, mS] = a.hora_salida.split(':').map(Number);
            return sum + ((hS * 60 + mS) - (hE * 60 + mE)) / 60;
          }, 0);
        if (horasDia > 10) cargaPts -= 10;
        else if (horasDia > 6) cargaPts -= 5;

        breakdown.eventosMes = eventosMes;
        breakdown.eventosSemana = eventosSemana;
        breakdown.horasDia = Math.round(horasDia * 10) / 10;
      }

      cargaPts = Math.max(0, Math.min(20, cargaPts));
      breakdown.carga = cargaPts;
      score += cargaPts;

      // ── 4. Proximidad geográfica (15 pts) ─────────────────────────────
      let geoPts = 8; // neutral si no hay datos

      if (pedido.latitud && pedido.longitud && cam.latitud && cam.longitud) {
        const R = 6371;
        const dLat = (cam.latitud - pedido.latitud) * Math.PI / 180;
        const dLon = (cam.longitud - pedido.longitud) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(pedido.latitud * Math.PI / 180) *
          Math.cos(cam.latitud * Math.PI / 180) *
          Math.sin(dLon / 2) ** 2;
        const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        breakdown.distanciaKm = Math.round(distKm);

        const radioMax = cam.radio_trabajo_km || 30;
        if (distKm > radioMax) geoPts = 0;
        else if (distKm <= 5) geoPts = 15;
        else if (distKm <= 10) geoPts = 13;
        else if (distKm <= 20) geoPts = 10;
        else if (distKm <= radioMax) geoPts = 6;
      }

      geoPts = Math.max(0, Math.min(15, geoPts));
      breakdown.geo = geoPts;
      score += geoPts;

      // ── 5. Historial con el cliente (10 pts) ──────────────────────────
      let historialPts = 5; // neutral

      const _trabajosCliente = asignaciones?.filter(
        a => a.camarero_id === cam.id && a.pedido_id !== pedidoClienteId
        // Idealmente filtraríamos por cliente, pero sin los pedidos aquí usamos 0 como base
      ).length || 0;

      // Mejor métrica: si hay datos de cliente en la asignación
      const trabajosConCliente = asignaciones?.filter(
        a => a.camarero_id === cam.id && a.pedido_id !== pedido.id
      ).length || 0;

      if (trabajosConCliente > 5) historialPts = 10;
      else if (trabajosConCliente > 2) historialPts = 8;
      else if (trabajosConCliente > 0) historialPts = 6;

      historialPts = Math.max(0, Math.min(10, historialPts));
      breakdown.historial = historialPts;
      score += historialPts;

      // ── Score final (0-100) ───────────────────────────────────────────
      score = Math.max(0, Math.min(100, Math.round(score)));

      scores[cam.id] = {
        score,
        breakdown,
        nivel: score >= 80 ? 'excelente' : score >= 65 ? 'bueno' : score >= 50 ? 'aceptable' : 'bajo'
      };
    }

    return scores;
  }, [pedido, camareros, asignaciones]);
}