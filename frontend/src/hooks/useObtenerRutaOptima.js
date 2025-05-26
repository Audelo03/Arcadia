import { useEffect } from "react";
import { marcarParada, marcarParadaPorCoords } from "../Utils/MarkerUtils";


export default function useObtenerRutaOptima(destino, origen, referenciaMapa, polylinesRef, setContenidoModal, setModalVisible) {
    useEffect(() => {
        if (!destino || !origen) return;

        async function obtenerRuta() {
            try {
                const resp = await fetch("http://localhost:5000/api/optimal-route", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ origen, destino }),
                });
                const data = await resp.json();
                console.log("Respuesta backend:", data);

                const mapa = referenciaMapa.current;
                if (!mapa) return;

                // 🧹 Limpieza de rutas anteriores
                if (polylinesRef.current) {
                    polylinesRef.current.forEach(poly => poly.setMap(null));
                }
                polylinesRef.current = [];

                // Función para dibujar una polyline
                const drawPolyline = (path, color) => {
                    if (!path || path.length === 0) return;
                    const polyline = new window.google.maps.Polyline({
                        path: path.map(([lng, lat]) => ({ lat, lng })),
                        strokeColor: color,
                        strokeOpacity: 1.0,
                        strokeWeight: 4,
                        map: mapa,
                    });
                    polylinesRef.current.push(polyline);
                };

                if (data.recomendacion === "usar_transporte") {
                    if (data.parada_subida_coords) marcarParadaPorCoords(data.parada_subida_coords, "subida", referenciaMapa);
                    if (data.parada_bajada_coords) marcarParadaPorCoords(data.parada_bajada_coords, "bajada", referenciaMapa);

                    drawPolyline(data.ruta_origen_a_subida, "#00BFA5");
                    drawPolyline(data.ruta_transporte, "#1f618d");
                    drawPolyline(data.ruta_bajada_a_destino, "#e74c3c");

                    setContenidoModal({
                        titulo: "Ruta óptima",
                        mensaje: data.mensaje || "Ruta calculada correctamente.",
                        tipo: "info",
                        distancia: data.distancia_total_ruta || null,
                        tiempoEstimado: data.tiempo_estimado || null,
                    });
                } else if (data.recomendacion === "caminar") {
                    drawPolyline(data.ruta_directa, "#1abc9c");

                    setContenidoModal({
                        titulo: "Recomendación",
                        mensaje: data.mensaje || "La mejor opción es caminar directo.",
                        tipo: "info",
                        distancia: data.distancia_a_pie_directa || null,
                        tiempoEstimado: data.tiempo_estimado || null,
                    });
                } else {
                    setContenidoModal({
                        titulo: "Recomendación",
                        mensaje: data.mensaje || "No se recibió información de ruta.",
                        tipo: "warning",
                    });
                }

                setModalVisible(true);
            } catch (error) {
                console.error("Error al obtener la ruta óptima:", error);
                setContenidoModal({
                    titulo: "Error",
                    mensaje: "No se pudo obtener la ruta óptima. Intenta de nuevo.",
                    tipo: "error",
                });
                setModalVisible(true);
            }
        }

        obtenerRuta();
    }, [destino, origen]);
}
