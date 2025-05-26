import React, { useEffect, useState, useRef, useCallback } from "react";
import styles from "../Estilos/GoogleMaps.module.css";
import Sidebar from "../Components/Sidebar";
import { rutas } from "../data/rutas";
import { FaRoute } from "react-icons/fa";
import { CiCircleInfo } from "react-icons/ci";
import { IoReloadCircle } from "react-icons/io5";
import {
  MdGpsFixed,
  MdGpsOff,
  MdMuseum,
  MdPark,
  MdFastfood,
  MdHotel,
} from "react-icons/md";
import {
  FaLandmark,
  FaBuilding,
  FaMapMarkerAlt,
  FaThList,
  FaTrashAlt,
} from "react-icons/fa";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase-config";

const hiddenPoiTypes = [
  "poi.business",
  "poi.attraction",
  "poi.school",
  "poi.government",
  "poi.medical",
  "poi.place_of_worship",
  "poi.sports_complex",
  "poi.park",
];

const mapCustomStyles = hiddenPoiTypes.map((type) => ({
  featureType: type,
  stylers: [{ visibility: "off" }],
}));

const ATLIXCO_BOUNDS = {
  north: 18.99,
  south: 18.79,
  west: -98.57,
  east: -98.3,
};

const ATLIXCO_CENTER = { lat: 18.9031, lng: -98.4372 };
const INITIAL_ZOOM_ATLIXCO = 15;

const faRouteSVGString = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 512 512"><path d="M288 448H64V320H0v160c0 17.7 14.3 32 32 32h256c17.7 0 32-14.3 32-32V320H288v128zM112 224c61.9 0 112-50.1 112-112S173.9 0 112 0 0 50.1 0 112s50.1 112 112 112zm0-160c26.5 0 48 21.5 48 48s-21.5 48-48 48-48-21.5-48-48 21.5-48 48-48zM496 0H384c-17.7 0-32 14.3-32 32s14.3 32 32 32H422.7l-70.4 70.4c-25.1-19.5-58.1-30.4-92.3-30.4H147.3c-25.2 9.5-43.2 33.3-43.2 61.1V256H32c-17.7 0-32 14.3-32 32s14.3 32 32 32H208c17.7 0 32-14.3 32-32V217.1c0-8.4 3.6-16.3 9.7-21.7l96-80c11.9-9.9 29.5-8.9 39.4 2s8.9 29.5-2 39.4l-30.9 25.7 54.6 54.6c25.1 19.5 58.1 30.4 92.3 30.4H496c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32z"/></svg>`;

const accessToken =
  "pk.eyJ1Ijoic3RheTEyIiwiYSI6ImNtYWtqdTVsYzFhZGEya3B5bWtocno3eWgifQ.wZpjzpjOw_LpIvl0P446Jg";

const rutatecnologico = rutas.rutatecnologico;
const rutacerril = rutas.rutacerril;
const geo = rutas.rutageo;
const nieves = rutas.rutatecnologico;

const ALL_PREDEFINED_ROUTES_CONFIG = [
  {
    data: rutatecnologico,
    color: "#0074D9",
    id: "tec",
    name: "Ruta Tecnológico",
  },
  { data: rutacerril, color: "#2ECC40", id: "cerril", name: "Ruta Cerril" },
  { data: geo, color: "#FF4136", id: "geo", name: "Ruta Geo" },
  { data: nieves, color: "#B10DC9", id: "nieves", name: "Ruta Nieves" },
];

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

const loadGoogleMapsScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBWXlOXBQH5NrCbM6Gxy0SYaRxvt0uNrkM&libraries=places,directions`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () =>
      reject(
        new Error(
          "Error al cargar Google Maps. Verifica la API Key y que las APIs necesarias estén habilitadas."
        )
      );
    document.head.appendChild(script);
  });

const getCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(
        new Error("Geolocalización no soportada por este navegador.")
      );
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        let message = "No se pudo obtener la ubicación: ";
        // ANÁLISIS SEMÁNTICO: El switch evalúa el `err.code` para determinar la causa
        // del error de geolocalización y proveer un mensaje específico. Esto es
        // un análisis del significado del código de error para dar una respuesta coherente.
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message += "Permiso denegado.";
            break;
          case err.POSITION_UNAVAILABLE:
            message += "Información de ubicación no disponible.";
            break;
          case err.TIMEOUT:
            message += "Timeout obteniendo ubicación.";
            break;
          default:
            message += "Error desconocido.";
            break;
        }
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });

const destinationPinSvgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
  <defs>
    <filter id="pinDropShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <path fill="#8A2BE2" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 0 1-35.464 0z" filter="url(#pinDropShadow)"/>
  <circle cx="192" cy="192" r="56" fill="#FFFFFF"/>
  <circle cx="192" cy="192" r="32" fill="#8A2BE2"/>
</svg>`;

const camionIconSvgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" fill="#1a75ff">
  <rect x="10" y="20" width="100" height="40" rx="6" ry="6" fill="#3498db" stroke="#2c3e50" stroke-width="2"/>
  <rect x="10" y="60" width="100" height="10" rx="2" ry="2" fill="#2c3e50" stroke="#2c3e50" stroke-width="2"/>
  <rect x="18" y="26" width="12" height="12" rx="1" ry="1" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1"/>
  <rect x="34" y="26" width="12" height="12" rx="1" ry="1" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1"/>
  <rect x="50" y="26" width="12" height="12" rx="1" ry="1" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1"/>
  <rect x="66" y="26" width="12" height="12" rx="1" ry="1" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1"/>
  <rect x="82" y="26" width="12" height="12" rx="1" ry="1" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1"/>
  <rect x="20" y="42" width="15" height="18" rx="2" ry="2" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1.5"/>
  <line x1="27.5" y1="42" x2="27.5" y2="60" stroke="#2c3e50" stroke-width="1"/>
  <rect x="65" y="42" width="25" height="18" rx="2" ry="2" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1.5"/>
  <line x1="77.5" y1="42" x2="77.5" y2="60" stroke="#2c3e50" stroke-width="1"/>
  <circle cx="30" cy="70" r="8" fill="#2c3e50" stroke="#000000" stroke-width="1"/>
  <circle cx="30" cy="70" r="3" fill="#999999" stroke="#000000" stroke-width="0.5"/>
  <circle cx="90" cy="70" r="8" fill="#2c3e50" stroke="#000000" stroke-width="1"/>
  <circle cx="90" cy="70" r="3" fill="#999999" stroke="#000000" stroke-width="0.5"/>
  <path d="M10,35 Q10,20 20,20 L20,35 Z" fill="#a8d8ff" stroke="#2c3e50" stroke-width="1.5"/>
  <path d="M110,35 Q110,20 100,20 L100,35 Z" fill="#a8d8ff" stroke="#2c3e50" stroke-width="1.5"/>
  <rect x="10" y="45" width="4" height="4" rx="1" ry="1" fill="#f1c40f" stroke="#2c3e50" stroke-width="0.5"/>
  <rect x="106" y="45" width="4" height="4" rx="1" ry="1" fill="#e74c3c" stroke="#2c3e50" stroke-width="0.5"/>
  <rect x="45" y="12" width="30" height="8" rx="4" ry="4" fill="#e74c3c" stroke="#2c3e50" stroke-width="1"/>
  <text x="60" y="18.5" font-family="Arial" font-size="6" font-weight="bold" text-anchor="middle" fill="white">BUS</text>
  <path d="M60,25 L80,50 L70,50 L70,75 L50,75 L50,50 L40,50 Z" fill="#00CC00" stroke="#008800" stroke-width="2" />
</svg>`;

const camionIconDownSvgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" fill="#1a75ff">
  <rect x="10" y="20" width="100" height="40" rx="6" ry="6" fill="#2ecc71" stroke="#2c3e50" stroke-width="2"/>
  <rect x="10" y="60" width="100" height="10" rx="2" ry="2" fill="#2c3e50" stroke="#2c3e50" stroke-width="2"/>
  <rect x="18" y="26" width="12" height="12" rx="1" ry="1" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1"/>
  <rect x="34" y="26" width="12" height="12" rx="1" ry="1" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1"/>
  <rect x="50" y="26" width="12" height="12" rx="1" ry="1" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1"/>
  <rect x="66" y="26" width="12" height="12" rx="1" ry="1" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1"/>
  <rect x="82" y="26" width="12" height="12" rx="1" ry="1" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1"/>
  <rect x="20" y="42" width="15" height="18" rx="2" ry="2" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1.5"/>
  <line x1="27.5" y1="42" x2="27.5" y2="60" stroke="#2c3e50" stroke-width="1"/>
  <rect x="65" y="42" width="25" height="18" rx="2" ry="2" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1.5"/>
  <line x1="77.5" y1="42" x2="77.5" y2="60" stroke="#2c3e50" stroke-width="1"/>
  <circle cx="30" cy="70" r="8" fill="#2c3e50" stroke="#000000" stroke-width="1"/>
  <circle cx="30" cy="70" r="3" fill="#999999" stroke="#000000" stroke-width="0.5"/>
  <circle cx="90" cy="70" r="8" fill="#2c3e50" stroke="#000000" stroke-width="1"/>
  <circle cx="90" cy="70" r="3" fill="#999999" stroke="#000000" stroke-width="0.5"/>
  <path d="M10,35 Q10,20 20,20 L20,35 Z" fill="#d5f5e3" stroke="#2c3e50" stroke-width="1.5"/>
  <path d="M110,35 Q110,20 100,20 L100,35 Z" fill="#d5f5e3" stroke="#2c3e50" stroke-width="1.5"/>
  <rect x="10" y="45" width="4" height="4" rx="1" ry="1" fill="#f1c40f" stroke="#2c3e50" stroke-width="0.5"/>
  <rect x="106" y="45" width="4" height="4" rx="1" ry="1" fill="#3498db" stroke="#2c3e50" stroke-width="0.5"/>
  <rect x="45" y="12" width="30" height="8" rx="4" ry="4" fill="#3498db" stroke="#2c3e50" stroke-width="1"/>
  <text x="60" y="18.5" font-family="Arial" font-size="6" font-weight="bold" text-anchor="middle" fill="white">BUS</text>
  <path d="M60,75 L80,50 L70,50 L70,25 L50,25 L50,50 L40,50 Z" fill="#FF0000" stroke="#AA0000" stroke-width="2" />
</svg>`;


