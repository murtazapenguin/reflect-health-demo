import { useState, useEffect, useRef } from "react";

interface CountUpValueProps {
  value: number;
  duration?: number;
  formatter: (n: number) => string;
  className?: string;
}

export function CountUpValue({ value, duration = 800, formatter, className = "" }: CountUpValueProps) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const diff = end - start;
    if (Math.abs(diff) < 0.01) {
      setDisplay(end);
      prevValue.current = end;
      return;
    }

    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return <span className={className}>{formatter(display)}</span>;
}
