# 🆘 BACKUP_PLAN.md — Plan de Contingencia para la Demo
**Versión:** 1.0  
**Fecha:** 2026-03-02  
**Para:** Equipo técnico y presentador

---

## 🎯 Objetivo

Este documento define el plan de contingencia ("Plan B") para la demo de EventOps ante inversores, cubriendo los escenarios de fallo más probables y su resolución en menos de 2 minutos.

---

## 🚨 Árbol de Decisión Rápido

```
¿La app carga? 
  ├── SÍ → ¿Funciona el login?
  │         ├── SÍ → Demo normal ✅
  │         └── NO → Plan B1 (sesión pre-autenticada)
  └── NO → ¿Hay internet?
            ├── SÍ → Plan B2 (reiniciar / staging)
            └── NO → Plan B3 (demo offline / vídeo)
```

---

## 📋 Escenarios de Contingencia

### Plan B1 — Fallo de Autenticación
**Síntoma:** El login no funciona, error de autenticación.  
**Causa probable:** Token expirado, problema con Base44 Auth.

**Solución:**
1. Abrir una pestaña del navegador con la sesión pre-guardada (preparar ANTES)
2. Si no funciona, abrir el navegador de respaldo (otro dispositivo ya logueado)
3. Si ninguno funciona → saltar a Plan B3

**Tiempo máximo:** 1 minuto

---

### Plan B2 — App no carga (con internet)
**Síntoma:** La URL de producción no responde o da error 500.  
**Causa probable:** Problema de deploy, CDN, o servicio Base44.

**Solución:**
1. Cambiar a la URL de staging: `https://[STAGING_URL].base44.app`
2. Si staging tampoco funciona → saltar a Plan B3

**Tiempo máximo:** 30 segundos

---

### Plan B3 — Sin internet / App completamente caída
**Síntoma:** No hay conectividad o ningún entorno funciona.  
**Causa probable:** Red del venue, corte de luz, fallo total.

**Solución:**
1. Activar hotspot del móvil personal del presentador
2. Abrir el vídeo de demo pregrabado (guardar offline ANTES en el portátil)
3. Si no hay vídeo: usar las capturas de pantalla del PDF de demo

**Tiempo máximo:** 2 minutos

---

### Plan B4 — Datos de demo corruptos o vacíos
**Síntoma:** La app carga pero no hay datos (eventos, empleados, etc. en 0).  
**Causa probable:** Alguien limpió la base de datos de demo.

**Solución:**
1. Cambiar al "Tenant de backup" en Base44 (preparar cuenta secundaria con datos)
2. Hacer logout e iniciar sesión con la cuenta de backup (ver `DEMO_CREDENTIALS.md`)

**Tiempo máximo:** 1 minuto

---

### Plan B5 — Fallo de integración (Google Calendar / HubSpot)
**Síntoma:** La sincronización con Google Calendar o HubSpot falla.  
**Causa probable:** Token de OAuth expirado, cambio de API, rate limit.

**Solución:**
1. **No mostrar esa integración** — saltar directamente al siguiente acto del guion
2. Mencionar verbalmente: "La integración bidireccional con Google Calendar y HubSpot ya está implementada; os la mostramos en la siguiente sesión con más detalle"
3. Continuar con el flujo principal

**Tiempo máximo:** 0 minutos (saltar sin detenerse)

---

### Plan B6 — Error de QR / Check-in no funciona
**Síntoma:** El QR code no escanea o el check-in falla.  
**Causa probable:** Bug en el generador de QR, cámara no disponible.

**Solución:**
1. Usar el check-in manual desde el panel de administración (botón "Check-in manual")
2. Mostrar el mismo resultado (cambio de estado Pendiente → Check-in)
3. Mencionar: "El QR es la vía rápida; los coordinadores también pueden hacer check-in manual desde el panel"

**Tiempo máximo:** 30 segundos

---

## 🗂️ Kit de Emergencia (preparar ANTES de la demo)

### En el portátil del presentador (offline):
- [ ] Vídeo de demo pregrabado (MP4, ≤5 min, narrado)
- [ ] PDF con capturas de pantalla de todos los actos del guion
- [ ] Segundo navegador (Firefox/Chrome) con sesión activa en cache
- [ ] Hotspot del móvil configurado y probado

### En la nube (acceso remoto):
- [ ] Credenciales de cuenta de backup (ver `DEMO_CREDENTIALS.md`)
- [ ] URL de staging verificada y funcionando
- [ ] Acceso al panel Base44 para restaurar datos si es necesario

---

## 📞 Contactos de Emergencia

| Rol | Responsabilidad | Contacto |
|-----|----------------|---------|
| Tech Lead | Problemas de app / backend | [Telegram/WhatsApp] |
| DevOps | Problemas de infraestructura | [Telegram/WhatsApp] |
| CEO / Presentador | Decisión final sobre Plan B | [Teléfono] |

---

## ✅ Checklist Pre-Demo (día anterior)

- [ ] Verificar que la app de producción carga correctamente
- [ ] Verificar login con las 3 cuentas de demo
- [ ] Verificar que los 8 eventos están cargados
- [ ] Verificar que los 25 empleados están cargados
- [ ] Verificar que los 5 clientes están cargados
- [ ] Verificar que los 15 turnos están asignados
- [ ] Verificar que los QR codes se generan correctamente
- [ ] Verificar integraciones (Google Calendar sync, HubSpot sync)
- [ ] Grabar vídeo de demo como backup
- [ ] Guardar PDF de capturas offline
- [ ] Probar hotspot del móvil en la red del venue
- [ ] Ensayar el guion completo con cronómetro

---

## 🕐 Protocolo durante la Demo

**Si algo falla:**
1. Mantener la calma — no mostrar pánico al inversor
2. Decir: "Déjame cambiar a [alternativa] para que lo veáis mejor"
3. Aplicar el Plan B correspondiente
4. Continuar con el guion

**Frase de transición universal:**
> "Mientras cargo esto, os cuento que uno de los diferenciadores clave de EventOps es..."

---

## 📝 Post-Demo: Registro de Incidencias

Si se usó algún plan de contingencia, documentar aquí para mejora continua:

| Fecha | Escenario | Plan usado | Resolución | Tiempo perdido |
|-------|-----------|-----------|------------|----------------|
| | | | | |