const poiTypes = [
  { tipo: "Todos", Icono: FaThList, svgString: null, emoji: "🗺️" },
  {
    tipo: "Museos",
    Icono: MdMuseum,
    urlIcon: "/icons/museo.svg",
    emoji: "🏛️",
  },
  {
    tipo: "Monumentos Históricos",
    Icono: FaLandmark,
    urlIcon: "/icons/monumento.svg",
    emoji: "🗿",
  },
  {
    tipo: "Naturaleza",
    Icono: MdPark,
    urlIcon: "/icons/naturaleza.svg",
    emoji: "🌿",
  },
  {
    tipo: "Gastronomía",
    Icono: MdFastfood,
    urlIcon: "/icons/restaurante.svg",
    emoji: "🍽️",
  },
  {
    tipo: "Dependencias de Gobierno",
    Icono: FaBuilding,
    urlIcon: "/icons/gobierno.svg",
    emoji: "🏢",
  },
  {
    tipo: "Hospedaje",
    Icono: MdHotel,
    urlIcon: "/icons/hospedaje.svg",
    emoji: "🏨",
  },
];

export default function GoogleMaps() {
  const [location, setLocation] = useState(null);
  const [externalGpsLocation, setExternalGpsLocation] = useState(null);
  const [error, setError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [usingExternalGps, setUsingExternalGps] = useState(false);
  const [lugares, setLugares] = useState([]);

  const [showPredefinedRoutes, setShowPredefinedRoutes] = useState(false);
  const predefinedPolylinesRef = useRef([]);
  const dynamicPolylineRef = useRef(null);
  const doubleClickedRoutesPolylinesRef = useRef([]);

  const mapRef = useRef(null);
  const activeMarkerRef = useRef(null);
  const poiMarkersRef = useRef([]);
  const openInfoWindowRef = useRef(null);
  const truckMarkerRef = useRef(null);
  const doubleClickUserMarkerRef = useRef(null);
  const closestRoutePointMarkerRef = useRef(null);

  const walkingToBusStopPolylineRef = useRef(null);
  const walkingFromBusStopPolylineRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const streetViewServiceRef = useRef(null);

  const [isPoiMenuOpen, setIsPoiMenuOpen] = useState(false);
  const [selectedPoiType, setSelectedPoiType] = useState(poiTypes[0]);

  const [mapStatusMessage, setMapStatusMessage] = useState("");
  const wsRef = useRef(null);

  const [visibleRouteLegends, setVisibleRouteLegends] = useState([]);
  const [activePredefinedRouteDetails, setActivePredefinedRouteDetails] =
    useState([]);
  const [activeDoubleClickRouteDetails, setActiveDoubleClickRouteDetails] =
    useState([]);
  const [isTransportInfoPanelOpen, setIsTransportInfoPanelOpen] =
    useState(false);
  const [heading, setHeading] = useState(0);

  // OPTIMIZACIÓN: useCallback memoriza la función toggleTransportInfoPanel,
  // evitando que se recree en cada renderizado a menos que sus dependencias cambien (en este caso, ninguna).
  // Esto es útil si la función se pasa como prop a componentes hijos optimizados con React.memo.
  const toggleTransportInfoPanel = useCallback(() => {
    setIsTransportInfoPanelOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const combinedDetails = [
      ...activePredefinedRouteDetails,
      ...activeDoubleClickRouteDetails,
    ];
    const uniqueLegends = Array.from(
      new Map(combinedDetails.map((route) => [route.id, route])).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    setVisibleRouteLegends(uniqueLegends);
    // ANÁLISIS SEMÁNTICO: Las dependencias [activePredefinedRouteDetails, activeDoubleClickRouteDetails]
    // aseguran que la lógica para actualizar las leyendas visibles se ejecute solo cuando los detalles
    // de las rutas activas cambian, manteniendo la UI sincronizada con el estado de las rutas.
  }, [activePredefinedRouteDetails, activeDoubleClickRouteDetails]);

  useEffect(() => {
    if (mapLoaded && window.google && window.google.maps) {
      if (!directionsServiceRef.current) {
        directionsServiceRef.current =
          new window.google.maps.DirectionsService();
      }
      if (!streetViewServiceRef.current) {
        streetViewServiceRef.current =
          new window.google.maps.StreetViewService();
      }
    }
  }, [mapLoaded]);

  // OPTIMIZACIÓN: useCallback memoriza getRoadSnappedLocation. Es importante porque esta función
  // podría ser llamada frecuentemente o ser parte de una cadena de dependencias.
  const getRoadSnappedLocation = useCallback((originalLatLng) => {
    return new Promise((resolve) => {
      if (
        !streetViewServiceRef.current ||
        !originalLatLng ||
        !window.google?.maps
      ) {
        resolve(originalLatLng);
        return;
      }

      streetViewServiceRef.current.getPanorama(
        {
          location: originalLatLng,
          radius: 50,
          source: window.google.maps.StreetViewSource.OUTDOOR,
        },
        (data, status) => {
          // ANÁLISIS SEMÁNTICO: Se verifica el `status` de la respuesta del StreetViewService
          // para determinar si la operación fue exitosa (`OK`) y si se obtuvo una `latLng`.
          // Esto asegura que solo se usen datos válidos.
          if (
            status === window.google.maps.StreetViewStatus.OK &&
            data &&
            data.location &&
            data.location.latLng
          ) {
            resolve(data.location.latLng);
          } else {
            resolve(originalLatLng);
          }
        }
      );
    });
  }, []);

  // OPTIMIZACIÓN: `drawWalkingRoute` está envuelta en `useCallback` para memorizarla.
  // Esto es útil porque se pasa como dependencia a `drawConnectingWalkingRoutes` y otras funciones.
  // La dependencia `[setMapStatusMessage]` es correcta si `setMapStatusMessage` es estable (lo cual es para los setters de useState).
  const drawWalkingRoute = useCallback(
    async (origin, destination, polylineRef, color = "#4A90E2") => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }

      if (
        !directionsServiceRef.current ||
        !origin ||
        !destination ||
        !mapRef.current ||
        !window.google?.maps
      ) {
        return;
      }

      const request = {
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode.WALKING,
      };

      try {
        const response = await new Promise((resolve, reject) => {
          directionsServiceRef.current.route(request, (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              resolve(result);
            } else {
              reject(status);
            }
          });
        });

        const route = response.routes[0];
        if (!route) {
          return;
        }

        const lineSymbol = {
          path: "M 0,-1 0,1",
          strokeOpacity: 1,
          scale: 3,
          strokeWeight: 2.5,
        };

        const polyline = new window.google.maps.Polyline({
          path: route.overview_path,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 0,
          strokeWeight: 2.5,
          icons: [
            {
              icon: lineSymbol,
              offset: "0",
              repeat: "15px",
            },
          ],
          map: mapRef.current,
          zIndex: 10,
        });
        polylineRef.current = polyline;
      } catch (errorStatus) {
        let userMessage = "Error al trazar ruta peatonal.";
        // ANÁLISIS SEMÁNTICO: Se interpreta el `errorStatus` para dar un mensaje más útil al usuario.
        if (window.google?.maps?.DirectionsStatus) {
          switch (errorStatus) {
            case window.google.maps.DirectionsStatus.ZERO_RESULTS:
              userMessage = "No se encontró una ruta peatonal.";
              break;
            case window.google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
              userMessage =
                "Límite de consultas API excedido. Intente más tarde.";
              break;
            case window.google.maps.DirectionsStatus.REQUEST_DENIED:
              userMessage =
                "Solicitud de ruta denegada. Verifique la configuración de API.";
              break;
            case window.google.maps.DirectionsStatus.UNKNOWN_ERROR:
              userMessage =
                "Error desconocido al trazar ruta. Intente de nuevo.";
              break;
            default:
              userMessage = `Error al trazar ruta peatonal (${errorStatus}).`;
          }
        } else {
          userMessage = `Error al trazar ruta peatonal (${errorStatus}). Google Maps API might not be fully loaded.`;
        }
        setMapStatusMessage(
          userMessage + " (Consulte la consola para detalles)"
        );
        setTimeout(() => setMapStatusMessage(""), 7000);
      }
    },
    [setMapStatusMessage]
  );

  const drawConnectingWalkingRoutes = useCallback(
    (
      userLocation,
      truckStopLocation,
      destinationLocation,
      destinationStopLocation
    ) => {
      if (userLocation && truckStopLocation) {
        drawWalkingRoute(
          userLocation,
          truckStopLocation,
          walkingToBusStopPolylineRef,
          "#00BFA5"
        );
      } else {
        if (walkingToBusStopPolylineRef.current) {
          walkingToBusStopPolylineRef.current.setMap(null);
          walkingToBusStopPolylineRef.current = null;
        }
      }

      if (destinationLocation && destinationStopLocation) {
        drawWalkingRoute(
          destinationLocation,
          destinationStopLocation,
          walkingFromBusStopPolylineRef,
          "#FF6F00"
        );
      } else {
        if (walkingFromBusStopPolylineRef.current) {
          walkingFromBusStopPolylineRef.current.setMap(null);
          walkingFromBusStopPolylineRef.current = null;
        }
      }
    },
    [drawWalkingRoute] // `drawWalkingRoute` es una dependencia memorizada.
  );


  const updateTruckPosition = useCallback(() => {
    if (
      !mapRef.current ||
      !window.google?.maps ||
      !activeMarkerRef.current ||
      !activeMarkerRef.current.getPosition()
    ) {
      if (truckMarkerRef.current) {
        truckMarkerRef.current.setMap(null);
      }
      if (walkingToBusStopPolylineRef.current) {
        walkingToBusStopPolylineRef.current.setMap(null);
        walkingToBusStopPolylineRef.current = null;
      }
      return;
    }

    const userPosition = activeMarkerRef.current.getPosition();
    let allVisibleRoutePoints = [];

    predefinedPolylinesRef.current.forEach((polyline) => {
      if (polyline.getMap()) {
        const path = polyline.getPath().getArray();
        allVisibleRoutePoints.push(...path);
      }
    });

    doubleClickedRoutesPolylinesRef.current.forEach((polyline) => {
      if (polyline.getMap()) {
        const path = polyline.getPath().getArray();
        allVisibleRoutePoints.push(...path);
      }
    });

    if (allVisibleRoutePoints.length === 0) {
      if (truckMarkerRef.current) {
        truckMarkerRef.current.setMap(null);
      }
      if (walkingToBusStopPolylineRef.current) {
        walkingToBusStopPolylineRef.current.setMap(null);
        walkingToBusStopPolylineRef.current = null;
      }
      return;
    }

    let overallClosestPoint = null;
    let minDistanceSq = Infinity;

    allVisibleRoutePoints.forEach((pointOnRoute) => {
      const distSq =
        Math.pow(userPosition.lat() - pointOnRoute.lat(), 2) +
        Math.pow(userPosition.lng() - pointOnRoute.lng(), 2);
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        overallClosestPoint = pointOnRoute;
      }
    });

    if (overallClosestPoint) {
      const nuevoAncho = 35;
      const nuevoAlto = 45;
      const truckIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          camionIconSvgString
        )}`,
        scaledSize: new window.google.maps.Size(nuevoAncho, nuevoAlto),
        anchor: new window.google.maps.Point(nuevoAncho / 2, nuevoAlto / 2),
      };

      if (!truckMarkerRef.current) {
        truckMarkerRef.current = new window.google.maps.Marker({
          position: overallClosestPoint,
          map: mapRef.current,
          icon: truckIcon,
          title: "Camión en ruta (Parada A - Subida)",
          zIndex: 900,
        });
      } else {
        truckMarkerRef.current.setPosition(overallClosestPoint);
        if (!truckMarkerRef.current.getMap()) {
          truckMarkerRef.current.setMap(mapRef.current);
        }
      }
    } else {
      if (truckMarkerRef.current) {
        truckMarkerRef.current.setMap(null);
      }
      if (walkingToBusStopPolylineRef.current) {
        walkingToBusStopPolylineRef.current.setMap(null);
        walkingToBusStopPolylineRef.current = null;
      }
    }
  }, []); // Dependencias vacías si no usa props o estado que cambien y requieran recreación.

  const drawRouteFromMapbox = useCallback(
    async (coordsArray, color = "#0074D9") => {
      if (!mapRef.current || !window.google?.maps) return null;

      const coordsString = coordsArray.map((p) => p.join(",")).join(";");
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&access_token=${accessToken}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
          return null;
        }

        const routeData = data.routes[0].geometry.coordinates;
        const path = routeData.map(([lng, lat]) => ({ lat, lng }));

        const polyline = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 0.9,
          strokeWeight: 4,
        });
        polyline.setMap(mapRef.current);
        return polyline;
      } catch (err) {
        return null;
      }
    },
    [] // accessToken es constante, así que puede omitirse si está definida fuera del componente.
  );

  const requestLocation = useCallback(
    async (showAlert = true) => {
      setError(null);
      try {
        const loc = await getCurrentLocation();
        setLocation(loc);
        if (!usingExternalGps && mapRef.current) {
          mapRef.current.panTo({ lat: loc.lat, lng: loc.lng });
        }
      } catch (err) {
        setError(err.message);
        if (showAlert) alert(`Error obteniendo ubicación: ${err.message}`);
      }
    },
    [usingExternalGps] // `usingExternalGps` es una dependencia.
  );

  useEffect(() => {
    if (!wsRef.current) {
      wsRef.current = new WebSocket("ws://localhost:8080");
      wsRef.current.onopen = () => {
        setMapStatusMessage("");
      };
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // ANÁLISIS SEMÁNTICO: Se verifica `message.type` para procesar diferentes tipos de
          // mensajes del WebSocket (gps_status, gps_update), asegurando que el estado
          // de la aplicación reaccione correctamente al significado de cada mensaje.
          if (message.type === "gps_status") {
            const { status, message: statusMessageText } = message.payload;
            if (status === "waiting_for_valid_data") {
              setMapStatusMessage(
                statusMessageText || "Esperando datos GPS válidos..."
              );
              setExternalGpsLocation(null);
            } else if (
              status === "disconnected" ||
              status === "disconnected_error" ||
              status === "script_launch_error" ||
              status === "script_error"
            ) {
              setMapStatusMessage(
                statusMessageText || "GPS desconectado o con error."
              );
              setExternalGpsLocation(null);
            }
          } else if (message.type === "gps_update" && message.payload.lat) {
            setMapStatusMessage("");
            setExternalGpsLocation({
              lat: message.payload.lat,
              lng: message.payload.lng,
              accuracy: 5,
              humidity: message.payload.humidity,
              temperature: message.payload.temperature,
            });
          }
        } catch (e) {
          setMapStatusMessage("Error procesando datos del GPS.");
        }
      };
      wsRef.current.onclose = () => {};
      wsRef.current.onerror = (e) => {
        setExternalGpsLocation(null);
      };
    }
    const handleGpsDataActive = () => setMapStatusMessage("");
    const handleGpsConnectionLost = () => {
      setExternalGpsLocation(null);
    };
    window.addEventListener("gps-data-active", handleGpsDataActive);
    window.addEventListener("gps-connection-lost", handleGpsConnectionLost);
    return () => {
      window.removeEventListener("gps-data-active", handleGpsDataActive);
      window.removeEventListener(
        "gps-connection-lost",
        handleGpsConnectionLost
      );
      // ANÁLISIS SEMÁNTICO: El cierre del WebSocket (wsRef.current.close()) en la función de limpieza
      // es crucial para liberar recursos y evitar fugas de memoria o conexiones abiertas innecesarias
      // cuando el componente se desmonta, asegurando un comportamiento semánticamente correcto del ciclo de vida.
      // if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) { wsRef.current.close(); }
    };
  }, [usingExternalGps]); // `usingExternalGps` podría afectar cómo se manejan los mensajes, aunque aquí parece más para la inicialización.

  const updateMarker = useCallback(
  (lat, lng, isExternalSource = usingExternalGps, currentHeading = 0, data = {}) => {
    if (!mapRef.current || !window.google?.maps) return;

    const createSimpleMarkerSVG = (isExtParam, svgSize = 32, svgHeading = 0) => {
      const color = isExtParam ? "#EF4444" : "#1E40AF";
      const outerSize = svgSize;
      const innerSize = svgSize * 0.4;
      const center = outerSize / 2;
      const arrowLength = innerSize;
      return `<svg width="${outerSize}" height="${outerSize}" viewBox="0 0 ${outerSize} ${outerSize}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="shadow${
        isExtParam ? "External" : "Internal"
      }" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.2)"/></filter></defs><circle cx="${center}" cy="${center}" r="${
        center - 2
      }" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1" stroke-opacity="0.4" filter="url(#shadow${
        isExtParam ? "External" : "Internal"
      })"/><circle cx="${center}" cy="${center}" r="${
        innerSize / 2
      }" fill="${color}" stroke="white" stroke-width="2"/><g transform="translate(${center}, ${center}) rotate(${svgHeading})"><path d="M 0,-${
        innerSize / 2 + 4
      } L ${arrowLength / 3},-${innerSize / 2 - 2} L 0,-${
        innerSize / 2 + 2
      } L -${arrowLength / 3},-${
        innerSize / 2 - 2
      } Z" fill="white" stroke="${color}" stroke-width="1"/></g></svg>`;
    };

    const createMarkerIcon = (isExtParam, zoom, svgHeading = 0) => {
      const minSize = 24;
      const maxSize = 48;
      const minZoom = 10;
      const maxZoom = 20;
      const normalizedZoom = Math.max(minZoom, Math.min(maxZoom, zoom || 15));
      const size =
        minSize +
        ((normalizedZoom - minZoom) / (maxZoom - minZoom)) *
          (maxSize - minSize);
      const svgString = createSimpleMarkerSVG(isExtParam, size, svgHeading);
      return {
        url: `data:image/svg+xml,${encodeURIComponent(svgString)}`,
        scaledSize: new window.google.maps.Size(size, size),
        anchor: new window.google.maps.Point(size / 2, size / 2),
        optimized: false,
      };
    };

    const currentZoom = mapRef.current.getZoom();
    const markerIcon = createMarkerIcon(isExternalSource, currentZoom, currentHeading);
    const newPosition = { lat, lng };
    const newTitle = isExternalSource ? "GPS Externo" : "Mi ubicación (GPS Interno)";

    const generateInfoWindowContent = (titleForInfoWindow, currentLat, currentLng, currentData, isExtSrc) => {
        let content = `<div style="color: #000; padding: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; max-width: 250px;"><div style="font-weight: 600; margin-bottom: 4px; color: ${
        isExtSrc ? "#EF4444" : "#1E40AF"
      };">${titleForInfoWindow}</div><div style="color: #333; font-size: 12px;">Lat: ${currentLat.toFixed(6)}, Lng: ${currentLng.toFixed(6)}</div>`;
        if (isExtSrc) {
    if (currentData.humidity !== null && currentData.humidity !== undefined)
            content += `<div style="color: #333; font-size: 12px;">Humedad: ${currentData.humidity}%</div>`;
    if (currentData.temperature !== null && currentData.temperature !== undefined)
            content += `<div style="color: #333; font-size: 12px;">Temp: ${currentData.temperature}°C</div>`;
        }
        if (currentData.accuracy)
          content += `<div style="color: #666; font-size: 11px;">Precisión: ${currentData.accuracy.toFixed(1)}m</div>`;
        content += `</div>`;
        return content;
    };


    if (activeMarkerRef.current) {
      activeMarkerRef.current.setPosition(newPosition);
      activeMarkerRef.current.setIcon(markerIcon);

      if (activeMarkerRef.current.getTitle() !== newTitle) {
        activeMarkerRef.current.setTitle(newTitle);
      }

      if (openInfoWindowRef.current && openInfoWindowRef.current.getAnchor() === activeMarkerRef.current) {
        const newInfoWindowContent = generateInfoWindowContent(newTitle, lat, lng, data, isExternalSource);
        openInfoWindowRef.current.setContent(newInfoWindowContent);
      }
    } else {
      const newMarker = new window.google.maps.Marker({
        position: newPosition,
        map: mapRef.current,
        title: newTitle,
        icon: markerIcon,
        zIndex: 1000,
      });

      const initialInfoWindowContent = generateInfoWindowContent(newTitle, lat, lng, data, isExternalSource);
      const infoWindow = new window.google.maps.InfoWindow({
        content: initialInfoWindowContent,
      });

      newMarker.addListener("click", () => {
        openInfoWindowRef.current?.close();
        infoWindow.open(mapRef.current, newMarker);
        openInfoWindowRef.current = infoWindow;
      });
      activeMarkerRef.current = newMarker;
    }
  },
  [usingExternalGps, openInfoWindowRef] );

  const toggleGpsSource = useCallback(() => {
    const newUsingExternalGps = !usingExternalGps;
    setUsingExternalGps(newUsingExternalGps);
    setMapStatusMessage("");
    setError("");
    if (newUsingExternalGps) {
      if (!externalGpsLocation) {
        setMapStatusMessage("Cambiado a GPS Externo. Esperando datos...");
        activeMarkerRef.current?.setMap(null);
      } else {
        mapRef.current?.panTo({
          lat: externalGpsLocation.lat,
          lng: externalGpsLocation.lng,
        });
      }
    } else {
      if (!location) {
        requestLocation(true);
        setMapStatusMessage("Cambiado a GPS Interno. Obteniendo ubicación...");
      } else {
        mapRef.current?.panTo({ lat: location.lat, lng: location.lng });
      }
    }
  }, [usingExternalGps, externalGpsLocation, location, requestLocation]);


