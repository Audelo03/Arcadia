import { useEffect, useState, useRef } from "react";
import styles from "../Estilos/GoogleMaps.module.css";
import Sidebar from "../Components/Sidebar";
import { IoReloadCircle } from "react-icons/io5";
import { MdGpsFixed, MdGpsOff } from "react-icons/md";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase-config";

const loadGoogleMapsScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCVA6g0s25NHqbJrJlW1PPvp_w5uAI_IHw`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Error al cargar Google Maps"));
    document.head.appendChild(script);
  });
};

const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(
        new Error("La geolocalización no es soportada por tu navegador")
      );
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => reject(new Error("Ubicación no obtenida")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
};

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
  const kmlUrl =
    "https://drive.google.com/uc?export=download&id=1x9QAfgazqKBYU0kmCOCXU6Od1oo_HhLU";

  const requestLocation = async () => {
    setError(null);
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateMarker = (lat, lng, isExternalGps) => {
    if (!mapRef.current || !window.google?.maps) return;
    const position = { lat, lng };
    const isExternal = isExternalGps || usingExternalGps;
    if (activeMarkerRef.current) {
      activeMarkerRef.current.setMap(null);
      activeMarkerRef.current = null;
    }
    activeMarkerRef.current = new window.google.maps.Marker({
      position,
      map: mapRef.current,
      title: isExternal ? "GPS Externo" : "Mi ubicación actual",
    });
    const infoWindow = new window.google.maps.InfoWindow({
      content: isExternal
        ? `<div style=" color: #000; font-weight: bold;"><strong>GPS Externo</strong><br>Lat: ${lat.toFixed(
            6
          )}<br>Lng: ${lng.toFixed(6)}</div>`
        : `<div style=" color: #000; font-weight: bold;"><strong>GPS Dispositivo</strong><br>Lat: ${lat.toFixed(
            6
          )}<br>Lng: ${lng.toFixed(6)}</div>`,
    });
    activeMarkerRef.current.addListener("click", () => {
      infoWindow.open(mapRef.current, activeMarkerRef.current);
    });
  };

  const toggleGpsSource = () => {
    const newUsingExternalGps = !usingExternalGps;
    setUsingExternalGps(newUsingExternalGps);
    const current = newUsingExternalGps ? externalGpsLocation : location;
    if (current && mapRef.current) {
      updateMarker(current.lat, current.lng, newUsingExternalGps);
      mapRef.current.panTo({ lat: current.lat, lng: current.lng });
    }
  };

  useEffect(() => {
    const initializeMap = async () => {
      try {
        await loadGoogleMapsScript();
        setMapLoaded(true);
        await requestLocation();
      } catch (err) {
        setError(err.message);
      }
    };

    if (!window.google?.maps) {
      initializeMap();
    } else {
      setMapLoaded(true);
    }
  }, []);

  const fetchLugaresPorTipo = async (tipo) => {
    try {
      const querySnapshot = await getDocs(collection(db, "lugares"));
      const data = querySnapshot.docs
        .map((doc) => doc.data())
        .filter((lugar) => lugar.tipo === tipo);
      setLugares(data);
    } catch (error) {
      console.error("Error al obtener lugares:", error);
    }
  };

  useEffect(() => {
    if (!mapLoaded || !window.google?.maps) return;
    const currentLocation = usingExternalGps ? externalGpsLocation : location;
    if (!currentLocation) return;

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(
        document.getElementById("map"),
        {
          center: currentLocation,
          zoom: 15,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
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
        suppressInfoWindows: false,
      });
    }

    mapRef.current.panTo(currentLocation);
    updateMarker(currentLocation.lat, currentLocation.lng, usingExternalGps);

    // Limpiar marcadores anteriores
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Agregar nuevos marcadores
    lugares.forEach((lugar) => {
      if (!lugar.ubicacion?.lat || !lugar.ubicacion?.lng) return;
      const marker = new window.google.maps.Marker({
        position: { lat: lugar.ubicacion.lat, lng: lugar.ubicacion.lng },
        map: mapRef.current,
        title: lugar.nombre,
      });
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style=" color: #000; font-weight: bold;">
            <strong>${lugar.nombre}</strong><br/>
            ${lugar.descripcion}<br/>
            Tipo: ${lugar.tipo}<br/>
            Costo: ${lugar.costo_entrada || "Gratis"}<br/>
            Horario: ${lugar.horario || "No especificado"}
          </div>
        `,
      });
      marker.addListener("click", () => {
        infoWindow.open(mapRef.current, marker);
      });
      markersRef.current.push(marker);
    });
  }, [location, externalGpsLocation, mapLoaded, usingExternalGps, lugares]);

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
        <button
          onClick={toggleGpsSource}
          className={`${styles.mapButton} ${styles.gpsToggle}`}
          title="Cambiar fuente GPS"
        >
          {usingExternalGps ? <MdGpsFixed size={30} /> : <MdGpsOff size={30} />}
        </button>
      </div>

      <div className={styles.mapContainer}>
        <div id="map" className={styles.mapElement}></div>
      </div>

      <div className={styles.footerButtons}>
        {[
          { tipo: "Museos", emoji: "🏛️" },
          { tipo: "Monumentos Históricos", emoji: "🗿" },
          { tipo: "Naturaleza", emoji: "🌿" },
          { tipo: "Gastronomía", emoji: "🍽️" },
          { tipo: "Hospedaje", emoji: "🏨" },
        ].map(({ tipo, emoji }) => (
          <button
            key={tipo}
            onClick={() => fetchLugaresPorTipo(tipo)}
            className={styles.categoryButton}
          >
            <span>{emoji}</span> {tipo}
          </button>
        ))}
      </div>
    </div>
  );
}
