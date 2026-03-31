import { useEffect, useState } from "react";

export default function useSmoothLocation(target) {
  const [current, setCurrent] = useState(target);

  useEffect(() => {
    if (!target) return;

    const interval = setInterval(() => {
      setCurrent(prev => ({
        lat: prev.lat + (target.lat - prev.lat) * 0.1,
        lng: prev.lng + (target.lng - prev.lng) * 0.1,
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [target]);

  return current;
}