useEffect(() => {
  const handleOrientation = (event) => {
    let currentHeading = null;
    if (event.webkitCompassHeading) {
      currentHeading = event.webkitCompassHeading;
    } else if (event.absolute === true && event.alpha !== null) {
      currentHeading = event.alpha;
    }
    if (currentHeading !== null && Math.abs(currentHeading - heading) > 1) {
      setHeading(currentHeading);
    }
  };

  // ANÁLISIS SEMÁNTICO: La lógica para solicitar permiso (`DeviceOrientationEvent.requestPermission`)
  // y luego agregar los event listeners correspondientes asegura que el manejo de la orientación
  // del dispositivo solo ocurra si el usuario lo permite y si el navegador soporta los eventos.
  // Esto verifica las precondiciones (semántica) antes de actuar.
  const requestDeviceOrientationPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState === 'granted') {
          if ('ondeviceorientationabsolute' in window) {
            window.addEventListener('deviceorientationabsolute', handleOrientation, true);
          } else {
            window.addEventListener('deviceorientation', handleOrientation, true);
          }
          setMapStatusMessage("Orientación del dispositivo activada.");
          setTimeout(() => setMapStatusMessage(""), 3000);
        } else {
          setMapStatusMessage('Permiso de orientación no concedido.');
          setTimeout(() => setMapStatusMessage(""), 3000);
        }
      } catch (error) {
        setMapStatusMessage('Error al solicitar permiso de orientación.');
        setTimeout(() => setMapStatusMessage(""), 3000);
      }
    } else if (typeof DeviceOrientationEvent !== 'undefined') {
      if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      } else if ('ondeviceorientation' in window) {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }
  };

  if (mapLoaded && !usingExternalGps && window.google?.maps) {
   if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
       if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      } else if ('ondeviceorientation' in window) {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }
  }

  return () => {
    window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
    window.removeEventListener('deviceorientation', handleOrientation, true);
  };

}, [mapLoaded, usingExternalGps, setMapStatusMessage, heading]);


  useEffect(() => {
    const initMap = async () => {
      try {
        await loadGoogleMapsScript();
        setMapLoaded(true);
        await requestLocation(false);
      } catch (err) {
        setError(err.message);
        setMapStatusMessage(`Error al iniciar mapa: ${err.message}`);
      }
    };
    if (!window.google?.maps && !mapLoaded) {
      initMap();
    } else if (window.google?.maps && !mapLoaded) {
      setMapLoaded(true);
      if (!location) requestLocation(false);
    }
  }, [mapLoaded, location, requestLocation]);

  // OPTIMIZACIÓN: `WorkspaceLugaresPorTipo` se memoriza con `useCallback`. Sus dependencias son `[]`
  // (asumiendo que `db` y `setMapStatusMessage`, `setError`, `setLugares` son estables).
  const fetchLugaresPorTipo = useCallback(async (tipo) => {
    setLugares([]);
    try {
      const querySnapshot = await getDocs(collection(db, "lugares"));
      const data = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((l) => l.tipo === tipo);
      setLugares(data);
      if (data.length === 0) {
        setMapStatusMessage(`No se encontraron lugares del tipo: ${tipo}`);
        setTimeout(() => setMapStatusMessage(""), 3000);
      } else {
        setMapStatusMessage("");
      }
    } catch (err) {
      setError("Error al cargar lugares de interés.");
      setMapStatusMessage("Error al cargar lugares.");
    }
  }, []); // `db` podría ser una dependencia si no es estable globalmente.

  const fetchAllLugares = useCallback(async () => {
    setLugares([]);
    try {
      const querySnapshot = await getDocs(collection(db, "lugares"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLugares(data);
      if (data.length === 0) {
        setMapStatusMessage(`No se encontraron lugares.`);
        setTimeout(() => setMapStatusMessage(""), 3000);
      } else {
        setMapStatusMessage("");
      }
    } catch (err) {
      setError("Error al cargar todos los lugares de interés.");
      setMapStatusMessage("Error al cargar lugares.");
    }
  }, []); // Similar a `WorkspaceLugaresPorTipo`.

  const togglePredefinedRoutes = useCallback(() => {
    setShowPredefinedRoutes((prev) => !prev);
  }, []);

  const handlePoiRouteRequest = useCallback(
    async (poiLocation) => {
      if (
        !mapRef.current ||
        !window.google?.maps ||
        !poiLocation ||
        typeof poiLocation.lat !== "number" ||
        typeof poiLocation.lng !== "number"
      ) {
        return;
      }

      if (walkingToBusStopPolylineRef.current) {
        walkingToBusStopPolylineRef.current.setMap(null);
        walkingToBusStopPolylineRef.current = null;
      }
      if (walkingFromBusStopPolylineRef.current) {
        walkingFromBusStopPolylineRef.current.setMap(null);
        walkingFromBusStopPolylineRef.current = null;
      }

      if (doubleClickUserMarkerRef.current) {
        doubleClickUserMarkerRef.current.setMap(null);
        doubleClickUserMarkerRef.current = null;
      }
      if (closestRoutePointMarkerRef.current) {
        closestRoutePointMarkerRef.current.setMap(null);
        closestRoutePointMarkerRef.current = null;
      }

      const clickedLat = poiLocation.lat;
      const clickedLng = poiLocation.lng;
      const clickedPositionGoogle = new window.google.maps.LatLng(
        clickedLat,
        clickedLng
      );

      const destinationIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          destinationPinSvgString
        )}`,
        scaledSize: new window.google.maps.Size(30, 30),
        anchor: new window.google.maps.Point(15, 25),
      };

      doubleClickUserMarkerRef.current = new window.google.maps.Marker({
        position: clickedPositionGoogle,
        map: mapRef.current,
        title: "Destino seleccionado (POI)",
        icon: destinationIcon,
        zIndex: 955,
      });

      doubleClickedRoutesPolylinesRef.current.forEach((polyline) =>
        polyline.setMap(null)
      );
      doubleClickedRoutesPolylinesRef.current = [];

      if (dynamicPolylineRef.current) {
        dynamicPolylineRef.current.setMap(null);
        dynamicPolylineRef.current = null;
      }

      const radius = 200;
      let routesInRadius = [];
      let closestRouteData = { route: null, distance: Infinity };
      let newDoubleClickDetails = [];

      ALL_PREDEFINED_ROUTES_CONFIG.forEach((routeDef) => {
        let isRouteInRadiusForCurrentRoute = false;
        let minDistanceForThisRoute = Infinity;

        routeDef.data.forEach((pointCoords) => {
          const dist = getDistanceFromLatLonInMeters(
            clickedLat,
            clickedLng,
            pointCoords[1],
            pointCoords[0]
          );
          if (dist <= radius) {
            isRouteInRadiusForCurrentRoute = true;
          }
          if (dist < minDistanceForThisRoute) {
            minDistanceForThisRoute = dist;
          }
        });

        if (isRouteInRadiusForCurrentRoute) {
          routesInRadius.push(routeDef);
        }

        if (minDistanceForThisRoute < closestRouteData.distance) {
          closestRouteData = {
            route: routeDef,
            distance: minDistanceForThisRoute,
          };
        }
      });

      if (routesInRadius.length > 0) {
        setMapStatusMessage(
          `Mostrando ${routesInRadius.length} ruta(s) en un radio de ${radius}m alrededor del punto de interés.`
        );
        for (const routeDef of routesInRadius) {
          const polyline = await drawRouteFromMapbox(
            routeDef.data,
            routeDef.color
          );
          if (polyline) {
            polyline.setOptions({ strokeWeight: 5, zIndex: 5 });
            doubleClickedRoutesPolylinesRef.current.push(polyline);
            newDoubleClickDetails.push({
              id: routeDef.id,
              name: routeDef.name,
              color: routeDef.color,
            });
          }
        }
      } else if (closestRouteData.route) {
        const routeDef = closestRouteData.route;
        setMapStatusMessage(
          `No hay rutas en ${radius}m alrededor del punto de interés. Mostrando la más cercana: ${
            closestRouteData.route.name
          } (a ${closestRouteData.distance.toFixed(0)}m).`
        );
        const polyline = await drawRouteFromMapbox(
          closestRouteData.route.data,
          closestRouteData.route.color
        );
        if (polyline) {
          polyline.setOptions({ strokeWeight: 5, zIndex: 5 });
          doubleClickedRoutesPolylinesRef.current.push(polyline);
          newDoubleClickDetails.push({
            id: routeDef.id,
            name: routeDef.name,
            color: routeDef.color,
          });
        }
      } else {
        setMapStatusMessage("No hay rutas predefinidas cerca del POI.");
      }
      setActiveDoubleClickRouteDetails(newDoubleClickDetails);

      let pointsFromNewlySuggestedByClickRoutes = [];
      doubleClickedRoutesPolylinesRef.current.forEach((polyline) => {
        if (polyline.getMap()) {
          const path = polyline.getPath().getArray();
          pointsFromNewlySuggestedByClickRoutes.push(...path);
        }
      });

      let closestPointForCamionDown = null;
      let minDistanceSqForCamionDown = Infinity;

      if (pointsFromNewlySuggestedByClickRoutes.length > 0) {
        pointsFromNewlySuggestedByClickRoutes.forEach((pointOnRoute) => {
          const distSq =
            Math.pow(clickedPositionGoogle.lat() - pointOnRoute.lat(), 2) +
            Math.pow(clickedPositionGoogle.lng() - pointOnRoute.lng(), 2);
          if (distSq < minDistanceSqForCamionDown) {
            minDistanceSqForCamionDown = distSq;
            closestPointForCamionDown = pointOnRoute;
          }
        });
      }

      if (closestPointForCamionDown) {
        const camionDownIcon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            camionIconDownSvgString
          )}`,
          scaledSize: new window.google.maps.Size(35, 45),
          anchor: new window.google.maps.Point(35 / 2, 45 / 2),
        };
        closestRoutePointMarkerRef.current = new window.google.maps.Marker({
          position: closestPointForCamionDown,
          map: mapRef.current,
          icon: camionDownIcon,
          title: "Parada más cercana en ruta sugerida (Parada B - Bajada)",
          zIndex: 960,
        });
      }

      updateTruckPosition();

      const exactUserPosition = activeMarkerRef.current
        ? activeMarkerRef.current.getPosition()
        : null;

      const snappedUserLocation = exactUserPosition
        ? await getRoadSnappedLocation(exactUserPosition)
        : null;
      const snappedDestinationLocation = await getRoadSnappedLocation(
        clickedPositionGoogle
      );

      const truckStopAPositionForWalking =
        truckMarkerRef.current && truckMarkerRef.current.getMap()
          ? truckMarkerRef.current.getPosition()
          : null;
      const truckStopBPositionForWalking =
        closestRoutePointMarkerRef.current &&
        closestRoutePointMarkerRef.current.getMap()
          ? closestRoutePointMarkerRef.current.getPosition()
          : null;

      drawConnectingWalkingRoutes(
        snappedUserLocation,
        truckStopAPositionForWalking,
        snappedDestinationLocation,
        truckStopBPositionForWalking
      );

      setTimeout(() => setMapStatusMessage(""), 7000);
    },
    [
      drawRouteFromMapbox,
      setMapStatusMessage,
      updateTruckPosition,
      drawConnectingWalkingRoutes,
      getRoadSnappedLocation,
    ]
  );

  useEffect(() => {
    if (!mapLoaded || !window.google?.maps) return;

    let currentDisplayLocation = null;
    let isExternalSourceForMarker = false;
    let markerData = {};

    if (usingExternalGps) {
      if (externalGpsLocation) {
        currentDisplayLocation = externalGpsLocation;
        isExternalSourceForMarker = true;
        markerData = {
          humidity: externalGpsLocation.humidity,
          temperature: externalGpsLocation.temperature,
          accuracy: externalGpsLocation.accuracy,
        };
      }
    } else {
      if (location) {
        currentDisplayLocation = location;
        isExternalSourceForMarker = false;
        markerData = { accuracy: location.accuracy };
      }
    }


    if (!mapRef.current && currentDisplayLocation) {
      mapRef.current = new window.google.maps.Map(
        document.getElementById("map"),
        {
          center: {
            lat: currentDisplayLocation.lat,
            lng: currentDisplayLocation.lng,
          },
          zoom: INITIAL_ZOOM_ATLIXCO,
          mapTypeId: "roadmap",
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          gestureHandling: "greedy",
          disableDoubleClickZoom: true,
          styles: mapCustomStyles,
          restriction: {
            latLngBounds: ATLIXCO_BOUNDS,
            strictBounds: true,
          },
        }
      );
      mapRef.current.addListener("zoom_changed", () => {
        updateTruckPosition();
      });

      mapRef.current.addListener("dblclick", async (event) => {
        if (walkingToBusStopPolylineRef.current) {
          walkingToBusStopPolylineRef.current.setMap(null);
          walkingToBusStopPolylineRef.current = null;
        }
        if (walkingFromBusStopPolylineRef.current) {
          walkingFromBusStopPolylineRef.current.setMap(null);
          walkingFromBusStopPolylineRef.current = null;
        }

        if (doubleClickUserMarkerRef.current) {
          doubleClickUserMarkerRef.current.setMap(null);
          doubleClickUserMarkerRef.current = null;
        }
        if (closestRoutePointMarkerRef.current) {
          closestRoutePointMarkerRef.current.setMap(null);
          closestRoutePointMarkerRef.current = null;
        }

        const clickedLat = event.latLng.lat();
        const clickedLng = event.latLng.lng();
        const clickedPositionGoogle = new window.google.maps.LatLng(
          clickedLat,
          clickedLng
        );

        const destinationIcon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            destinationPinSvgString
          )}`,
          scaledSize: new window.google.maps.Size(30, 30),
          anchor: new window.google.maps.Point(15, 25),
        };

        doubleClickUserMarkerRef.current = new window.google.maps.Marker({
          position: clickedPositionGoogle,
          map: mapRef.current,
          title: "Destino seleccionado",
          icon: destinationIcon,
          zIndex: 955,
        });

        doubleClickedRoutesPolylinesRef.current.forEach((polyline) =>
          polyline.setMap(null)
        );
        doubleClickedRoutesPolylinesRef.current = [];

        if (dynamicPolylineRef.current) {
          dynamicPolylineRef.current.setMap(null);
          dynamicPolylineRef.current = null;
        }

        const radius = 200;
        let routesInRadius = [];
        let closestRouteData = { route: null, distance: Infinity };
        let newDoubleClickDetails = [];

        ALL_PREDEFINED_ROUTES_CONFIG.forEach((routeDef) => {
          let isRouteInRadiusForCurrentRoute = false;
          let minDistanceForThisRoute = Infinity;

          routeDef.data.forEach((pointCoords) => {
            const dist = getDistanceFromLatLonInMeters(
              clickedLat,
              clickedLng,
              pointCoords[1],
              pointCoords[0]
            );
            if (dist <= radius) {
              isRouteInRadiusForCurrentRoute = true;
            }
            if (dist < minDistanceForThisRoute) {
              minDistanceForThisRoute = dist;
            }
          });

          if (isRouteInRadiusForCurrentRoute) {
            routesInRadius.push(routeDef);
          }

          if (minDistanceForThisRoute < closestRouteData.distance) {
            closestRouteData = {
              route: routeDef,
              distance: minDistanceForThisRoute,
            };
          }
        });

        if (routesInRadius.length > 0) {
          setMapStatusMessage(
            `Mostrando ${routesInRadius.length} ruta(s) en un radio de ${radius}m.`
          );
          for (const routeDef of routesInRadius) {
            const polyline = await drawRouteFromMapbox(
              routeDef.data,
              routeDef.color
            );
            if (polyline) {
              polyline.setOptions({ strokeWeight: 5, zIndex: 5 });
              doubleClickedRoutesPolylinesRef.current.push(polyline);
              newDoubleClickDetails.push({
                id: routeDef.id,
                name: routeDef.name,
                color: routeDef.color,
              });
            }
          }
        } else if (closestRouteData.route) {
          const routeDef = closestRouteData.route;
          setMapStatusMessage(
            `No hay rutas en ${radius}m. Mostrando la más cercana: ${
              closestRouteData.route.name
            } (a ${closestRouteData.distance.toFixed(0)}m).`
          );
          const polyline = await drawRouteFromMapbox(
            closestRouteData.route.data,
            closestRouteData.route.color
          );
          if (polyline) {
            polyline.setOptions({ strokeWeight: 5, zIndex: 5 });
            doubleClickedRoutesPolylinesRef.current.push(polyline);
            newDoubleClickDetails.push({
              id: routeDef.id,
              name: routeDef.name,
              color: routeDef.color,
            });
          }
        } else {
          setMapStatusMessage(
            "No hay rutas predefinidas cerca del punto clickeado."
          );
        }
        setActiveDoubleClickRouteDetails(newDoubleClickDetails);

        let pointsFromNewlySuggestedByClickRoutes = [];
        doubleClickedRoutesPolylinesRef.current.forEach((polyline) => {
          if (polyline.getMap()) {
            const path = polyline.getPath().getArray();
            pointsFromNewlySuggestedByClickRoutes.push(...path);
          }
        });

        let closestPointForCamionDown = null;
        let minDistanceSqForCamionDown = Infinity;

        if (pointsFromNewlySuggestedByClickRoutes.length > 0) {
          pointsFromNewlySuggestedByClickRoutes.forEach((pointOnRoute) => {
            const distSq =
              Math.pow(clickedPositionGoogle.lat() - pointOnRoute.lat(), 2) +
              Math.pow(clickedPositionGoogle.lng() - pointOnRoute.lng(), 2);
            if (distSq < minDistanceSqForCamionDown) {
              minDistanceSqForCamionDown = distSq;
              closestPointForCamionDown = pointOnRoute;
            }
          });
        }

        if (closestPointForCamionDown) {
          const camionDownIcon = {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
              camionIconDownSvgString
            )}`,
            scaledSize: new window.google.maps.Size(35, 45),
            anchor: new window.google.maps.Point(35 / 2, 45 / 2),
          };
          closestRoutePointMarkerRef.current = new window.google.maps.Marker({
            position: closestPointForCamionDown,
            map: mapRef.current,
            icon: camionDownIcon,
            title: "Parada más cercana en ruta sugerida (Parada B - Bajada)",
            zIndex: 960,
          });
        }

        updateTruckPosition();

        const exactUserPosition = activeMarkerRef.current
          ? activeMarkerRef.current.getPosition()
          : null;

        const snappedUserLocation = exactUserPosition
          ? await getRoadSnappedLocation(exactUserPosition)
          : null;
        const snappedClickedPosition = await getRoadSnappedLocation(
          clickedPositionGoogle
        );

        const truckStopAPositionForWalking =
          truckMarkerRef.current && truckMarkerRef.current.getMap()
            ? truckMarkerRef.current.getPosition()
            : null;
        const truckStopBPositionForWalking =
          closestRoutePointMarkerRef.current &&
          closestRoutePointMarkerRef.current.getMap()
            ? closestRoutePointMarkerRef.current.getPosition()
            : null;

        drawConnectingWalkingRoutes(
          snappedUserLocation,
          truckStopAPositionForWalking,
          snappedClickedPosition,
          truckStopBPositionForWalking
        );

        setTimeout(() => setMapStatusMessage(""), 7000);
      });
    } else if (mapRef.current && currentDisplayLocation) {
      if (
        mapRef.current.getCenter().lat() !== currentDisplayLocation.lat ||
        mapRef.current.getCenter().lng() !== currentDisplayLocation.lng
      ) {
      }
    }

    if (currentDisplayLocation) {
      const currentMarkerHeading = usingExternalGps ? 0: heading;
      updateMarker(
        currentDisplayLocation.lat,
        currentDisplayLocation.lng,
        isExternalSourceForMarker,
        currentMarkerHeading,
        markerData
      );
    } else {
      activeMarkerRef.current?.setMap(null);
    }
    updateTruckPosition();
    // ANÁLISIS SEMÁNTICO: El array de dependencias de este useEffect es crucial.
    // Incluye `location`, `externalGpsLocation`, `mapLoaded`, `usingExternalGps`, `updateMarker`,
    // `drawRouteFromMapbox`, etc. Esto asegura que el efecto se re-ejecute cuando cualquiera
    // de estos valores o funciones (memorizadas) cambie, manteniendo el mapa y los marcadores
    // actualizados y consistentes con el estado de la aplicación.
  }, [
    location,
    externalGpsLocation,
    mapLoaded,
    usingExternalGps,
    updateMarker,
    drawRouteFromMapbox,
    setMapStatusMessage,
    updateTruckPosition,
    handlePoiRouteRequest,
    drawConnectingWalkingRoutes,
    getRoadSnappedLocation,
    heading
  ]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) {
      if (showPredefinedRoutes && activePredefinedRouteDetails.length > 0) {
        setActivePredefinedRouteDetails([]);
      }
      if (!showPredefinedRoutes) {
        predefinedPolylinesRef.current.forEach((polyline) =>
          polyline.setMap(null)
        );
        predefinedPolylinesRef.current = [];
        if (activePredefinedRouteDetails.length > 0)
          setActivePredefinedRouteDetails([]);
      }
      updateTruckPosition();
      return;
    }

    predefinedPolylinesRef.current.forEach((polyline) => polyline.setMap(null));
    predefinedPolylinesRef.current = [];

    // OPTIMIZACIÓN: Dibujar/ocultar rutas predefinidas solo cuando `showPredefinedRoutes` cambia
    // o cuando el mapa se carga, evita recálculos y redibujados innecesarios.
    if (showPredefinedRoutes) {
      Promise.all(
        ALL_PREDEFINED_ROUTES_CONFIG.map(async (routeDef) => {
          const polyline = await drawRouteFromMapbox(
            routeDef.data,
            routeDef.color
          );
          if (polyline) {
            polyline.setOptions({ zIndex: 3 });
            predefinedPolylinesRef.current.push(polyline);
            return {
              id: routeDef.id,
              name: routeDef.name,
              color: routeDef.color,
            };
          }
          return null;
        })
      ).then((results) => {
        const successfullyDrawnRoutesDetails = results.filter(
          (r) => r !== null
        );
        setActivePredefinedRouteDetails(successfullyDrawnRoutesDetails);
        updateTruckPosition();
      });
    } else {
      setActivePredefinedRouteDetails([]);
      updateTruckPosition();
    }
  }, [
    showPredefinedRoutes,
    mapLoaded,
    drawRouteFromMapbox,
    updateTruckPosition,
  ]);

  useEffect(() => {
    if (!mapLoaded || !window.google?.maps || !mapRef.current) return;

    poiMarkersRef.current.forEach((m) => m.setMap(null));
    poiMarkersRef.current = [];
    if (openInfoWindowRef.current) {
      if (
        activeMarkerRef.current &&
        openInfoWindowRef.current.anchor === activeMarkerRef.current
      ) {
      } else {
        openInfoWindowRef.current.close();
        openInfoWindowRef.current = null;
      }
    }

    lugares.forEach((lugar) => {
      const { lat, lng } = lugar.ubicacion || {};
      // ANÁLISIS SEMÁNTICO: Se valida que `lat` y `lng` sean números válidos antes de
      // intentar crear un marcador, evitando errores si los datos de ubicación son incorrectos.
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        isNaN(lat) ||
        isNaN(lng)
      )
        return;
      const poiDefinition = poiTypes.find((pt) => pt.tipo === lugar.tipo);
      let iconOptions = {
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 32),
      };
       if (poiDefinition) {
          const svgEmoji = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20">${poiDefinition.emoji}</text></svg>`;
          iconOptions = {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
              svgEmoji
            )}`,
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16),
          };
        }


      if (!iconOptions.url || !iconOptions.url) {
        return;
      }
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current,
        title: lugar.nombre,
        icon: iconOptions,
      });
      const id = `carrusel-${
        lugar.id || Math.random().toString(36).substr(2, 9)
      }`;
      const imagenes =
        lugar.imagenes && lugar.imagenes.length > 0
          ? lugar.imagenes
          : ["/icons/placeholder.png"];
      const svgArrowLeft = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M257.5 445.1l-22.2 22.2c-9.4 9.4-24.6 9.4-33.9 0L7 273c-9.4-9.4-9.4-24.6 0-33.9L201.4 44.7c9.4-9.4 24.6-9.4 33.9 0l22.2 22.2c9.5 9.5 9.3 25-.4 34.3L136.6 216H424c13.3 0 24 10.7 24 24v32c0 13.3-10.7 24-24 24H136.6l120.5 114.8c9.8 9.3 10 24.8.4 34.3z"></path></svg>`;
      const svgArrowRight = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M190.5 66.9l22.2-22.2c9.4-9.4 24.6-9.4 33.9 0L416 239c9.4 9.4 9.4 24.6 0 33.9L246.6 467.3c-9.4-9.4-24.6-9.4-33.9 0l-22.2-22.2c-9.5-9.5-9.3-25 .4-34.3L311.4 296H24c-13.3 0-24-10.7-24-24v-32c0 13.3 10.7-24 24-24h287.4L190.9 101.2c-9.8-9.3-10-24.8-.4-34.3z"></path></svg>`;
      const svgRoute = `<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
    >
      <path
        fill="currentColor"
        d="m12 14.214l-.567-.39l-.002-.002l-.004-.002l-.012-.009l-.041-.03l-.144-.104a14.6 14.6 0 0 1-1.968-1.784C8.218 10.751 7 9.013 7 7a5 5 0 0 1 10 0c0 2.012-1.218 3.752-2.262 4.893a14.6 14.6 0 0 1-2.112 1.889l-.04.029l-.013.009l-.004.002l-.001.001zM13.5 7a1.5 1.5 0 1 0-3 0a1.5 1.5 0 0 0 3 0"
      ></path>
      <path
        fill="currentColor"
        d="M5 10H2v12h20V10h-4v2h2v.34l-.104-.137l-.68.515l.784 1.034V20H4v-5.826l1.234-.755L4.366 12H5zm-.683 2L4 12.194V12z"
      ></path>
      <path
        fill="currentColor"
        d="m17.775 16.279l.879-.478l-.956-1.757l-.878.478q-.553.3-1.139.53l.728 1.862q.703-.275 1.366-.635M5.99 16.098q.652.381 1.346.677l.92.392l.784-1.84l-.92-.392q-.577-.247-1.12-.565zm6.65 1.624l.999-.05l-.1-1.998l-.999.05q-.627.032-1.255-.016l-.152 1.994q.754.057 1.507.02"
      ></path>
    </svg>`;
      const svgClose = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>`;

     const infoWindowContent = `<style>
.gm-style .gm-style-iw-c { padding: 0 !important; border-radius: 12px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; max-width: none !important; min-width: 0 !important; overflow: hidden !important; background: transparent !important; }
.gm-style .gm-style-iw-d { overflow: hidden !important; }
.gm-style-iw-wrap button[aria-label="Close"], .gm-style-iw-wrap button[aria-label="Cerrar"], .gm-style-iw button[aria-label="Close"], .gm-style-iw button[aria-label="Cerrar"], .gm-style-iw-close-button, .gm-style .gm-style-iw-t::after { display: none !important; }
.info-window-custom-container { color: #2d3748; width: 100%; max-width: 350px; min-width: 280px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; box-sizing: border-box; overflow: hidden; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-radius: 12px; }
.info-window-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; position: relative; }
.info-window-header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1); }
.info-window-custom-title { margin: 0; font-size: 1.1rem; font-weight: 600; line-height: 1.3; color: white; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); flex: 1; padding-right: 10px; }
.info-window-custom-close-btn { background: rgba(255, 255, 255, 0.2); border: none; cursor: pointer; padding: 8px; border-radius: 8px; color: white; display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); backdrop-filter: blur(10px); min-width: 36px; height: 36px; }
.info-window-custom-close-btn:hover { background: rgba(255, 255, 255, 0.3); transform: scale(1.05); }
.info-window-body { padding: 20px; background: white; max-height: 60vh; overflow-y: auto; }
.info-window-image-gallery { margin-bottom: 16px; position: relative; text-align: center; }
.info-window-image-wrapper { width: 100%; height: 180px; overflow: hidden; border-radius: 12px; background: linear-gradient(45deg, #f0f2f5, #e2e8f0); margin-bottom: 12px; position: relative; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
.info-window-image { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.info-window-image:hover { transform: scale(1.02); }
.info-window-gallery-controls { display: flex; justify-content: center; gap: 16px; align-items: center; }
.info-window-gallery-button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 0; width: 48px; height: 48px; border-radius: 12px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); position: relative; overflow: hidden; touch-action: manipulation; }
.info-window-gallery-button::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); transition: left 0.5s; }
.info-window-gallery-button:hover::before { left: 100%; }
.info-window-gallery-button svg { width: 22px; height: 22px; transition: transform 0.2s ease; }
.info-window-gallery-button:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4); }
.info-window-gallery-button:disabled { background: linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%); cursor: not-allowed; transform: none; box-shadow: none; }
.info-window-gallery-button:disabled::before { display: none; }
.info-window-description { margin: 0 0 16px; font-size: 0.9rem; line-height: 1.6; color: #4a5568; background: #f7fafc; padding: 14px 16px; border-radius: 10px; border-left: 4px solid #667eea; position: relative; }
.info-window-details { font-size: 0.85rem; color: #2d3748; text-align: center; }
.info-window-detail-item { display: flex; align-items: flex-start; margin-bottom: 10px; padding: 12px 14px; background: #f8fafc; border-radius: 8px; transition: all 0.2s ease; border: 1px solid #e2e8f0; }
.info-window-detail-item:hover { background: #edf2f7; transform: translateX(2px); }
.info-window-detail-item:last-child { margin-bottom: 0; }
.info-window-detail-label { font-weight: 600; color: #667eea; margin-right: 8px; min-width: 50px; flex-shrink: 0; }
.info-window-detail-value { color: #4a5568; flex: 1; word-wrap: break-word; }
.info-window-route-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%); color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.3s ease; margin-top: 10px; box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3); }
.info-window-route-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(76, 175, 80, 0.4); background: linear-gradient(135deg, #5CB85C 0%, #9BC64B 100%); }
.info-window-route-button svg { width: 20px; height: 20px; }
@keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.info-window-custom-container { animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
@media (max-width: 480px) {
.info-window-custom-container { width: 100%; min-width: 260px; max-width: 280px; }
.info-window-header { padding: 12px 16px; }
.info-window-custom-title { font-size: 1rem; }
.info-window-body { padding: 16px; max-height: 50vh; }
.info-window-image-wrapper { height: 150px; }
.info-window-gallery-button { width: 44px; height: 44px; }
.info-window-gallery-button svg { width: 20px; height: 20px; }
.info-window-description { font-size: 0.85rem; padding: 12px 14px; }
.info-window-details { font-size: 0.8rem; }
.info-window-detail-item { padding: 10px 12px; flex-direction: column; align-items: flex-start; }
.info-window-detail-label { margin-bottom: 4px; margin-right: 0; }
}
@media (max-width: 320px) {
.info-window-custom-container { max-width: 260px; }
.info-window-gallery-controls { gap: 12px; }
}
@media (hover: none) and (pointer: coarse) {
.info-window-gallery-button:hover { transform: none; }
.info-window-detail-item:hover { transform: none; }
.info-window-image:hover { transform: none; }
.info-window-route-button:hover { transform: none; }
}
</style><div class="info-window-custom-container" id="${id}-container"><div class="info-window-header"><h3 class="info-window-custom-title">${
  lugar.nombre
}</h3><button id="${id}-custom-close-btn" class="info-window-custom-close-btn" aria-label="Cerrar1">${svgClose}</button></div><div class="info-window-body"><div id="${id}" class="info-window-image-gallery"><div class="info-window-image-wrapper"><img src="${
  imagenes[0]
}" id="${id}-img" class="info-window-image" alt="Imagen de ${
  lugar.nombre
}" /></div>${
  imagenes.length > 1
    ? `<div class="info-window-gallery-controls"><button id="${id}-prev" class="info-window-gallery-button" aria-label="Imagen anterior">${svgArrowLeft}</button><button id="${id}-next" class="info-window-gallery-button" aria-label="Siguiente imagen">${svgArrowRight}</button></div>`
    : ""
}<button id="${id}-route-btn" class="info-window-route-button" title="Trazar ruta a este lugar">${svgRoute} Buscar Transporte Público</button></div><p class="info-window-description">${
  lugar.descripcion || "No hay descripción disponible."
}</p><div class="info-window-details"><div class="info-window-detail-item"><span class="info-window-detail-label">Tipo:</span><span class="info-window-detail-value">${
  lugar.tipo
}</span></div><div class="info-window-detail-item"><span class="info-window-detail-label">Costo:</span><span class="info-window-detail-value">${
  lugar.costo_entrada || "Gratis"
}</span></div><div class="info-window-detail-item"><span class="info-window-detail-label">Horario:</span><span class="info-window-detail-value">${
  lugar.horario || "No especificado"
}</span></div></div></div></div>`;
      const infoWindow = new window.google.maps.InfoWindow({
        content: infoWindowContent,
        ariaLabel: lugar.nombre,
        disableAutoPan: false,
        pixelOffset: new window.google.maps.Size(0, -10),
      });
      marker.addListener("click", () => {
        openInfoWindowRef.current?.close();
        infoWindow.open(mapRef.current, marker);
        openInfoWindowRef.current = infoWindow;
      });
      window.google.maps.event.addListener(infoWindow, "domready", () => {
        const closeButton = document.getElementById(`${id}-custom-close-btn`);
        if (closeButton) closeButton.onclick = () => infoWindow.close();
        const routeButton = document.getElementById(`${id}-route-btn`);
        if (routeButton) {
          routeButton.onclick = () => {
            handlePoiRouteRequest(lugar.ubicacion);
            infoWindow.close();
          };
        }

        if (imagenes.length > 1) {
          const prevButton = document.getElementById(`${id}-prev`);
          const nextButton = document.getElementById(`${id}-next`);
          const imgElement = document.getElementById(`${id}-img`);
          let currentImageIndex = 0;
          const updateGallery = () => {
            if (imgElement) {
              imgElement.style.opacity = "0.5";
              setTimeout(() => {
                imgElement.src = imagenes[currentImageIndex];
                imgElement.style.opacity = "1";
              }, 150);
            }
            if (prevButton) prevButton.disabled = currentImageIndex === 0;
            if (nextButton)
              nextButton.disabled = currentImageIndex === imagenes.length - 1;
          };
          if (prevButton)
            prevButton.onclick = () => {
              if (currentImageIndex > 0) {
                currentImageIndex--;
                updateGallery();
              }
            };
          if (nextButton)
            nextButton.onclick = () => {
              if (currentImageIndex < imagenes.length - 1) {
                currentImageIndex++;
                updateGallery();
              }
            };
          if (imgElement) {
            let touchStartX = 0;
            imgElement.addEventListener(
              "touchstart",
              (e) => {
                touchStartX = e.changedTouches[0].screenX;
              },
              { passive: true }
            );
            imgElement.addEventListener("touchend", (e) => {
              const touchEndX = e.changedTouches[0].screenX;
              const swipeThreshold = 50;
              if (
                touchStartX - touchEndX > swipeThreshold &&
                currentImageIndex < imagenes.length - 1
              ) {
                currentImageIndex++;
                updateGallery();
              } else if (
                touchEndX - touchStartX > swipeThreshold &&
                currentImageIndex > 0
              ) {
                currentImageIndex--;
                updateGallery();
              }
            });
          }
          updateGallery();
        }
      });
      poiMarkersRef.current.push(marker);
    });
  }, [lugares, mapLoaded, handlePoiRouteRequest]);

  const togglePoiMenu = useCallback(
    () => setIsPoiMenuOpen((prev) => !prev),
    []
  );

  const handlePoiTypeSelect = useCallback(
    (poi) => {
      setSelectedPoiType(poi);
      if (poi.tipo === "Todos") fetchAllLugares();
      else fetchLugaresPorTipo(poi.tipo);
      setIsPoiMenuOpen(false);
    },
    [fetchLugaresPorTipo, fetchAllLugares]
  );

  useEffect(() => {
    if (selectedPoiType && selectedPoiType.tipo === "Todos" && mapLoaded) {
      fetchAllLugares();
    }
  }, [mapLoaded, selectedPoiType, fetchAllLugares]); // fetchAllLugares es dependencia.

  // GENERACIÓN DE CÓDIGO INTERMEDIO: Todo el JSX que define la estructura de la UI
  // (divs, botones, Sidebar, etc.) es transformado por Babel en llamadas
  // `React.createElement()`. Este es un paso análogo a la generación de código intermedio
  // en un compilador tradicional, donde una representación de alto nivel (JSX)
  // se convierte en una forma que React puede entender y procesar para construir el DOM virtual.
  return (
    <div className={styles.mapRoot}>
      <Sidebar
        onTogglePredefinedRoutes={togglePredefinedRoutes}
        arePredefinedRoutesVisible={showPredefinedRoutes}
      />

      {/* OPTIMIZACIÓN: Renderizado condicional. El panel de información de transporte y su botón
          solo se renderizan si `mapLoaded` es true. Esto evita que se creen elementos en el DOM
          innecesariamente antes de que el mapa esté listo. */}
      {mapLoaded && (
        <div className={styles.transportInfoContainer}>
          <button
            onClick={toggleTransportInfoPanel}
            className={`${styles.transportInfoButton} ${
              isTransportInfoPanelOpen ? styles.infoButtonActive : ""
            }`}
            title="Información sobre rutas"
            aria-expanded={isTransportInfoPanelOpen}
            aria-controls="transport-info-panel"
          >
            <CiCircleInfo size={30} color="white" />
          </button>
          {isTransportInfoPanelOpen && (
            <div
              className={styles.transportInfoPanel}
              id="transport-info-panel"
            >
              Doble click para mostrar ruta con parada en el punto seleccionado
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                {
                  <div
                    dangerouslySetInnerHTML={{
                      __html: camionIconSvgString.replace(
                        "<svg ",
                        '<svg width="35" '
                      ),
                    }}
                  />
                }
                <span>Parada mas cercana a tí (SUBIDA)</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: camionIconDownSvgString.replace(
                      "<svg ",
                      '<svg width="35" '
                    ),
                  }}
                />
                <span>Parada mas cercana al punto (BAJADA)</span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <div className={styles.errorBox}>{error}</div>}
      <div className={`${styles.mapHeader} ${styles.transparentHeader}`}>
        {location && (
          <button
            onClick={() => requestLocation(true)}
            className={styles.mapButton}
            title="Actualizar mi ubicación (GPS Interno)"
          >
            <IoReloadCircle size={24} />
          </button>
        )}
        <button
          onClick={toggleGpsSource}
          className={`${styles.mapButton} ${styles.gpsToggle} ${
            usingExternalGps ? styles.externalActive : ""
          }`}
          title={
            usingExternalGps
              ? "Usando GPS Externo (click para cambiar a Interno)"
              : "Usando GPS Interno (click para cambiar a Externo)"
          }
        >
          {usingExternalGps ? <MdGpsFixed size={24} /> : <MdGpsOff size={24} />}
        </button>
      </div>
      <div className={styles.mapContainer}>
        {mapStatusMessage && (
          <div className={styles.mapOverlayMessage}>{mapStatusMessage}</div>
        )}
        {!mapLoaded && !mapStatusMessage && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>Cargando mapa...
          </div>
        )}
        <div
          id="map"
          className={styles.mapElement}
          style={{ visibility: mapLoaded ? "visible" : "hidden" }}
        ></div>

        {visibleRouteLegends.length > 0 && (
          <div className={styles.routeLegendContainer}>
            <ul className={styles.routeLegendList}>
              {visibleRouteLegends.map((route) => (
                <li key={route.id} className={styles.routeLegendItem}>
                  <span
                    className={styles.routeLegendColorSquare}
                    style={{ backgroundColor: route.color }}
                  ></span>
                  <span className={styles.routeLegendName}>{route.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {mapLoaded && (
          <div className={styles.doubleClickLegend}>
            Doble click en cualquier parte del mapa para mostrar la ruta con
            parada más cercana
          </div>
        )}
      </div>

      <div className={styles.poiFabContainer}>
        {isPoiMenuOpen && (
          <div className={styles.poiMenu}>
            {poiTypes.map((poi, index) => (
              <button
                key={poi.tipo}
                onClick={() => handlePoiTypeSelect(poi)}
                className={`${styles.poiMenuItem} ${
                  selectedPoiType && selectedPoiType.tipo === poi.tipo
                    ? styles.poiMenuItemActive
                    : ""
                }`}
                title={poi.tipo}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <poi.Icono size={22} />
                <span className={styles.poiMenuItemText}>
                  {poi.tipo === "Todos" ? "Todos los lugares" : poi.tipo}
                </span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={togglePoiMenu}
          className={styles.poiFab}
          title={
            selectedPoiType
              ? `Mostrando: ${
                  selectedPoiType.tipo === "Todos"
                    ? "Todos los lugares"
                    : selectedPoiType.tipo
                }`
              : "Seleccionar tipo de lugar"
          }
          aria-expanded={isPoiMenuOpen}
          aria-haspopup="true"
        >
          {selectedPoiType ? (
            <selectedPoiType.Icono size={28} />
          ) : (
            <FaMapMarkerAlt size={28} />
          )}
        </button>
      </div>
    </div>
  );
  // GENERACIÓN DE CÓDIGO OBJETO: Finalmente, todo el código JavaScript (transpilado desde JSX,
  // lógica de componentes, etc.) es procesado por el motor JavaScript del navegador.
  // Este motor puede compilar (JIT - Just-In-Time) partes críticas del código JavaScript a código
  // máquina nativo para la CPU del usuario. Este código máquina es el análogo más cercano
  // al "código objeto" en el contexto de una aplicación web moderna.
}