import { useEffect, useState, useRef, useCallback } from "react";
import styles from "../Estilos/GoogleMaps.module.css";
import Sidebar from "../Components/Sidebar";
import { IoReloadCircle } from "react-icons/io5";
import {
  MdGpsFixed,
  MdGpsOff,
  MdMuseum,
  MdPark,
  MdFastfood,
  MdHotel,
} from "react-icons/md";
import { FaLandmark, FaBuilding, FaMapMarkerAlt } from "react-icons/fa";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase-config";

// Carga el script de Google Maps solo si aún no está cargado
const loadGoogleMapsScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve();
    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=AIzaSyC0c5g5slnWygHkivX_GRNxynCExzdUfew"; // Reemplaza con tu API Key
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Error al cargar Google Maps"));
    document.head.appendChild(script);
  });

// Obtiene la ubicación actual del usuario
const getCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("Geolocalización no soportada"));
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => reject(new Error("No se pudo obtener la ubicación")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });

const poiTypes = [
  { tipo: "Museos", Icono: MdMuseum, emoji: "🏛️" },
  { tipo: "Monumentos Históricos", Icono: FaLandmark, emoji: "🗿" },
  { tipo: "Naturaleza", Icono: MdPark, emoji: "🌿" },
  { tipo: "Gastronomía", Icono: MdFastfood, emoji: "🍽️" },
  { tipo: "Dependencias de Gobierno", Icono: FaBuilding, emoji: "🏢" },
  { tipo: "Hospedaje", Icono: MdHotel, emoji: "🏨" },
];

