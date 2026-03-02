# 🎬 DEMO_FLOW.md — Guion de Demostración EventOps
**Versión:** 1.0  
**Fecha:** 2026-03-02  
**Duración objetivo:** 10–15 minutos  
**Audiencia:** Inversores (ronda de financiación)

---

## 🎯 Objetivo de la Demo

Demostrar que EventOps resuelve un problema real: la gestión operativa caótica de empresas de catering y organización de eventos. Mostrar fluidez, velocidad y valor de negocio en menos de 15 minutos.

---

## 📋 Pre-requisitos (verificar ANTES de la demo)

- [ ] App deployada y accesible en producción
- [ ] Cuenta de demo activa (ver `DEMO_CREDENTIALS.md`)
- [ ] 8 eventos de demo cargados
- [ ] 25 empleados de demo cargados
- [ ] 5 clientes de demo cargados
- [ ] 15 turnos de demo cargados
- [ ] QR codes generados para check-in
- [ ] Conexión a internet estable
- [ ] Pantalla configurada en 1920×1080 o similar
- [ ] Plan B listo (ver `BACKUP_PLAN.md`)

---

## 🎭 Los 8 Actos del Guion

### **Acto 1 — El Problema (1 min)**
> *Arrancar con el dolor, no con la solución.*

**Guion:**
> "Hoy, el 80% de las empresas de catering gestionan sus eventos con WhatsApp, Excel y llamadas de teléfono. Un error en la asignación de personal cuesta de media 2.000€ por evento. EventOps elimina ese caos."

**Acción:** Mostrar el Dashboard con KPIs en tiempo real.

---

### **Acto 2 — Dashboard en Vivo (2 min)**
> *Impacto visual inmediato.*

**Pasos:**
1. Hacer login con la cuenta de demo
2. Mostrar el Dashboard principal
3. Señalar: eventos activos, personal asignado, pedidos pendientes, alertas
4. Destacar que todo se actualiza en tiempo real

**Frase clave:**
> "En 5 segundos, el coordinador sabe exactamente qué está pasando en todos sus eventos."

---

### **Acto 3 — Crear un Evento en Vivo (2 min)**
> *Demostrar velocidad y UX.*

**Pasos:**
1. Navegar a Eventos → "Nuevo evento"
2. Rellenar: nombre "Gala Inversores 2026", fecha de hoy, lugar "Hotel Ritz Madrid", tipo "Restauración", 150 comensales
3. Guardar
4. Mostrar que aparece inmediatamente en el calendario

**Frase clave:**
> "Lo que antes eran 3 correos y 2 llamadas, ahora son 30 segundos."

---

### **Acto 4 — Asignación de Personal (2 min)**
> *El diferencial operativo.*

**Pasos:**
1. Abrir el evento recién creado
2. Ir al panel de asignación de turnos
3. Asignar 3 empleados del equipo de demo (arrastrar y soltar o dropdown)
4. Mostrar que el sistema valida disponibilidad automáticamente
5. Guardar asignaciones

**Frase clave:**
> "El sistema detecta conflictos de horario y perfiles automáticamente. Sin llamadas, sin errores."

---

### **Acto 5 — Check-In QR (2 min)**
> *La magia en el día del evento.*

**Pasos:**
1. Abrir un evento de demo activo (estado "En curso")
2. Navegar al panel de check-in
3. Mostrar el QR code generado para el evento
4. Simular un check-in de empleado escaneando el QR (o usando el botón manual)
5. Mostrar el cambio de estado en tiempo real: Pendiente → Check-in

**Frase clave:**
> "El día del evento, el coordinador sabe en segundos quién llegó y quién falta."

---

### **Acto 6 — Integraciones (1 min)**
> *EventOps no vive solo.*

**Pasos:**
1. Mostrar la integración con Google Calendar (sincronización bidireccional)
2. Mostrar el panel de HubSpot CRM (cliente vinculado al evento)
3. Mencionar las 15 funciones serverless que trabajan en segundo plano

**Frase clave:**
> "Se integra con las herramientas que ya usan: Google Calendar, HubSpot, y tiene una API abierta para lo que necesiten."

---

### **Acto 7 — Reportes / Analytics (1 min)**
> *El negocio en números.*

**Pasos:**
1. Navegar a Informes
2. Mostrar el tab General: eventos por mes, pedidos por estado
3. Mostrar el tab Por cliente: qué clientes generan más actividad
4. Mostrar la exportación a CSV con un clic

**Frase clave:**
> "Fin de mes, el informe está listo en 10 segundos, no en 3 horas."

---

### **Acto 8 — Cierre y Tracción (2 min)**
> *Convertir interés en acción.*

**Guion:**
> "EventOps está en producción. Tenemos X clientes activos, gestionamos Y eventos al mes, y procesamos Z pedidos. Buscamos [X€] para escalar comercialmente en [mercados objetivo]."

**Mostrar:**
- Métricas de uso reales (o de demo si es pre-lanzamiento)
- Pricing tier (si está disponible)
- Roadmap de los próximos 6 meses

---

## ⏱️ Control de Tiempos

| Acto | Contenido | Tiempo |
|------|-----------|--------|
| 1 | El Problema | 1 min |
| 2 | Dashboard | 2 min |
| 3 | Crear evento | 2 min |
| 4 | Asignación personal | 2 min |
| 5 | Check-in QR | 2 min |
| 6 | Integraciones | 1 min |
| 7 | Reportes | 1 min |
| 8 | Cierre | 2 min |
| **Total** | | **13 min** |

Reservar 5 minutos para preguntas.

---

## ❓ Preguntas Frecuentes de Inversores

| Pregunta | Respuesta sugerida |
|----------|--------------------|
| ¿Cuántos clientes tienen? | [respuesta real] |
| ¿Cómo es el modelo de pricing? | SaaS mensual por número de eventos/usuarios |
| ¿Qué diferencia a EventOps de Excel/WhatsApp? | Tiempo real, integrations, no errores humanos, auditoría completa |
| ¿Por qué Base44? | Velocidad de desarrollo, backend serverless, sin servidores que mantener |
| ¿Qué pasa si se cae internet? | Ver BACKUP_PLAN.md — modo offline / pantalla de fallback |
| ¿Hay app móvil? | Web app responsive optimizada para móvil; app nativa en roadmap |

---

## 🚫 Qué NO hacer durante la demo

- No mostrar la consola del navegador abierta
- No navegar a páginas incompletas o en construcción
- No revelar credenciales reales en pantalla
- No improvisar flujos no probados
- No exceder los 15 minutos
