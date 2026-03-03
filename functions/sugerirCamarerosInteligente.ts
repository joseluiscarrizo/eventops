import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'coordinador')) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { pedido_id, limite = 10 } = await req.json();

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id es requerido' }, { status: 400 });
    }

    // Obtener pedido
    const pedido = await base44.asServiceRole.entities.Pedido.get(pedido_id);
    if (!pedido) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Obtener todos los camareros activos
    const camareros = await base44.asServiceRole.entities.Camarero.filter({
      disponible: true,
      en_reserva: false
    });

    if (camareros.length === 0) {
      return Response.json({ 
        sugerencias: [],
        mensaje: 'No hay camareros disponibles'
      });
    }

    // Obtener disponibilidades
    const disponibilidades = await base44.asServiceRole.entities.Disponibilidad.filter({
      fecha: pedido.dia
    });

    // Obtener valoraciones
    const valoraciones = await base44.asServiceRole.entities.Valoracion.list();

    // Obtener asignaciones previas del mismo cliente
    const pedidosCliente = await base44.asServiceRole.entities.Pedido.filter({
      cliente: pedido.cliente
    });
    const pedidosClienteIds = pedidosCliente.map(p => p.id);
    
    const asignacionesPrevias = await base44.asServiceRole.entities.AsignacionCamarero.list();
    const asignacionesCliente = asignacionesPrevias.filter(a => 
      pedidosClienteIds.includes(a.pedido_id)
    );

    // Obtener asignaciones del día del evento y días cercanos
    const asignacionesDia = asignacionesPrevias.filter(a => a.fecha_pedido === pedido.dia);
    
    // Obtener reglas de asignación activas
    const reglasAsignacion = await base44.asServiceRole.entities.ReglaAsignacion.filter({ activa: true });

    // Preparar datos para IA
    const datosPedido = {
      fecha: pedido.dia,
      hora_entrada: pedido.entrada || pedido.turnos?.[0]?.entrada,
      hora_salida: pedido.salida || pedido.turnos?.[0]?.salida,
      lugar: pedido.lugar_evento,
      ubicacion: {
        latitud: pedido.latitud,
        longitud: pedido.longitud,
        direccion: pedido.direccion_completa
      },
      cliente: pedido.cliente,
      especialidad_requerida: pedido.especialidad_requerida,
      habilidades_requeridas: pedido.habilidades_requeridas || [],
      idiomas_requeridos: pedido.idiomas_requeridos || [],
      cantidad_necesaria: pedido.cantidad_camareros || pedido.turnos?.[0]?.cantidad_camareros || 1,
      notas: pedido.notas
    };

    const datosCamareros = camareros.map(cam => {
      // Disponibilidad del día
      const dispDia = disponibilidades.find(d => d.camarero_id === cam.id);
      
      // Valoraciones del camarero
      const valorsCam = valoraciones.filter(v => v.camarero_id === cam.id);
      const valoracionPromedio = valorsCam.length > 0
        ? valorsCam.reduce((sum, v) => sum + (v.puntuacion || 0), 0) / valorsCam.length
        : cam.valoracion_promedio || 0;

      // Asignaciones previas con este cliente
      const trabajosCliente = asignacionesCliente.filter(a => a.camarero_id === cam.id);

      // Conflictos de horario y eventos consecutivos
      const asigDia = asignacionesDia.filter(a => a.camarero_id === cam.id);
      
      // Calcular eventos del mes
      const fechaPedido = new Date(pedido.dia);
      const inicioMes = new Date(fechaPedido.getFullYear(), fechaPedido.getMonth(), 1);
      const finMes = new Date(fechaPedido.getFullYear(), fechaPedido.getMonth() + 1, 0);
      const eventosMes = asignacionesPrevias.filter(a => {
        const fechaAsig = new Date(a.fecha_pedido);
        return a.camarero_id === cam.id && 
               fechaAsig >= inicioMes && 
               fechaAsig <= finMes &&
               (a.estado === 'confirmado' || a.estado === 'alta');
      }).length;
      
      // Eventos próximos (24-48h antes/después)
      const fechaEvento = new Date(pedido.dia);
      const eventosProximos = asignacionesPrevias.filter(a => {
        if (a.camarero_id !== cam.id) return false;
        const fechaAsig = new Date(a.fecha_pedido);
        const diferenciaDias = Math.abs((fechaAsig - fechaEvento) / (1000 * 60 * 60 * 24));
        return diferenciaDias < 2 && diferenciaDias > 0;
      });
      
      // Historial de rendimiento reciente (últimos 5 eventos)
      const valoracionesRecientes = valorsCam
        .sort((a, b) => new Date(b.fecha_evento) - new Date(a.fecha_evento))
        .slice(0, 5);
      const rendimientoReciente = valoracionesRecientes.length > 0
        ? valoracionesRecientes.reduce((sum, v) => sum + (v.puntuacion || 0), 0) / valoracionesRecientes.length
        : null;

      // Calcular distancia si hay coordenadas
      let distanciaKm = null;
      if (pedido.latitud && pedido.longitud && cam.latitud && cam.longitud) {
        const R = 6371; // Radio tierra en km
        const dLat = (cam.latitud - pedido.latitud) * Math.PI / 180;
        const dLon = (cam.longitud - pedido.longitud) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(pedido.latitud * Math.PI / 180) * Math.cos(cam.latitud * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distanciaKm = R * c;
      }

      return {
        id: cam.id,
        nombre: cam.nombre,
        codigo: cam.codigo,
        especialidad: cam.especialidad,
        nivel_experiencia: cam.nivel_experiencia,
        experiencia_anios: cam.experiencia_anios,
        habilidades: cam.habilidades || [],
        idiomas: cam.idiomas || [],
        valoracion_promedio: valoracionPromedio,
        total_valoraciones: valorsCam.length,
        disponibilidad_dia: dispDia ? dispDia.tipo : 'disponible',
        motivo_no_disponible: dispDia?.motivo,
        preferencias_horarias: cam.preferencias_horarias,
        trabajos_previos_cliente: trabajosCliente.length,
        ultima_valoracion_cliente: trabajosCliente.length > 0 
          ? valoraciones.find(v => v.camarero_id === cam.id && v.pedido_id === trabajosCliente[0].pedido_id)?.puntuacion 
          : null,
        distancia_km: distanciaKm,
        radio_trabajo_km: cam.radio_trabajo_km,
        conflictos_horario: asigDia.map(a => ({
          hora_entrada: a.hora_entrada,
          hora_salida: a.hora_salida
        })),
        eventos_mes_actual: eventosMes,
        tiene_eventos_proximos: eventosProximos.length > 0,
        eventos_proximos_detalles: eventosProximos.map(e => ({
          fecha: e.fecha_pedido,
          diferencia_dias: Math.abs((new Date(e.fecha_pedido) - fechaEvento) / (1000 * 60 * 60 * 24))
        })),
        rendimiento_reciente: rendimientoReciente,
        valoraciones_recientes_count: valoracionesRecientes.length
      };
    });

    // Preparar información de reglas para la IA
    const reglasInfo = reglasAsignacion.map(r => ({
      nombre: r.nombre,
      tipo: r.tipo_regla,
      prioridad: r.prioridad,
      es_obligatoria: r.es_obligatoria,
      bonus_puntos: r.bonus_puntos,
      cliente_aplicable: r.aplicar_solo_cliente_id || r.cliente_id,
      criterios: {
        valoracion_minima: r.valoracion_minima,
        distancia_maxima_km: r.distancia_maxima_km,
        experiencia_minima_anios: r.experiencia_minima_anios,
        horas_descanso_entre_eventos: r.horas_descanso_entre_eventos,
        max_eventos_por_mes: r.max_eventos_por_mes,
        puntuacion_minima_ultimos_eventos: r.puntuacion_minima_ultimos_eventos,
        cantidad_eventos_historial: r.cantidad_eventos_historial
      }
    }));

    // Usar IA para analizar y rankear camareros
    const analisisIA = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Eres un sistema experto en asignación de personal de catering y eventos.

Analiza el siguiente evento y la lista de camareros disponibles. Debes generar un ranking inteligente de los mejores camareros para este trabajo, considerando:

**CRITERIOS PRINCIPALES (Orden de importancia):**

1. **Disponibilidad y Conflictos**: ⚠️ PRIORITARIO
   - No asignar si está explícitamente no disponible
   - Verificar conflictos de horario el mismo día
   - Considerar eventos consecutivos (menos de 8h de descanso)
   - Penalizar si tiene muchos eventos este mes

2. **Historial de Rendimiento**: ⭐ MUY IMPORTANTE
   - Valoración promedio general
   - Tendencia en últimas 5 valoraciones (rendimiento_reciente)
   - Consistencia en el desempeño
   - Historial específico con este cliente si existe

3. **Especialización y Habilidades**: 🎯 IMPORTANTE
   - Match con especialidad requerida del evento
   - Habilidades específicas necesarias
   - Idiomas requeridos
   - Experiencia en años

4. **Proximidad Geográfica**: 📍 IMPORTANTE
   - Distancia al evento en km
   - Dentro de su radio de trabajo preferido
   - Coste de transporte implícito

5. **Preferencias y Bienestar**: 💚 MODERADO
   - Preferencias horarias del camarero
   - Carga de trabajo actual (eventos_mes_actual)
   - Balance vida-trabajo

**REGLAS DE ASIGNACIÓN CONFIGURADAS:**
${reglasInfo.length > 0 ? JSON.stringify(reglasInfo, null, 2) : 'Ninguna regla personalizada configurada'}

**IMPORTANTE:** Aplica las reglas obligatorias estrictamente. Las reglas no obligatorias otorgan bonus/penalizaciones al score.

EVENTO:
${JSON.stringify(datosPedido, null, 2)}

CAMAREROS DISPONIBLES:
${JSON.stringify(datosCamareros, null, 2)}

Genera un ranking de los mejores ${limite} camareros ordenados por idoneidad. Para cada uno:
- Calcula un score de 0-100 (100 = perfecto)
- Aplica las reglas de asignación configuradas
- Identifica fortalezas específicas
- Señala cualquier consideración, limitación o alerta
- Proporciona una recomendación clara y justificada

⚠️ NO SUGIERAS camareros que:
- Estén explícitamente no disponibles
- Tengan conflictos graves de horario
- No cumplan reglas obligatorias
- Tengan eventos a menos de 8h de distancia (sin descanso suficiente)`,
      response_json_schema: {
        type: "object",
        properties: {
          ranking: {
            type: "array",
            items: {
              type: "object",
              properties: {
                camarero_id: { type: "string" },
                nombre: { type: "string" },
                score: { type: "number" },
                nivel_recomendacion: { 
                  type: "string",
                  enum: ["excelente", "muy_bueno", "bueno", "aceptable", "no_recomendado"]
                },
                fortalezas: {
                  type: "array",
                  items: { type: "string" }
                },
                consideraciones: {
                  type: "array",
                  items: { type: "string" }
                },
                razon_principal: { type: "string" },
                disponible: { type: "boolean" }
              }
            }
          },
          resumen_analisis: { type: "string" },
          alertas: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Enriquecer con datos completos del camarero
    const sugerenciasEnriquecidas = analisisIA.ranking.map(sugerencia => {
      const camarero = camareros.find(c => c.id === sugerencia.camarero_id);
      const datosAnalisis = datosCamareros.find(d => d.id === sugerencia.camarero_id);
      
      return {
        ...sugerencia,
        camarero: {
          id: camarero.id,
          nombre: camarero.nombre,
          codigo: camarero.codigo,
          telefono: camarero.telefono,
          especialidad: camarero.especialidad,
          experiencia_anios: camarero.experiencia_anios,
          valoracion_promedio: datosAnalisis.valoracion_promedio,
          distancia_km: datosAnalisis.distancia_km
        }
      };
    });

    return Response.json({
      success: true,
      pedido_id: pedido_id,
      evento: {
        cliente: pedido.cliente,
        fecha: pedido.dia,
        lugar: pedido.lugar_evento
      },
      total_candidatos: camareros.length,
      sugerencias: sugerenciasEnriquecidas,
      resumen: analisisIA.resumen_analisis,
      alertas: analisisIA.alertas || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en sugerirCamarerosInteligente:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});