export default function GoogleMaps() {
  const [location, setLocation] = useState(null);
  const [externalGpsLocation, setExternalGpsLocation] = useState(null);
  const [error, setError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [usingExternalGps, setUsingExternalGps] = useState(false);
  const [lugares, setLugares] = useState([]);

  const mapRef = useRef(null);
  const activeMarkerRef = useRef(null);
  const markersRef = useRef([]);
  const openInfoWindowRef = useRef(null); // Para mantener una referencia a la InfoWindow abierta

  const [isPoiMenuOpen, setIsPoiMenuOpen] = useState(false);
  const [selectedPoiType, setSelectedPoiType] = useState(null);

  const kmlUrl =
    "https://drive.google.com/uc?export=download&id=1x9QAfgazqKBYU0kmCOCXU6Od1oo_HhLU";

  const requestLocation = useCallback(async () => {
    setError(null);
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
    } catch (err) {
      setError(err.message);
    }
  }, []);

 const updateMarker = useCallback(
  (lat, lng, isExternal = usingExternalGps) => {
    if (!mapRef.current || !window.google?.maps) return;

    activeMarkerRef.current?.setMap(null);

    // Función para crear el SVG del marcador simple
    const createSimpleMarkerSVG = (isExternal, size = 32, heading = 0) => {
      const color = isExternal ? '#EF4444' : '#1E40AF'; 
      const outerSize = size;
      const innerSize = size * 0.4; 
      const center = outerSize / 2;
      const arrowLength = innerSize ; 
      
      return `
        <svg width="${outerSize}" height="${outerSize}" viewBox="0 0 ${outerSize} ${outerSize}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <!-- Filtro para la sombra suave -->
            <filter id="shadow${isExternal ? 'External' : 'Internal'}" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.2)"/>
            </filter>
          </defs>
          
          <!-- Círculo exterior semi-transparente -->
          <circle 
            cx="${center}" 
            cy="${center}" 
            r="${center - 2}" 
            fill="${color}"
            fill-opacity="0.2"
            stroke="${color}"
            stroke-width="1"
            stroke-opacity="0.4"
            filter="url(#shadow${isExternal ? 'External' : 'Internal'})"
          />
          
          <!-- Círculo interior sólido -->
          <circle 
            cx="${center}" 
            cy="${center}" 
            r="${innerSize / 2}" 
            fill="${color}"
            stroke="white"
            stroke-width="2"
          />
          
          <!-- Flecha direccional en el exterior -->
          <g transform="translate(${center}, ${center}) rotate(${heading})">
            <path 
              d="M 0,-${innerSize/2 + 4} L ${arrowLength/3},-${innerSize/2 - 2} L 0,-${innerSize/2 + 2} L -${arrowLength/3},-${innerSize/2 - 2} Z" 
              fill="white"
              stroke="${color}"
              stroke-width="1"
            />
          </g>
        </svg>
      `;
    };

    // Convertir SVG a Data URL
    const createMarkerIcon = (isExternal, zoom, heading = 0) => {
      // Calcular el tamaño basado en el zoom (entre 16 y 48 píxeles)
      const minSize = 16;
      const maxSize = 48;
      const minZoom = 10;
      const maxZoom = 20;
      
      const normalizedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
      const size = minSize + ((normalizedZoom - minZoom) / (maxZoom - minZoom)) * (maxSize - minSize);
      
      const svgString = createSimpleMarkerSVG(isExternal, size, heading);
      const encodedSvg = encodeURIComponent(svgString);
      return {
        url: `data:image/svg+xml,${encodedSvg}`,
        scaledSize: new window.google.maps.Size(size, size),
        anchor: new window.google.maps.Point(size / 2, size / 2)
      };
    };

    // Obtener el zoom actual del mapa
    const currentZoom = mapRef.current.getZoom();

    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapRef.current,
      title: isExternal ? "GPS Externo" : "Mi ubicación actual",
      icon: {
        ...createMarkerIcon(isExternal, currentZoom),
        optimized: false // Importante para SVGs personalizados
      },
      zIndex: 1000
    });

    // Función para actualizar el tamaño del marcador según el zoom
    const updateMarkerSize = (heading = 0) => {
      const zoom = mapRef.current.getZoom();
      const newIcon = createMarkerIcon(isExternal, zoom, heading);
      marker.setIcon({
        url: newIcon.url,
        scaledSize: newIcon.scaledSize,
        anchor: newIcon.anchor,
        optimized: false
      });
    };

    // Función para actualizar solo la dirección de la flecha
    const updateMarkerHeading = (newHeading) => {
      updateMarkerSize(newHeading);
    };

    // Escuchar cambios de zoom para actualizar el tamaño
    const zoomListener = mapRef.current.addListener('zoom_changed', updateMarkerSize);

    // InfoWindow simple
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="color: #000; padding: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">
          <div style="font-weight: 600; margin-bottom: 4px; color: ${isExternal ? '#EF4444' : '#1E40AF'};">
            ${marker.title}
          </div>
          <div style="color: #666; font-size: 12px;">
            ${lat.toFixed(6)}, ${lng.toFixed(6)}
          </div>
        </div>`,
    });

    marker.addListener("click", () => {
      openInfoWindowRef.current?.close();
      infoWindow.open(mapRef.current, marker);
      openInfoWindowRef.current = infoWindow;
    });

    // Añadir métodos para actualizar el tamaño y la orientación
    marker.updateSize = updateMarkerSize;
    marker.updateHeading = updateMarkerHeading;

    // Limpiar el listener cuando se elimine el marcador
    const originalSetMap = marker.setMap.bind(marker);
    marker.setMap = function(map) {
      if (!map && zoomListener) {
        window.google.maps.event.removeListener(zoomListener);
      }
      return originalSetMap(map);
    };

    activeMarkerRef.current = marker;
  },
  [usingExternalGps]
);

  const toggleGpsSource = useCallback(() => {
    const useExternal = !usingExternalGps;
    setUsingExternalGps(useExternal);

    const current = useExternal ? externalGpsLocation : location;
    if (current) {
      updateMarker(current.lat, current.lng, useExternal);
      mapRef.current?.panTo(current);
    }
  }, [
    usingExternalGps,
    externalGpsLocation,
    location,
    updateMarker,
  ]);

  useEffect(() => {
    const initMap = async () => {
      try {
        await loadGoogleMapsScript();
        setMapLoaded(true);
        await requestLocation();
      } catch (err) {
        setError(err.message);
      }
    };
    if (!window.google?.maps) initMap();
    else {
      setMapLoaded(true);
      if (!location) {
        requestLocation();
      }
    }
  }, [requestLocation, location]);

  const fetchLugaresPorTipo = useCallback(async (tipo) => {
    try {
      const querySnapshot = await getDocs(collection(db, "lugares"));
      const data = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((l) => l.tipo === tipo);
      setLugares(data);
    } catch (err) {
      console.error("Error al obtener lugares:", err);
      setError("Error al cargar lugares de interés.");
    }
  }, []);

  useEffect(() => {
    if (!mapLoaded || !window.google?.maps) return;
    const current = usingExternalGps ? externalGpsLocation : location;
    if (!current) return;

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(
        document.getElementById("map"),
        {
          center: current,
          zoom: 15,
          mapTypeId: "roadmap",
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          gestureHandling: "greedy",
          disableDoubleClickZoom: true,
        }
      );

      new window.google.maps.KmlLayer({
        url: kmlUrl,
        map: mapRef.current,
        preserveViewport: true,
      });
    }

    if (mapRef.current.getCenter().lat() !== current.lat || mapRef.current.getCenter().lng() !== current.lng) {
      mapRef.current.panTo(current);
    }
    updateMarker(current.lat, current.lng);

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    lugares.forEach((lugar) => {
      const poiDefinition = poiTypes.find(pt => pt.tipo === lugar.tipo);
      const iconUrl = poiDefinition?.Icono ? null : (poiDefinition?.emoji ? `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20">${poiDefinition.emoji}</text></svg>`)}` : '/icons/default_poi.png');

      const { lat, lng } = lugar.ubicacion || {};
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current,
        title: lugar.nombre,
        icon: iconUrl ? {
          url: iconUrl,
          scaledSize: new window.google.maps.Size(32, 32),
        } : undefined,
      });

      const id = `carrusel-${lugar.id || Math.random().toString(36).substr(2, 9)}`;
      const imagenes = lugar.imagenes && lugar.imagenes.length > 0 ? lugar.imagenes : ['/icons/placeholder.png'];


