"use client";

import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function ParticlesBackground() {
    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    if (!init) return null;

    return (
        <Particles
            id="tsparticles"
            options={{
                fpsLimit: 120,
                interactivity: {
                    events: {
                        onHover: { enable: true, mode: "grab" }, // Fareyle üzerine gelince bağlanır
                    },
                    modes: {
                        grab: { distance: 140, links: { opacity: 0.5 } },
                    },
                },
                particles: {
                    color: { value: "#3b82f6" }, // Çizgi ve nokta rengi (Mavi tonu)
                    links: {
                        color: "#3b82f6",
                        distance: 150,
                        enable: true,
                        opacity: 0.2,
                        width: 1,
                    },
                    move: {
                        enable: true,
                        speed: 1,
                        direction: "none",
                        outModes: { default: "out" },
                    },
                    number: {
                        density: { enable: true, width: 1920, height: 1080 },
                        value: 80, // Nokta yoğunluğu
                    },
                    opacity: { value: 0.3 },
                    shape: { type: "circle" },
                    size: { value: { min: 1, max: 3 } },
                },
                detectRetina: true,
                fullScreen: { enable: true, zIndex: -1 }, // Arka planda kalmasını sağlar
            }}
        />
    );
}