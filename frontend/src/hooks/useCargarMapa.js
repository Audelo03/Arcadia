import { useState, useEffect } from "react";
import eliminarIconosMapa from "../Estilos/eliminarIconosMapa";
import { agregarMarcadorOrigen } from "../Utils/Marcadores";

export default function useCargarMapa(referenciaMapa, ubicacion, marcadorOrigenRef, setDestino, marcadorDestinoRef) {
    const [cargado, setCargado] = useState(false);

    useEffect(() => {
        if (window.google?.maps) {
            setCargado(true);
            return;
        }
        if (!document.querySelector("script[src*='maps.googleapis.com']")) {
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCVA6g0s25NHqbJrJlW1PPvp_w5uAI_IHw&libraries=places`;
            script.async = true;
            script.onload = () => setCargado(true);
            document.head.appendChild(script);
        }
    }, []);

    useEffect(() => {
        if (cargado && ubicacion) {
            const mapa = new window.google.maps.Map(document.getElementById("mapa"), {
                center: ubicacion,
                styles: eliminarIconosMapa,
                zoom: 15,
            });
            referenciaMapa.current = mapa;
            agregarMarcadorOrigen(ubicacion, mapa, marcadorOrigenRef);

            mapa.addListener("dblclick", (evento) => {
                const destinoSeleccionado = {
                    lat: evento.latLng.lat(),
                    lng: evento.latLng.lng(),
                };
                setDestino(destinoSeleccionado);
                import("../Utils/Marcadores").then(({ agregarMarcadorDestino }) =>
                    agregarMarcadorDestino(destinoSeleccionado, mapa, marcadorDestinoRef)
                );
            });
        }
    }, [cargado, ubicacion]);

    return cargado;
}
