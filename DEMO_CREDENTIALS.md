# 🔐 DEMO_CREDENTIALS.md — Credenciales de Demo
**Versión:** 1.0  
**Fecha:** 2026-03-02  
**IMPORTANTE:** Este archivo contiene credenciales de DEMO solamente. No usar en producción.

> ⚠️ **SEGURIDAD:** Este archivo NO debe ser subido a repositorios públicos con credenciales reales.  
> En producción, usar un gestor de secretos (AWS Secrets Manager, 1Password, etc.)

---

## 🌐 Acceso a la Aplicación

| Campo | Valor |
|-------|-------|
| URL de producción | `https://[APP_URL].base44.app` |
| URL de staging | `https://[STAGING_URL].base44.app` |
| Admin panel Base44 | `https://base44.com` |

---

## 👤 Cuentas de Demo

### Cuenta Administrador (para demo principal)
| Campo | Valor |
|-------|-------|
| Email | `demo-admin@eventops.demo` |
| Contraseña | `[DEMO_PASSWORD]` |
| Rol | Administrador |
| Descripción | Acceso completo — usar para la demo con inversores |

### Cuenta Coordinador (para demostrar RBAC)
| Campo | Valor |
|-------|-------|
| Email | `demo-coordinador@eventops.demo` |
| Contraseña | `[DEMO_PASSWORD]` |
| Rol | Coordinador |
| Descripción | Acceso restringido — usar para mostrar control de roles |

### Cuenta Empleado (para demostrar check-in)
| Campo | Valor |
|-------|-------|
| Email | `demo-empleado@eventops.demo` |
| Contraseña | `[DEMO_PASSWORD]` |
| Rol | Empleado |
| Descripción | Solo check-in — usar para demostrar el flujo QR |

---

## 🗃️ Datos de Demo Precargados

### Eventos (8 total)
| # | Nombre | Estado | Fecha |
|---|--------|--------|-------|
| 1 | Boda García-Martínez | Completado | Pasado |
| 2 | Gala Corporativa ACME | Completado | Pasado |
| 3 | Cóctel Lanzamiento Producto | En curso | Hoy |
| 4 | Banquete Aniversario XYZ | Confirmado | Próximo |
| 5 | Catering Congreso Tech Madrid | Confirmado | Próximo |
| 6 | Brunch Equipo Directivo | Pendiente | Próximo |
| 7 | Gala Benéfica Fundación | Publicado | Próximo |
| 8 | Cena Navidad Empresa | Publicado | Próximo |

### Empleados (25 total)
Perfiles: Camarero (10), Chef (5), Coordinador (4), Ayudante cocina (4), Sommelier (2)

### Clientes (5 total)
| # | Nombre | Tipo |
|---|--------|------|
| 1 | Grupo ACME España | Corporativo |
| 2 | Familia García | Particular |
| 3 | Tech Madrid S.L. | Corporativo |
| 4 | Fundación Solidaria | ONG |
| 5 | Hotel Gran Vía | B2B |

### Turnos (15 total)
Asignados a los eventos 3, 4 y 5 con personal activo.

### QR Codes
QR codes generados para los eventos en estado "En curso" y "Confirmado".

---

## 🔗 Integraciones de Demo

### Google Calendar
| Campo | Valor |
|-------|-------|
| Cuenta | `demo@eventops.demo` (cuenta Google de demo) |
| Calendario | "EventOps Demo Calendar" |
| Estado | Sincronización activa |

### HubSpot CRM
| Campo | Valor |
|-------|-------|
| Portal ID | `[HUBSPOT_PORTAL_ID]` |
| API Key | Configurada en variables de entorno |
| Empresa demo | "Grupo ACME España" en HubSpot |

---

## 🔧 Variables de Entorno de Demo

```env
VITE_BASE44_APP_ID=your_app_id_here
VITE_BASE44_FUNCTIONS_VERSION=your_version_here
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
```

> Ver `.env.example` en la raíz del proyecto para la lista completa.

---

## 📱 Datos para QR de Demo

Para el Acto 5 (Check-In QR), el código QR apunta al evento:
- **Evento:** "Cóctel Lanzamiento Producto" (evento #3, estado "En curso")
- **URL de check-in:** `https://[APP_URL].base44.app/check-in/[EVENT_ID]`

---

## 🔄 Cómo Restaurar los Datos de Demo

Si los datos se modifican durante la demo y necesitas restaurarlos:

1. Ir al panel de administración de Base44
2. Usar el script de seed (contactar al tech lead para acceso)
3. O alternativamente, usar la cuenta de backup (ver `BACKUP_PLAN.md`)

---

## ⏰ Vigencia de las Credenciales

Las credenciales de demo son válidas hasta: **2026-06-30**  
Responsable de renovación: Tech Lead / CTO
