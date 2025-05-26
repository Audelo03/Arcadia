import { useState, useEffect } from "react";

export default function useUbicacion() {
    const [ubicacion, setUbicacion] = useState(null);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {
                console.error("Ubicación no disponible, usando ubicación por defecto.");
                setUbicacion({ lat: 18.9215, lng: -98.4235 });
            }
        );
    }, []);

    return ubicacion;
}
