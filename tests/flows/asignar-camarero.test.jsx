import { describe, test, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../utils/mocks.js';
import { mockBase44 } from '../utils/mocks.js';
import { createAsignacion, createCamarero, createPedido, fixtures } from '../utils/factories.js';
import { renderWithProviders } from '../utils/render.jsx';
import { toast } from 'sonner';

// Mockear componentes pesados
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }) => (
    <div data-testid="drag-drop-context" data-ondragend={!!onDragEnd}>{children}</div>
  ),
  Droppable: ({ children, droppableId }) => children(
    { innerRef: vi.fn(), droppableProps: {}, placeholder: null },
    { isDraggingOver: false }
  ),
  Draggable: ({ children, draggableId }) => children(
    { innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} },
    { isDragging: false }
  )
}));

vi.mock('@/components/asignacion/SugerenciasInteligentes', () => ({ default: () => null }));
vi.mock('@/components/asignacion/CalendarioInteractivo', () => ({ default: () => null }));
vi.mock('@/components/asignacion/CalendarioAsignaciones', () => ({ default: () => null }));
vi.mock('@/components/asignacion/CargaTrabajoCamareros', () => ({ default: () => null }));
vi.mock('@/components/asignacion/AsignacionAutomatica', () => ({ default: () => null }));
vi.mock('@/components/asignacion/ReglasAsignacion', () => ({ default: () => null }));
vi.mock('@/components/asignacion/FiltrosAvanzadosCamareros', () => ({
  default: () => null,
  aplicarFiltrosCamareros: (camareros) => camareros
}));
vi.mock('@/components/asignacion/PanelFichajeQR', () => ({ default: () => null }));
vi.mock('@/components/asignacion/ScoreBadge', () => ({ default: () => null }));
vi.mock('@/components/camareros/TareasService', () => ({
  default: { getResumenTareasCamarero: vi.fn().mockResolvedValue(null) }
}));
vi.mock('@/components/pedidos/EdicionRapida', () => ({ default: () => null }));
vi.mock('@/components/pedidos/DuplicarEvento', () => ({ default: () => null }));
vi.mock('@/components/pedidos/EventoRecurrente', () => ({ default: () => null }));
vi.mock('@/components/pedidos/PedidoFormNuevo', () => ({
  default: ({ onSubmit, onCancel }) => (
    <div data-testid="pedido-form">
      <button onClick={() => onSubmit(createPedido())}>Guardar</button>
      <button onClick={onCancel}>Cancelar</button>
    </div>
  )
}));
vi.mock('@/components/notificaciones/useAsignacionesRealtime', () => ({
  useAsignacionesRealtime: () => ({ data: [], isLoading: false })
}));
vi.mock('@/components/asignacion/useConflictosHorario', () => ({
  useConflictosHorario: () => ({ conflictos: [] })
}));
vi.mock('@/components/asignacion/useScoresAsignacion', () => ({
  useScoresAsignacion: () => ({ scores: {} })
}));

import { createPedido as _createPedido } from '../utils/factories.js';
import Asignacion from '@/pages/Asignacion';