const svgArrowLeft = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M257.5 445.1l-22.2 22.2c-9.4 9.4-24.6 9.4-33.9 0L7 273c-9.4-9.4-9.4-24.6 0-33.9L201.4 44.7c9.4-9.4 24.6-9.4 33.9 0l22.2 22.2c9.5 9.5 9.3 25-.4 34.3L136.6 216H424c13.3 0 24 10.7 24 24v32c0 13.3-10.7 24-24 24H136.6l120.5 114.8c9.8 9.3 10 24.8.4 34.3z"></path></svg>`;
const svgArrowRight = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M190.5 66.9l22.2-22.2c9.4-9.4 24.6-9.4 33.9 0L416 239c9.4 9.4 9.4 24.6 0 33.9L246.6 467.3c-9.4 9.4-24.6-9.4-33.9 0l-22.2-22.2c-9.5-9.5-9.3-25 .4-34.3L311.4 296H24c-13.3 0-24-10.7-24-24v-32c0-13.3 10.7-24 24-24h287.4L190.9 101.2c-9.8-9.3-10-24.8-.4-34.3z"></path></svg>`;
const svgClose = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>`;

const infoWindowContent = `
  <style>
    /* Reset y configuración base del InfoWindow */
    .gm-style .gm-style-iw-c { /* ESTA ES LA CLAVE PRINCIPAL */
      padding: 0 !important;
      border-radius: 12px !important; /* Quizás quieras que sea 0 si tu contenido no es redondeado en el mismo sitio */
      box-shadow: none !important; /* O none !important; si no quieres ninguna sombra de Google */
      max-width: none !important;
      min-width: 0 !important;
      overflow: hidden !important; /* Muy importante para que tu contenido no se corte si es más grande */
      background: none !important; /* AÑADIR ESTO PARA QUITAR EL FONDO BLANCO */
    }
    
    .gm-style .gm-style-iw-d {
      overflow: hidden !important;
    }
    
     .gm-style-iw-wrap button[aria-label="Close"],
    .gm-style-iw-wrap button[aria-label="Cerrar"],

