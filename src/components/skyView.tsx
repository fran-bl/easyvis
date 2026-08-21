import { useEffect, useRef } from "react";
import { SkyScene } from "../sky/skyScene";
import type { Target } from "../astronomy/targets";


interface SkyViewProps {
    target: Target;
    bodyAltitude: number;
    bodyAzimuth: number;
    sunAltitude: number;
    sunAzimuth: number;
    followBody: boolean;
}

export function SkyView({ target, bodyAltitude, bodyAzimuth, sunAltitude, sunAzimuth, followBody }: SkyViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const skyRef = useRef<SkyScene | null>(null);

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        const sky = new SkyScene(containerRef.current, target);
        skyRef.current = sky;
        const resizeObserver = new ResizeObserver(() => sky.resize());
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            sky.dispose();
            skyRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!skyRef.current) {
            return;
        }

        skyRef.current.setBodyPosition(bodyAltitude, bodyAzimuth);
        skyRef.current.setSunPosition(sunAltitude, sunAzimuth);
        if (followBody) {
            skyRef.current.setCameraOrientation(bodyAltitude, bodyAzimuth);
        }
    }, [
        bodyAltitude,
        bodyAzimuth,
        sunAltitude,
        sunAzimuth
    ]);

    return (
        <div className="sky-view" ref={containerRef} />
    );
}