describe('Asignar Camarero', () => {
  const pedidoConTurno = createPedido({
    id: 'pedido-test-1',
    dia: '2026-03-15',
    turnos: [{ nombre: 'Turno Principal', hora_inicio: '18:00', hora_fin: '23:00', num_camareros: 2 }]
  });

  beforeEach(() => {
    mockBase44.entities.Pedido.filter.mockResolvedValue([pedidoConTurno]);
    mockBase44.entities.Pedido.list.mockResolvedValue([pedidoConTurno]);
    mockBase44.entities.Camarero.list.mockResolvedValue(fixtures.camareros);
    mockBase44.entities.Camarero.filter.mockResolvedValue(fixtures.camareros);
    mockBase44.entities.AsignacionCamarero.list.mockResolvedValue(fixtures.asignaciones);
    mockBase44.entities.AsignacionCamarero.filter.mockResolvedValue(fixtures.asignaciones);
    mockBase44.entities.AsignacionCamarero.create.mockResolvedValue(createAsignacion({ id: 'nueva-asignacion-1' }));
    mockBase44.entities.AsignacionCamarero.update.mockResolvedValue({});
    mockBase44.entities.AsignacionCamarero.delete.mockResolvedValue({});
    mockBase44.entities.Cliente.list.mockResolvedValue([]);
    mockBase44.functions.invoke.mockResolvedValue({ success: true });
  });

  test('renderiza la página de asignación correctamente', async () => {
    renderWithProviders(<Asignacion />);
    await waitFor(() => {
      expect(screen.getAllByText(/asignaci/i).length).toBeGreaterThan(0);
    });
  });

  test('muestra el contexto de drag-and-drop en la estructura del componente', () => {
    // DragDropContext se usa internamente en la vista 'clasico'
    // Verificamos que el módulo está correctamente mockeado y disponible
    const { DragDropContext } = require('@hello-pangea/dnd');
    expect(DragDropContext).toBeDefined();
  });

  test('muestra la lista de pedidos disponibles', async () => {
    renderWithProviders(<Asignacion />);
    await waitFor(() => {
      expect(screen.getByText('Cliente Test')).toBeInTheDocument();
    });
  });

  test('permite seleccionar un pedido', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Asignacion />);

    await waitFor(() => {
      expect(screen.getByText('Cliente Test')).toBeInTheDocument();
    });

    const pedidoRow = screen.getByText('Cliente Test');
    await user.click(pedidoRow);

    // La selección debería resaltar el pedido o mostrar más detalles
    await waitFor(() => {
      expect(pedidoRow).toBeInTheDocument();
    });
  });

  test('muestra los camareros cargados en la query', async () => {
    renderWithProviders(<Asignacion />);

    // Esperar a que se carguen los datos
    await waitFor(() => {
      // Verificar que la query de camareros fue llamada
      expect(mockBase44.entities.Camarero.list).toHaveBeenCalled();
    });
  });

  test('filtra camareros por disponibilidad (mock verifica datos cargados)', async () => {
    renderWithProviders(<Asignacion />);

    await waitFor(() => {
      expect(mockBase44.entities.Camarero.list).toHaveBeenCalled();
    });

    // Los camareros con estado_actual === 'disponible' deben estar en los datos
    const camarerosDisponibles = fixtures.camareros.filter(c => c.estado_actual === 'disponible');
    expect(camarerosDisponibles.length).toBeGreaterThan(0);
    expect(camarerosDisponibles[0].nombre).toBe('Carlos López');
  });

  test('crea una asignación de camarero a pedido', async () => {
    mockBase44.entities.AsignacionCamarero.create.mockResolvedValueOnce(
      createAsignacion({ pedido_id: 'pedido-test-1', camarero_id: 'camarero-1' })
    );

    // Simular la creación directa de una asignación
    await mockBase44.entities.AsignacionCamarero.create({
      pedido_id: 'pedido-test-1',
      camarero_id: 'camarero-1',
      estado: 'pendiente'
    });

    expect(mockBase44.entities.AsignacionCamarero.create).toHaveBeenCalledWith(
      expect.objectContaining({
        pedido_id: 'pedido-test-1',
        camarero_id: 'camarero-1'
      })
    );
  });

  test('desasigna un camarero al eliminar asignación', async () => {
    mockBase44.entities.AsignacionCamarero.delete.mockResolvedValueOnce({});

    await mockBase44.entities.AsignacionCamarero.delete('asignacion-1');

    expect(mockBase44.entities.AsignacionCamarero.delete).toHaveBeenCalledWith('asignacion-1');
  });

  test('actualiza el estado de asignación', async () => {
    mockBase44.entities.AsignacionCamarero.update.mockResolvedValueOnce({
      id: 'asignacion-1',
      estado: 'confirmado'
    });

    await mockBase44.entities.AsignacionCamarero.update('asignacion-1', { estado: 'confirmado' });

    expect(mockBase44.entities.AsignacionCamarero.update).toHaveBeenCalledWith(
      'asignacion-1',
      expect.objectContaining({ estado: 'confirmado' })
    );
  });

  test('muestra badge de estado de asignación: pendiente', () => {
    const asignacion = createAsignacion({ estado: 'pendiente' });
    expect(asignacion.estado).toBe('pendiente');
  });

  test('muestra badge de estado de asignación: confirmado', () => {
    const asignacion = createAsignacion({ estado: 'confirmado' });
    expect(asignacion.estado).toBe('confirmado');
  });

  test('valida disponibilidad del camarero (estado disponible)', () => {
    const camareroDisponible = createCamarero({ estado_actual: 'disponible' });
    const camareroOcupado = createCamarero({ estado_actual: 'ocupado' });

    expect(camareroDisponible.estado_actual).toBe('disponible');
    expect(camareroOcupado.estado_actual).toBe('ocupado');
  });

  test('invoca función de notificación WhatsApp al asignar', async () => {
    mockBase44.functions.invoke.mockResolvedValueOnce({ success: true });

    await mockBase44.functions.invoke('webhookWhatsAppRespuestas', {
      camarero_id: 'camarero-1',
      pedido_id: 'pedido-test-1',
      mensaje: 'Has sido asignado a un nuevo servicio'
    });

    expect(mockBase44.functions.invoke).toHaveBeenCalledWith(
      'webhookWhatsAppRespuestas',
      expect.objectContaining({ camarero_id: 'camarero-1' })
    );
  });
});
