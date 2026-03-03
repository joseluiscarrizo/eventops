import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock global fetch
globalThis.fetch = vi.fn();

// Mock Audio as a proper class constructor
class MockAudio {
  constructor() {
    this.volume = 0;
    this.play = vi.fn().mockResolvedValue(undefined);
    this.pause = vi.fn();
    this.load = vi.fn();
  }
}
globalThis.Audio = MockAudio;

// Mock window.location for URL param tests
delete globalThis.location;
globalThis.location = { search: '', href: '', pathname: '/' };

// Mock IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock matchMedia
globalThis.matchMedia = vi.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
}));

// Suppress console errors/warnings in tests
beforeEach(() => {
  vi.clearAllMocks();
});
