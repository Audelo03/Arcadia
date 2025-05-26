// Arcadia/frontend/src/hooks/useRutaUnicaCombi.js
import { useEffect } from "react";
import { rutas } from "../data/rutas";

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1Ijoic3RheTEyIiwiYSI6ImNtYWtqdTVsYzFhZGEya3B5bWtocno3eWgifQ.wZpjzpjOw_LpIvl0P446Jg";

export default function useRutaUnicaCombi(nombreRuta, referenciaMapa, polylinesRef, mapaCargado) {
    useEffect(() => {
        if (!mapaCargado || !referenciaMapa.current || !nombreRuta) {
            console.log("Mapa no cargado o ruta no especificada.");
            return;
        }

        // 🧹 Limpia cualquier ruta previa
        if (polylinesRef.current) {
            polylinesRef.current.forEach(poly => poly.setMap(null));
        }
        polylinesRef.current = [];

        const ruta = rutas[nombreRuta];
        if (!ruta) {
            console.warn(`Ruta "${nombreRuta}" no encontrada.`);
            return;
        }

        const color = ruta.color || "#FF5733"; // Color por defecto si no se especifica
        const puntos = ruta.puntos || ruta; // Compatibilidad si puntos no está anidado

        // 🗺️ Construir coordenadas para Mapbox
        const coordinatesStr = puntos.map(([lng, lat]) => `${lng},${lat}`).join(';');
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesStr}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.routes && data.routes.length > 0) {
                    const geometry = data.routes[0].geometry;
                    const path = geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

                    const polyline = new window.google.maps.Polyline({
                        path: path.map(([lng, lat]) => ({ lat, lng })),
                        strokeColor: color,
                        strokeOpacity: 1.0,
                        strokeWeight: 4,
                        map: mapa,
                    });
                    polylinesRef.current.push(polyline);

                    console.log(`Ruta "${nombreRuta}" dibujada correctamente.`);
                } else {
                    console.warn(`No se pudo obtener ruta para ${nombreRuta}`);
                }
            })
            .catch(error => console.error(`Error obteniendo ruta ${nombreRuta}:`, error));

    }, [nombreRuta, mapaCargado]);
}
