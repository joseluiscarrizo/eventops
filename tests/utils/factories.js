import pedidosData from '../fixtures/pedidos.json';
import camarerosData from '../fixtures/camareros.json';
import asignacionesData from '../fixtures/asignaciones.json';
import coordinadoresData from '../fixtures/coordinadores.json';

let idCounter = 1000;
const nextId = () => `generated-${++idCounter}`;

export const createPedido = (overrides = {}) => ({
  id: nextId(),
  codigo_pedido: `EVT-${String(idCounter).padStart(3, '0')}`,
  cliente: 'Cliente Test',
  cliente_id: 'cliente-test',
  cliente_email_1: 'test@example.com',
  cliente_telefono_1: '+34 600 000 000',
  cliente_persona_contacto_1: 'Contacto Test',
  lugar_evento: 'Lugar de Prueba',
  dia: '2026-06-01',
  turnos: [
    { nombre: 'Turno Test', hora_inicio: '18:00', hora_fin: '23:00', num_camareros: 2 }
  ],
  camisa: 'blanca',
  extra_transporte: false,
  notas: '',
  estado: 'activo',
  ...overrides
});

export const createCamarero = (overrides = {}) => ({
  id: nextId(),
  nombre: 'Camarero Test',
  email: 'camarero@test.com',
  telefono: '+34 600 000 100',
  especialidad: 'eventos',
  nivel: 'senior',
  habilidades: ['servicio de mesa'],
  valoracion: 4.0,
  estado_actual: 'disponible',
  coordinador_id: 'coordinador-1',
  ...overrides
});

export const createAsignacion = (overrides = {}) => ({
  id: nextId(),
  pedido_id: 'pedido-1',
  camarero_id: 'camarero-1',
  turno_index: 0,
  estado: 'pendiente',
  fecha_asignacion: '2026-02-20',
  hora_salida: '17:30',
  notas: '',
  ...overrides
});

export const createCoordinador = (overrides = {}) => ({
  id: nextId(),
  nombre: 'Coordinador Test',
  email: 'coord@test.com',
  telefono: '+34 600 999 000',
  whatsapp: '+34 600 999 000',
  activo: true,
  ...overrides
});

export const fixtures = {
  pedidos: pedidosData,
  camareros: camarerosData,
  asignaciones: asignacionesData,
  coordinadores: coordinadoresData
};
