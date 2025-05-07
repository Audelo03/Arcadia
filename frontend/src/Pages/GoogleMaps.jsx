import { useEffect, useState } from "react";
import styles from "../Estilos/GoogleMaps.module.css";
import Sidebar from "../Components/Sidebar";
import { IoReloadCircle } from "react-icons/io5";
import { MdGpsFixed, MdGpsOff } from "react-icons/md";

// Función que carga el script de Google Maps y devuelve una promesa
const loadGoogleMapsScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      return resolve();
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCVA6g0s25NHqbJrJlW1PPvp_w5uAI_IHw`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Error al cargar Google Maps"));
    document.head.appendChild(script);
  });
};

// Función que envuelve la geolocalización en una promesa
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(
        new Error("La geolocalización no es soportada por tu navegador")
      );
    }
    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => reject(new Error("Ubicación no obtenida")),
      options
    );
  });
};

export default function GoogleMaps() {
  const [location, setLocation] = useState(null);
  const [externalGpsLocation, setExternalGpsLocation] = useState(null);
  const [error, setError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [usingExternalGps, setUsingExternalGps] = useState(false);
  const [showExternalGpsButton, setShowExternalGpsButton] = useState(false);
  const mapRef = useRef(null);
  const activeMarkerRef = useRef(null); // Un solo marcador activo en lugar de dos separados
  const wsRef = useRef(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Función para solicitar la ubicación
  const requestLocation = async () => {
    setError(null);
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
    } catch (err) {
      console.error("Error de geolocalización:", err);
      setError(err.message);
    }
  };

  // Conectar al WebSocket para recibir datos del GPS externo
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) return; // Evitar múltiples conexiones

    try {
      const ws = new WebSocket("ws://localhost:8080");
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Conectado al WebSocket del servidor para datos GPS");
        setShowExternalGpsButton(true);
      };

      ws.onclose = () => {
        console.log("Desconectado del WebSocket del GPS");
        wsRef.current = null;
        setShowExternalGpsButton(false);

        // Revertir a GPS del dispositivo si estábamos usando GPS externo
        if (usingExternalGps) {
          setUsingExternalGps(false);
        }

        // Reintentar conexión después de 5 segundos
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error("Error en WebSocket del GPS:", error);
        setShowExternalGpsButton(false);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "gps_update" && message.payload) {
            const { lat, lng } = message.payload;
            console.log("Datos GPS recibidos:", message.payload);

            setExternalGpsLocation({
              lat: parseFloat(lat),
              lng: parseFloat(lng),
              timestamp: new Date().toLocaleTimeString(),
            });

            setLastUpdate(new Date());
            setShowExternalGpsButton(true);

            // Si estamos usando GPS externo, actualizar la vista del mapa
            if (usingExternalGps && mapRef.current) {
              updateMarker(parseFloat(lat), parseFloat(lng), true);
            }
          }
        } catch (error) {
          console.error("Error al procesar mensaje WebSocket:", error);
        }
      };
    } catch (error) {
      console.error("Error al conectar con WebSocket:", error);
      setShowExternalGpsButton(false);
    }
  }, [usingExternalGps]);

  // Función para desconectar WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      console.log("Cerrando WebSocket del GPS manualmente");
      wsRef.current.close();
      wsRef.current = null;
    }

    // Limpiar estados del GPS externo
    setShowExternalGpsButton(false);
    if (usingExternalGps) {
      setUsingExternalGps(false);
    }

    // Mostrar el marcador del GPS del dispositivo si está disponible
    if (location && mapRef.current) {
      updateMarker(location.lat, location.lng, false);
      mapRef.current.panTo({ lat: location.lat, lng: location.lng });
    }
  }, [location, usingExternalGps]);

  // Función unificada para actualizar el marcador según la fuente de ubicación
  const updateMarker = (lat, lng, isExternalGps) => {
    if (!mapRef.current || !window.google?.maps) return;

    const position = { lat, lng };
    const isExternal = isExternalGps || usingExternalGps;

    // Eliminar el marcador existente si hay uno
    if (activeMarkerRef.current) {
      activeMarkerRef.current.setMap(null);
      activeMarkerRef.current = null;
    }

    // Crear un nuevo marcador con el estilo correspondiente
    activeMarkerRef.current = new window.google.maps.Marker({
      position,
      map: mapRef.current,
      title: isExternal ? "GPS Externo" : "Mi ubicación actual",
      icon: {
        url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="5" fill="${
              isExternal ? "#FF3300" : "#0033FF"
            }"/>
            <circle cx="20" cy="20" r="7" fill="none" stroke="#ffffff" stroke-width="4"/>
            <circle cx="20" cy="20" r="20" fill="${
              isExternal ? "#FFCCCC" : "#AECBFA"
            }" fill-opacity="0.4"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20),
      },
    });

    // Crear un infowindow para mostrar datos
    const infoContent = isExternal
      ? `<div>
          <strong>GPS Externo</strong><br>
          Lat: ${lat.toFixed(6)}<br>
          Lng: ${lng.toFixed(6)}<br>
          Última actualización: ${new Date().toLocaleTimeString()}
        </div>`
      : `<div>
          <strong>GPS Dispositivo</strong><br>
          Lat: ${lat.toFixed(6)}<br>
          Lng: ${lng.toFixed(6)}
        </div>`;

    const infoWindow = new window.google.maps.InfoWindow({
      content: infoContent,
    });

    // Mostrar info al hacer clic
    activeMarkerRef.current.addListener("click", () => {
      infoWindow.open(mapRef.current, activeMarkerRef.current);
    });
  };

  // Cambiar entre GPS del dispositivo y GPS externo
  const toggleGpsSource = () => {
    const newUsingExternalGps = !usingExternalGps;
    setUsingExternalGps(newUsingExternalGps);

    // Actualizar el marcador según la nueva fuente seleccionada
    if (mapRef.current) {
      if (newUsingExternalGps && externalGpsLocation) {
        updateMarker(externalGpsLocation.lat, externalGpsLocation.lng, true);
        mapRef.current.panTo({
          lat: externalGpsLocation.lat,
          lng: externalGpsLocation.lng,
        });
      } else if (!newUsingExternalGps && location) {
        updateMarker(location.lat, location.lng, false);
        mapRef.current.panTo({ lat: location.lat, lng: location.lng });
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      try {
        await loadGoogleMapsScript();
        if (isMounted) {
          setMapLoaded(true);
          await requestLocation();
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError(err.message);
        }
      }
    };

    initializeMap();

    // Limpiar al desmontar
    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      const googleMapScript = document.querySelector(
        `script[src*="maps.googleapis.com"]`
      );
      if (googleMapScript) {
        googleMapScript.remove();
      }
    };
  }, []);

  // Escuchar eventos de conexión de GPS desde Sidebar
  useEffect(() => {
    const handleGpsConnected = (event) => {
      console.log("Evento de GPS conectado recibido");
      connectWebSocket();
    };

    const handleGpsDisconnected = (event) => {
      console.log("Evento de GPS desconectado recibido");
      disconnectWebSocket();
    };

    window.addEventListener("gps-connected", handleGpsConnected);
    window.addEventListener("gps-disconnected", handleGpsDisconnected);

    return () => {
      window.removeEventListener("gps-connected", handleGpsConnected);
      window.removeEventListener("gps-disconnected", handleGpsDisconnected);
    };
  }, [connectWebSocket, disconnectWebSocket]);

  // Efecto para inicializar y actualizar el mapa
  useEffect(() => {
    if (!mapLoaded || !window.google?.maps) return;

    // Usar la ubicación adecuada según el modo seleccionado
    const currentLocation = usingExternalGps ? externalGpsLocation : location;

    // Si no hay ubicación disponible para el modo seleccionado, no hacer nada
    if (!currentLocation) return;

    // Si el mapa ya está creado, actualizar
    if (mapRef.current) {
      // Actualizar vista si cambió el modo de GPS
      mapRef.current.panTo({
        lat: currentLocation.lat,
        lng: currentLocation.lng,
      });

      // Actualizar el marcador con la ubicación apropiada
      updateMarker(currentLocation.lat, currentLocation.lng, usingExternalGps);

      return;
    }

    // Crear el mapa por primera vez
    mapRef.current = new window.google.maps.Map(
      document.getElementById("map"),
      {
        center: { lat: currentLocation.lat, lng: currentLocation.lng },
        zoom: 16,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        gestureHandling: "greedy",
        disableDoubleClickZoom: true,
      }
    );

    // Crear marcador inicial
    updateMarker(currentLocation.lat, currentLocation.lng, usingExternalGps);
  }, [location, externalGpsLocation, mapLoaded, usingExternalGps]);

  return (
    <div className={styles.mapRoot}>
      <Sidebar />
      <div className={`${styles.mapHeader} ${styles.transparentHeader}`}>
        {location && (
          <button
            onClick={requestLocation}
            className={styles.mapButton}
            title="Actualizar ubicación del dispositivo"
          >
            <IoReloadCircle className={styles.reload} size={40} />
          </button>
        )}

        {/* Botón para cambiar entre GPS del dispositivo y GPS externo */}
        {showExternalGpsButton && externalGpsLocation && (
          <button
            onClick={toggleGpsSource}
            className={`${styles.mapButton} ${styles.gpsToggle} ${
              usingExternalGps ? styles.active : ""
            }`}
            title={
              usingExternalGps
                ? "Cambiar a GPS del dispositivo"
                : "Cambiar a GPS externo"
            }
          >
            {usingExternalGps ? (
              <MdGpsFixed size={30} />
            ) : (
              <MdGpsOff size={30} />
            )}
            <span className={styles.gpsLabel}>
              {usingExternalGps ? "GPS Externo" : "GPS Dispositivo"}
            </span>
          </button>
        )}

        {/* Indicador de última actualización del GPS externo */}
        {showExternalGpsButton && externalGpsLocation && (
          <div className={styles.gpsInfo}>
            <div className={styles.gpsCoords}>
              {externalGpsLocation.lat.toFixed(6)},{" "}
              {externalGpsLocation.lng.toFixed(6)}
            </div>
            <div className={styles.gpsTimestamp}>
              Actualizado: {externalGpsLocation.timestamp}
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errorBox}>
            <p>{error}</p>
          </div>
        )}
      </div>
      <div className={styles.mapContainer}>
        <div id="map" className={styles.mapElement}></div>
        {!location && !externalGpsLocation && !error && !mapLoaded && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Esperando respuesta de ubicación...</p>
          </div>
        )}
      </div>
    </div>
  );
}
