import { useEffect } from "react";
import { useMap } from "react-leaflet";

export function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const refresh = () => map.invalidateSize({ animate: false });
    const frame = window.requestAnimationFrame(refresh);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(refresh);

    observer?.observe(container);
    window.addEventListener("orientationchange", refresh);
    window.addEventListener("resize", refresh);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("orientationchange", refresh);
      window.removeEventListener("resize", refresh);
    };
  }, [map]);

  return null;
}
