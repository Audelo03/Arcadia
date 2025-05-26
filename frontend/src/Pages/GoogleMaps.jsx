import React, { useRef, useState, useEffect } from "react";
import styles from "../Estilos/GoogleMaps.module.css";
import CustomModal from "../Components/CustomModal";
import useUbicacion from "../hooks/useUbicacion";
import useCargarMapa from "../hooks/useCargarMapa";
import useRutasCombi from "../hooks/useRutasCombi";
import useObtenerRutaOptima from "../hooks/useObtenerRutaOptima";
import useCargarLugares from "../hooks/useCargarLugares";
import Sidebar from "../Components/Sidebar";
import CategoriaMenu from "../Components/CategoriaMenu"; // 👈 Menú flotante

export default function GoogleMaps() {
  const referenciaMapa = useRef(null);
  const polylinesRef = useRef([]);
  const referenciaRenderer = useRef(null);
  const marcadorOrigenRef = useRef(null);
  const marcadorDestinoRef = useRef(null);

  const [mostrarRutasCombi, setMostrarRutasCombi] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [contenidoModal, setContenidoModal] = useState({});
  const [destino, setDestino] = useState(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);

  const ubicacion = useUbicacion();
  const mapaCargado = useCargarMapa(
    referenciaMapa,
    ubicacion,
    marcadorOrigenRef,
    setDestino,
    marcadorDestinoRef
  );

  const lugares = useCargarLugares(categoriaSeleccionada);
  const poiMarkersRef = useRef([]);
  const openInfoWindowRef = useRef(null);

  const toggleMostrarRutas = () => setMostrarRutasCombi((prev) => !prev);

  useRutasCombi(mostrarRutasCombi, referenciaMapa, polylinesRef, mapaCargado);
  useObtenerRutaOptima(
    destino,
    ubicacion,
    referenciaMapa,
    referenciaRenderer,
    setContenidoModal,
    setModalVisible
  );

  // Efecto para mostrar lugares en el mapa cuando cambian
  useEffect(() => {
    if (!mapaCargado || !window.google?.maps || !referenciaMapa.current) return;

    // Limpia los marcadores anteriores
    poiMarkersRef.current.forEach((marker) => marker.setMap(null));
    poiMarkersRef.current = [];
    if (openInfoWindowRef.current) openInfoWindowRef.current.close();

    lugares.forEach((lugar) => {
      const { lat, lng } = lugar.ubicacion || {};
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        isNaN(lat) ||
        isNaN(lng)
      )
        return;

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: referenciaMapa.current,
        title: lugar.nombre,
      });

      const content = `
        <div style="max-width:300px">
          <h3>${lugar.nombre}</h3>
          <p>${lugar.descripcion}</p>
          <p><strong>Costo:</strong> ${lugar.costo_entrada}</p>
          <p><strong>Horario:</strong> ${lugar.horario}</p>
          ${
            lugar.imagenes?.length
              ? `<img src="${lugar.imagenes[0]}" style="width:100%;"/>`
              : ""
          }
        </div>
      `;
      const infoWindow = new window.google.maps.InfoWindow({ content });

      marker.addListener("click", () => {
        if (openInfoWindowRef.current) openInfoWindowRef.current.close();
        infoWindow.open(referenciaMapa.current, marker);
        openInfoWindowRef.current = infoWindow;
      });

      poiMarkersRef.current.push(marker);
    });
  }, [lugares, mapaCargado]);

  return (
    <div className={styles.mapRoot}>
      <Sidebar
        onTogglePredefinedRoutes={toggleMostrarRutas}
        arePredefinedRoutesVisible={mostrarRutasCombi}
      />
      <div id="mapa" className={styles.mapContainer}></div>

      {/* Menú de categorías flotante */}
      <CategoriaMenu onCategoriaSeleccionada={setCategoriaSeleccionada} />

      {/* Modal de información */}
      <CustomModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={contenidoModal.titulo}
        message={contenidoModal.mensaje}
        distancia={contenidoModal.distancia}
        tiempoEstimado={contenidoModal.tiempoEstimado}
        type={contenidoModal.tipo}
      />
    </div>
  );
}
