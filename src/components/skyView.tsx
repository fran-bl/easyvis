import { useEffect, useRef } from "react";
import { SkyScene } from "../sky/skyScene";
import type { Target } from "../astronomy/targets";
import type { ObservationPoint } from "../types";


interface SkyViewProps {
    target: Target;
    selectedPoint: ObservationPoint;
    followBody: boolean;
}

export function SkyView({ target, selectedPoint, followBody }: SkyViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const skyRef = useRef<SkyScene | null>(null);

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        const sky = new SkyScene(containerRef.current, target);
        sky.loadStarSphere(`${import.meta.env.BASE_URL}constellation_figures_16k.png`);
        skyRef.current = sky;
        const resizeObserver = new ResizeObserver(() => sky.resize());
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            sky.dispose();
            skyRef.current = null;
        };
    }, [target]);

    useEffect(() => {
        if (!skyRef.current) {
            return;
        }

        skyRef.current.setBodyPosition(selectedPoint.altitude, selectedPoint.azimuth, selectedPoint.distanceAU);
        skyRef.current.setSunPosition(selectedPoint.sunAltitude, selectedPoint.sunAzimuth, selectedPoint.sunDistanceAU);
        if (followBody) {
            skyRef.current.setCameraOrientation(selectedPoint.altitude, selectedPoint.azimuth);
        }
    }, [selectedPoint, followBody]);

    useEffect(() => {
        if (!skyRef.current) {
            return;
        }
        skyRef.current.setStarSphereOrientation(selectedPoint.poleAltAz, selectedPoint.siriusAltAz);
    }, [selectedPoint]);

    return (
        <div className="sky-view" ref={containerRef} />
    );
}