import { useEffect, useState, useRef } from "react"; 
import styles from "../Estilos/GoogleMaps.module.css";
import Sidebar from "../Components/Sidebar";
import { IoReloadCircle } from "react-icons/io5";
import { MdGpsFixed, MdGpsOff } from "react-icons/md";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase-config";


//pruebas de la api para ruta
const accessToken = 'pk.eyJ1Ijoic3RheTEyIiwiYSI6ImNtYWtqdTVsYzFhZGEya3B5bWtocno3eWgifQ.wZpjzpjOw_LpIvl0P446Jg';
//Ruta de prueba
const rutatecnologico = [
    [-98.42483, 18.917694],
    [-98.428552, 18.919431],
    [-98.426565, 18.924332],
    [-98.425542, 18.92498],
    [-98.423189, 18.923191],
    [-98.423477, 18.921163],
    [-98.422767, 18.919978],
    [-98.422635, 18.920746],
    [-98.418238, 18.922761],
    [-98.429907, 18.91491],
    [-98.433306, 18.915236],
    [-98.435812, 18.908112],
    [-98.437376, 18.908615],
    [-98.436075, 18.90499],
    [-98.436623, 18.882513],
    [-98.436935, 18.88094],
    [-98.437086, 18.882399],
    [-98.436671, 18.882546]
];
const rutacerril =[
  [-98.43664211358958,18.88343376854101],
  [-98.437347,18.889894],
  [-98.43607,18.904877],
  [-98.435046,18.912657],
  [-98.431145,18.913152],
  [-98.42504,18.91748],
  [-98.425156,18.930683],
  [-98.424464,18.934194],
  [-98.425,18.917646],
  [-98.430655,18.91435],
  [-98.432399,18.914944],
  [-98.435805,18.908088],
  [-98.43735,18.90861],
  [-98.438398,18.905788],
  [-98.436673,18.883449]

];
const geo =[
  [-98.43664211358958,18.88343376854101],
  [-98.437347,18.889894],
  [-98.43607,18.904877],
  [-98.435046,18.912657],
  [-98.431145,18.913152],
  [-98.42504,18.91748],
  [-98.426693,18.942462],
  [-98.425473,18.931599],
  [-98.425,18.917646],
  [-98.430655,18.91435],
  [-98.432399,18.914944],
  [-98.435805,18.908088],
  [-98.43735,18.90861],
  [-98.438398,18.905788],
  [-98.436673,18.883449]
];
const nieves=[
  [-98.429681, 18.886328],
  [-98.435244, 18.87893],
  [-98.437116, 18.907201],
  [-98.411041, 18.925793],
  [-98.427224, 18.917614],
  [-98.434205, 18.912553],
  [-98.436818, 18.905187],
  [-98.436118, 18.88018],
  [-98.429765, 18.886228]
];

const homex=[


];

const coords = rutatecnologico.map(p => p.join(',')).join(';');
const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${accessToken}`;


// Función que carga el script de Google Maps y devuelve una promesa
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
    if (!navigator.geolocation) return reject(new Error("La geolocalización no es soportada por tu navegador"));
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
  const kmlUrl = "https://drive.google.com/uc?export=download&id=1x9QAfgazqKBYU0kmCOCXU6Od1oo_HhLU";

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
        ? `<div style=" color: #000; font-weight: bold;"><strong>GPS Externo</strong><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}</div>`
        : `<div style=" color: #000; font-weight: bold;"><strong>GPS Dispositivo</strong><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}</div>`,
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
        .map(doc => doc.data())
        .filter(lugar => lugar.tipo === tipo);
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
      mapRef.current = new window.google.maps.Map(document.getElementById("map"), {
        center: currentLocation,
        zoom: 15,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        gestureHandling: "greedy",
        disableDoubleClickZoom: true,
      });

      new window.google.maps.KmlLayer({
        url: kmlUrl,
        map: mapRef.current,
        preserveViewport: true,
        suppressInfoWindows: false,
      });
    }

    mapRef.current.panTo(currentLocation);
    updateMarker(currentLocation.lat, currentLocation.lng, usingExternalGps);
  }, [location, externalGpsLocation, mapLoaded, usingExternalGps]);
  ///USO DE PRUEBA DE RUTA

  useEffect(() => {
  if (!mapLoaded || !window.google?.maps || !mapRef.current) return;

  const coords = rutatecnologico.map(p => p.join(',')).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${accessToken}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (!data.routes || data.routes.length === 0) {
        console.warn("No se encontraron rutas desde Mapbox.");
        return;
      }

      const route = data.routes[0].geometry.coordinates;
      const path = route.map(([lng, lat]) => ({ lat, lng }));

      const polyline = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#0074D9',
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });

      polyline.setMap(mapRef.current);
    })
    .catch(error => {
      console.error("Error al obtener la ruta desde Mapbox:", error);
    });
}, [mapLoaded]);

  return (
    <div className={styles.mapRoot}>
      <Sidebar />
      <div className={`${styles.mapHeader} ${styles.transparentHeader}`}>
        {location && (
          <button onClick={requestLocation} className={styles.mapButton} title="Actualizar ubicación del dispositivo">
            <IoReloadCircle className={styles.reload} size={40} />
          </button>
        )}
        <button onClick={toggleGpsSource} className={`${styles.mapButton} ${styles.gpsToggle}`} title="Cambiar fuente GPS">
          {usingExternalGps ? <MdGpsFixed size={30} /> : <MdGpsOff size={30} />}
        </button>
      </div>

      <div className={styles.mapContainer}>
        <div id="map" className={styles.mapElement}></div>
      </div>

      <div className={styles.footerButtons}>
        {["Museos", "Monumentos Históricos", "Naturaleza", "Gastronomía", "Hospedaje"].map((tipo) => (
          <button key={tipo} onClick={() => fetchLugaresPorTipo(tipo)} className={styles.categoryButton}>
            {tipo}
          </button>
        ))}
      </div>
    </div>
  );
  
}