.gm-style-iw button[aria-label="Close"],
.gm-style-iw button[aria-label="Cerrar"],
    .gm-style-iw-close-button,
    .gm-style .gm-style-iw-t::after { /* ESTO OCULTA EL PICO/FLECHA */
      display: none !important;
    }

    /* Container principal optimizado para móvil */
    .info-window-custom-container {
      color: #2d3748;
      width: 100%;
      max-width: 350px;
      min-width: 280px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      box-sizing: border-box;
      overflow: hidden;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    }

    /* Header mejorado */
    .info-window-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      position: relative;
    }

    .info-window-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1);
    }

    .info-window-custom-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      line-height: 1.3;
      color: white;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      flex: 1;
      padding-right: 10px;
    }

    .info-window-custom-close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
      min-width: 36px;
      height: 36px;
    }

    .info-window-custom-close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }

    /* Body del InfoWindow */
    .info-window-body {
      padding: 20px;
      background: white;
      max-height: 60vh;
      overflow-y: auto;
    }

    /* Galería de imágenes optimizada para móvil */
    .info-window-image-gallery {
      margin-bottom: 16px;
      position: relative;
    }

    .info-window-image-wrapper {
      width: 100%;
      height: 180px;
      overflow: hidden;
      border-radius: 12px;
      background: linear-gradient(45deg, #f0f2f5, #e2e8f0);
      margin-bottom: 12px;
      position: relative;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .info-window-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .info-window-image:hover {
      transform: scale(1.02);
    }

    /* Controles de galería optimizados para móvil */
    .info-window-gallery-controls {
      display: flex;
      justify-content: center;
      gap: 16px;
      align-items: center;
    }

    .info-window-gallery-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 0;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      position: relative;
      overflow: hidden;
      touch-action: manipulation;
    }

    .info-window-gallery-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }

    .info-window-gallery-button:hover::before {
      left: 100%;
    }

    .info-window-gallery-button svg {
      width: 22px;
      height: 22px;
      transition: transform 0.2s ease;
    }

    .info-window-gallery-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }

    .info-window-gallery-button:hover svg {
      transform: scale(1.1);
    }

    .info-window-gallery-button:disabled {
      background: linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%);
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .info-window-gallery-button:disabled::before {
      display: none;
    }

    /* Descripción estilizada */
    .info-window-description {
      margin: 0 0 16px;
      font-size: 0.9rem;
      line-height: 1.6;
      color: #4a5568;
      background: #f7fafc;
      padding: 14px 16px;
      border-radius: 10px;
      border-left: 4px solid #667eea;
      position: relative;
    }

    /* Detalles mejorados y optimizados para móvil */
    .info-window-details {
      font-size: 0.85rem;
      color: #2d3748;
    }

    .info-window-detail-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 10px;
      padding: 12px 14px;
      background: #f8fafc;
      border-radius: 8px;
      transition: all 0.2s ease;
      border: 1px solid #e2e8f0;
    }

    .info-window-detail-item:hover {
      background: #edf2f7;
      transform: translateX(2px);
    }

    .info-window-detail-item:last-child {
      margin-bottom: 0;
    }

    .info-window-detail-label {
      font-weight: 600;
      color: #667eea;
      margin-right: 8px;
      min-width: 50px;
      flex-shrink: 0;
    }

    .info-window-detail-value {
      color: #4a5568;
      flex: 1;
      word-wrap: break-word;
    }

    /* Animaciones de entrada */
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .info-window-custom-container {
      animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Optimizaciones específicas para móvil */
    @media (max-width: 480px) {
      .info-window-custom-container {
        width: 100%;
        min-width: 260px;
        max-width: 280px;
      }
      
      .info-window-header {
        padding: 12px 16px;
      }
      
      .info-window-custom-title {
        font-size: 1rem;
      }
      
      .info-window-body {
        padding: 16px;
        max-height: 50vh;
      }
      
      .info-window-image-wrapper {
        height: 150px;
      }
      
      .info-window-gallery-button {
        width: 44px;
        height: 44px;
      }
      
      .info-window-gallery-button svg {
        width: 20px;
        height: 20px;
      }
      
      .info-window-description {
        font-size: 0.85rem;
        padding: 12px 14px;
      }
      
      .info-window-details {
        font-size: 0.8rem;
      }
      
      .info-window-detail-item {
        padding: 10px 12px;
        flex-direction: column;
        align-items: flex-start;
      }
      
      .info-window-detail-label {
        margin-bottom: 4px;
        margin-right: 0;
      }
    }

    /* Optimizaciones para pantallas muy pequeñas */
    @media (max-width: 320px) {
      .info-window-custom-container {
        max-width: 260px;
      }
      
      .info-window-gallery-controls {
        gap: 12px;
      }
    }

    /* Mejoras para dispositivos táctiles */
    @media (hover: none) and (pointer: coarse) {
      .info-window-gallery-button:hover {
        transform: none;
      }
      
      .info-window-detail-item:hover {
        transform: none;
      }
      
      .info-window-image:hover {
        transform: none;
      }
    }
  </style>
  <div class="info-window-custom-container" id="${id}-container">
    <div class="info-window-header">
      <h3 class="info-window-custom-title">${lugar.nombre}</h3>
      <button id="${id}-custom-close-btn" class="info-window-custom-close-btn" aria-label="Cerrar1">
        ${svgClose}
      </button>
    </div>
    <div class="info-window-body">
      <div id="${id}" class="info-window-image-gallery">
        <div class="info-window-image-wrapper">
          <img src="${imagenes[0]}" id="${id}-img" class="info-window-image" alt="Imagen de ${lugar.nombre}" />
        </div>
        ${imagenes.length > 1 ? `
        <div class="info-window-gallery-controls">
          <button id="${id}-prev" class="info-window-gallery-button" aria-label="Imagen anterior">
            ${svgArrowLeft}
          </button>
          <button id="${id}-next" class="info-window-gallery-button" aria-label="Siguiente imagen">
            ${svgArrowRight}
          </button>
        </div>` : ''}
      </div>
      <div class="info-window-description">${lugar.descripcion || "No hay descripción disponible."}</div>
      <div class="info-window-details">
        <div class="info-window-detail-item">
          <span class="info-window-detail-label">Tipo:</span>
          <span class="info-window-detail-value">${lugar.tipo}</span>
        </div>
        <div class="info-window-detail-item">
          <span class="info-window-detail-label">Costo:</span>
          <span class="info-window-detail-value">${lugar.costo_entrada || "Gratis"}</span>
        </div>
        <div class="info-window-detail-item">
          <span class="info-window-detail-label">Horario:</span>
          <span class="info-window-detail-value">${lugar.horario || "No especificado"}</span>
        </div>
      </div>
    </div>
  </div>`;

const infoWindow = new window.google.maps.InfoWindow({
  content: infoWindowContent,
  ariaLabel: lugar.nombre,
  disableAutoPan: false,
  pixelOffset: new window.google.maps.Size(0, -10)
});

// Event listener para el marker
marker.addListener("click", () => {
  openInfoWindowRef.current?.close();
  infoWindow.open(mapRef.current, marker);
  openInfoWindowRef.current = infoWindow;
});

// Event listeners para funcionalidad
window.google.maps.event.addListener(infoWindow, 'domready', () => {
  // Botón de cierre
  const closeButton = document.getElementById(`${id}-custom-close-btn`);
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      infoWindow.close(); 
    });
  }

  // Galería de imágenes
  if (imagenes.length > 1) {
    const prevButton = document.getElementById(`${id}-prev`);
    const nextButton = document.getElementById(`${id}-next`);
    const imgElement = document.getElementById(`${id}-img`);
    let currentImageIndex = 0;

    if (prevButton && nextButton && imgElement) {
      const updateGallery = () => {
        // Efecto de transición suave
        imgElement.style.opacity = '0.5';
        
        setTimeout(() => {
          imgElement.src = imagenes[currentImageIndex];
          imgElement.style.opacity = '1';
        }, 150);

        // Actualizar estado de botones
        prevButton.disabled = currentImageIndex === 0;
        nextButton.disabled = currentImageIndex === imagenes.length - 1;
      };

      prevButton.addEventListener('click', () => {
        if (currentImageIndex > 0) {
          currentImageIndex--;
          updateGallery();
        }
      });

      nextButton.addEventListener('click', () => {
        if (currentImageIndex < imagenes.length - 1) {
          currentImageIndex++;
          updateGallery();
        }
      });

      // Navegación con teclado (solo en dispositivos no táctiles)
      if (window.matchMedia('(hover: hover)').matches) {
        document.addEventListener('keydown', (e) => {
          if (openInfoWindowRef.current === infoWindow) {
            if (e.key === 'ArrowLeft' && currentImageIndex > 0) {
              currentImageIndex--;
              updateGallery();
            } else if (e.key === 'ArrowRight' && currentImageIndex < imagenes.length - 1) {
              currentImageIndex++;
              updateGallery();
            } else if (e.key === 'Escape') {
              infoWindow.close();
            }
          }
        });
      }

      // Soporte para gestos táctiles en la imagen (swipe)
      let touchStartX = 0;
      let touchEndX = 0;

      imgElement.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      });

      imgElement.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const swipeThreshold = 50;
        
        if (touchStartX - touchEndX > swipeThreshold && currentImageIndex < imagenes.length - 1) {
          // Swipe left - next image
          currentImageIndex++;
          updateGallery();
        } else if (touchEndX - touchStartX > swipeThreshold && currentImageIndex > 0) {
          // Swipe right - previous image
          currentImageIndex--;
          updateGallery();
        }
      });

      updateGallery(); // Inicializar
    }
  }
});

markersRef.current.push(marker);
    });
  }, [
    location,
    externalGpsLocation,
    mapLoaded,
    usingExternalGps,
    lugares,
    kmlUrl,
    updateMarker
  ]);

  const togglePoiMenu = useCallback(() => {
    setIsPoiMenuOpen(prev => !prev);
  }, []);

  const handlePoiTypeSelect = useCallback((poi) => {
    setSelectedPoiType(poi);
    fetchLugaresPorTipo(poi.tipo);
    setIsPoiMenuOpen(false);
  }, [fetchLugaresPorTipo]);

  return (
    <div className={styles.mapRoot}>
      <Sidebar />
      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={`${styles.mapHeader} ${styles.transparentHeader}`}>
        {location && (
          <button
            onClick={requestLocation}
            className={styles.mapButton}
            title="Actualizar ubicación"
          >
            <IoReloadCircle size={24} />
          </button>
        )}
        <button
          onClick={toggleGpsSource}
          className={`${styles.mapButton} ${styles.gpsToggle}`}
          title="Cambiar fuente GPS"
        >
          {usingExternalGps ? <MdGpsFixed size={24} /> : <MdGpsOff size={24} />}
        </button>
      </div>

      <div className={styles.mapContainer}>
        {!mapLoaded && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            Cargando mapa...
          </div>
        )}
        <div id="map" className={styles.mapElement} style={{ visibility: mapLoaded ? 'visible' : 'hidden' }}></div>
      </div>

      <div className={styles.poiFabContainer}>
        {isPoiMenuOpen && (
          <div className={styles.poiMenu}>
            {poiTypes.map((poi, index) => (
              <button
                key={poi.tipo}
                onClick={() => handlePoiTypeSelect(poi)}
                className={styles.poiMenuItem}
                title={poi.tipo}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <poi.Icono size={22} />
                <span className={styles.poiMenuItemText}>{poi.tipo}</span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={togglePoiMenu}
          className={styles.poiFab}
          title={selectedPoiType ? `Mostrando: ${selectedPoiType.tipo}` : "Seleccionar tipo de lugar"}
          aria-expanded={isPoiMenuOpen}
          aria-haspopup="true"
        >
          {selectedPoiType ? <selectedPoiType.Icono size={28} /> : <FaMapMarkerAlt size={28} />}
        </button>
      </div>
    </div>
  );
}