import { vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

export const mockBase44 = {
  entities: {
    Pedido: {
      list: vi.fn(),
      filter: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    AsignacionCamarero: {
      list: vi.fn(),
      filter: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    Camarero: {
      list: vi.fn(),
      filter: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    Cliente: {
      list: vi.fn(),
      filter: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    Coordinador: {
      list: vi.fn(),
      filter: vi.fn()
    },
    NotificacionCamarero: {
      list: vi.fn(),
      filter: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    Notificacion: {
      list: vi.fn(),
      filter: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    }
  },
  functions: {
    invoke: vi.fn()
  },
  integrations: {
    Core: {
      SendEmail: vi.fn().mockResolvedValue({ success: true })
    }
  }
};

export const createMockQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false }
    }
  });

vi.mock('@/api/base44Client', () => ({
  base44: mockBase44
}));

vi.mock('@/lib/app-params', () => ({
  appParams: {
    appId: 'test-app',
    serverUrl: 'https://test.example.com',
    token: 'test-token',
    functionsVersion: '1'
  }
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  },
  Toaster: () => null
}));
