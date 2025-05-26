//Arcadia\frontend\src\hooks\useRutasCombi.js
import { useEffect } from "react";
import { rutas } from "../data/rutas";

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1Ijoic3RheTEyIiwiYSI6ImNtYWtqdTVsYzFhZGEya3B5bWtocno3eWgifQ.wZpjzpjOw_LpIvl0P446Jg";

export default function useRutasCombi(mostrar, referenciaMapa, polylinesRef, mapaCargado) {
    useEffect(() => {
        if (!mapaCargado || !referenciaMapa.current) {
            console.log("Mapa no cargado o referenciaMapa nulo.");
            return;
        }

        polylinesRef.current.forEach(poly => poly.setMap(null));
        polylinesRef.current = [];

        if (!mostrar) {
            console.log("Ocultando rutas.");
            return;
        }

        console.log("Dibujando rutas con Mapbox.");
        Object.entries(rutas).forEach(async ([nombre, { color, puntos }]) => {
            try {
                const coordinatesStr = puntos.map(([lng, lat]) => `${lng},${lat}`).join(';');
                const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesStr}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.routes && data.routes.length > 0) {
                    const geometry = data.routes[0].geometry;
                    const path = geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

                    const polyline = new window.google.maps.Polyline({
                        path,
                        strokeColor: color,
                        strokeOpacity: 0.7,
                        strokeWeight: 4,
                        map: referenciaMapa.current,
                    });

                    polylinesRef.current.push(polyline);
                } else {
                    console.warn(`No se pudo obtener ruta para ${nombre}`);
                }
            } catch (error) {
                console.error(`Error obteniendo ruta ${nombre}:`, error);
            }
        });
    }, [mostrar, mapaCargado]);
}
