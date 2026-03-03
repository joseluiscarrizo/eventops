import { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 80;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const scrollTop = containerRef.current?.scrollTop ?? globalThis.scrollY;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      if (globalThis.scrollY === 0) {
        e.preventDefault?.();
      }
      setPullDistance(Math.min(delta * 0.5, THRESHOLD * 1.2));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } catch (err) {
        console.error('Error al actualizar:', err);
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = null;
  }, [pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showing = pullDistance > 0 || refreshing;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full"
      style={{
        touchAction: showing ? 'none' : 'auto',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: refreshing ? THRESHOLD : pullDistance }}
      >
        {showing && (
          <div
            className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400"
            style={{ opacity: progress }}
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? 'animate-spin text-[#1e3a5f]' : ''}`}
              style={{ transform: `rotate(${progress * 180}deg)` }}
            />
            <span className="text-xs">
              {refreshing ? 'Actualizando...' : progress >= 1 ? 'Soltar para actualizar' : 'Tirar para actualizar'}
            </span>
          </div>
        )}
      </div>

      {children}
    </div>
  );
}