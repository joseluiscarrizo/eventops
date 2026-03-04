import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70; // px to pull before triggering

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    const el = containerRef.current;
    if (el && el.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      // Only prevent default if pulling down (to avoid blocking normal scroll)
      setPullY(Math.min(dy * 0.5, THRESHOLD + 20));
    }
  };

  const handleTouchEnd = async () => {
    if (pullY >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullY(0);
      startY.current = null;
      await onRefresh();
      setRefreshing(false);
    } else {
      setPullY(0);
      startY.current = null;
    }
  };

  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ overscrollBehavior: "contain" }}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-150"
        style={{ height: refreshing ? 48 : pullY > 0 ? pullY : 0 }}
      >
        <RefreshCw
          className={`w-5 h-5 text-indigo-500 transition-transform ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: `rotate(${progress * 360}deg)`, opacity: refreshing ? 1 : progress }}
        />
      </div>
      {children}
    </div>
  );
}