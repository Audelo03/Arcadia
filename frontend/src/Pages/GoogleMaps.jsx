import React, { useEffect, useState, useRef, useCallback } from "react";
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
import { FaLandmark, FaBuilding, FaMapMarkerAlt, FaThList } from "react-icons/fa"; // FaThList para "Todos"
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase-config"; // Asegúrate que la ruta sea correcta

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
const url = 'https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${accessToken}';

// Carga el script de Google Maps solo si aún no está cargado
const loadGoogleMapsScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCVA6g0s25NHqbJrJlW1PPvp_w5uAI_IHw&libraries=places`; // REEMPLAZA TU_API_KEY
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Error al cargar Google Maps. Verifica la API Key."));
    document.head.appendChild(script);
  });

// Obtiene la ubicación actual del usuario
const getCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("Geolocalización no soportada por este navegador."));
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        let message = "No se pudo obtener la ubicación: ";
        switch(err.code) {
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
        reject(new Error(message))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });

// --- INICIO DE SVGs ---
const museoIconSvgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32px" height="32px">
  <defs>
    <linearGradient id="museoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#3E2723; stop-opacity:1" />
      <stop offset="50%" style="stop-color:#5D4037; stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1C0E0A; stop-opacity:1" />
    </linearGradient>
    <radialGradient id="museoHighlight" cx="50%" cy="30%" r="70%">
      <stop offset="0%" style="stop-color:#6D4C41; stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#3E2723; stop-opacity:0.2" />
    </radialGradient>
  </defs>
  <path fill="url(#museoGradient)" d="M22 11V9L12 2L2 9v2h2v9H2v2h20v-2h-2v-9zm-4 9H6V9h12z"/>
  <path fill="url(#museoHighlight)" d="M22 11V9L12 2L2 9v2h2v9H2v2h20v-2h-2v-9zm-4 9H6V9h12z"/>
  <path fill="#D7CCC8" d="M6 20h12V9H6zm2-9h2l2 3l2-3h2v7h-2v-4l-2 3l-2-3v4H8z" opacity=".9"/>
  <circle fill="#8D6E63" cx="12" cy="6" r="1" opacity="0.6"/>
</svg>`;

const restauranteIconSvgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="32px" height="32px">
  <title>Icono de Restaurante</title>
  <defs>
    <linearGradient id="restauranteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4E342E; stop-opacity:1" />
      <stop offset="30%" style="stop-color:#6D4C41; stop-opacity:1" />
      <stop offset="70%" style="stop-color:#5D4037; stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3E2723; stop-opacity:1" />
    </linearGradient>
    <linearGradient id="restauranteAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8D6E63; stop-opacity:0.7" />
      <stop offset="100%" style="stop-color:#4E342E; stop-opacity:0.3" />
    </linearGradient>
  </defs>
  <path fill="url(#restauranteGradient)" d="M342.7 223.94h14.87a79.48 79.48 0 0 0 56.58-23.44L496 118l-22.22-22.4l-83.58 83.58l-17.37-17.37l83.58-83.59l-23-22.31l-83.27 83.26l-17.32-17.37l83.58-83.59L394 16l-82.5 81.85a79.5 79.5 0 0 0-23.44 56.59v14.86l-43.13 43.13L48 16C3.72 70.87 29.87 171.71 79.72 221.57l85.5 85.5c26.55 26.55 31.82 28.92 61.94 16.8c6.49-2.61 8.85-2.32 14.9 3.72l13 12.13c2.93 3 3 3.88 3 9.62v5.54c0 21.08 13.48 33.2 22.36 42.24L384 496l72-72l-156.43-156.93 Z" />
  <path fill="url(#restauranteAccent)" d="M342.7 223.94h14.87a79.48 79.48 0 0 0 56.58-23.44L496 118l-22.22-22.4l-83.58 83.58l-17.37-17.37l83.58-83.59l-23-22.31l-83.27 83.26l-17.32-17.37l83.58-83.59L394 16l-82.5 81.85a79.5 79.5 0 0 0-23.44 56.59v14.86l-43.13 43.13L48 16C3.72 70.87 29.87 171.71 79.72 221.57l85.5 85.5c26.55 26.55 31.82 28.92 61.94 16.8c6.49-2.61 8.85-2.32 14.9 3.72l13 12.13c2.93 3 3 3.88 3 9.62v5.54c0 21.08 13.48 33.2 22.36 42.24L384 496l72-72l-156.43-156.93 Z" />
  <path fill="url(#restauranteGradient)" d="M227.37 354.59c-29.82 6.11-48.11 11.74-83.08-23.23c-.56-.56-1.14-1.1-1.7-1.66l-19.5-19.5L16 416l80 80l144-144Z" />
</svg>`;

const monumentoHistoricoIconSvgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32px" height="32px">
  <title>Monumento Histórico</title>
  <defs>
    <linearGradient id="monumentoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#424242; stop-opacity:1"/>
      <stop offset="30%" style="stop-color:#616161; stop-opacity:1"/>
      <stop offset="70%" style="stop-color:#424242; stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#212121; stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="monumentoShadow" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#757575; stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:#212121; stop-opacity:0.7"/>
    </linearGradient>
  </defs>
  <g fill="url(#monumentoGradient)">
    <path d="M23.025 12.49H9.005v13.99h14.02z"/>
    <path d="M28.965 29.47H3.025V27.1c0-.35.28-.63.63-.63h24.69c.35 0 .63.28.63.63v2.37z"/>
    <path d="M4.045 10.49h23.95v1.37c0 .35-.28.63-.63.63h-22.7c-.35 0-.63-.28-.63-.63v-1.37z"/>
    <path d="M8.995 13.46h-2.99v12.1h2.99z"/>
    <path d="M14.655 13.46h-2.99v12.1h2.99z"/>
    <path d="M20.315 13.46h-2.99v12.1h2.99z"/>
    <path d="M25.975 13.46h-2.99v12.1h2.99z"/>
    <path d="M15.326 3.01L3.366 9.75c-.36.2-.22.76.2.76h24.88c.42 0 .56-.55.2-.76l-11.96-6.74c-.42-.24-.94-.24-1.36 0"/>
  </g>
  <g fill="url(#monumentoShadow)">
    <path d="M23.025 12.49H9.005v13.99h14.02z" opacity="0.3"/>
    <path d="M26.975 13.46h-2.99v12.1h2.99z" opacity="0.5"/>
    <path d="M21.315 13.46h-2.99v12.1h2.99z" opacity="0.4"/>
    <path d="M15.655 13.46h-2.99v12.1h2.99z" opacity="0.3"/>
  </g>
  <g fill="#9E9E9E">
    <path d="M5.015 12.49h4.99v1h-4.99z" />
    <path d="M10.665 12.49h4.99v1h-4.99z" />
    <path d="M16.325 12.49h4.99v1h-4.99z" />
    <path d="M21.985 12.49h4.99v1h-4.99z" />
    <path d="M5.015 25.48h4.99v1h-4.99z" />
    <path d="M10.665 25.48h4.99v1h-4.99z" />
    <path d="M16.325 25.48h4.99v1h-4.99z" />
    <path d="M21.985 25.48h4.99v1h-4.99z" />
  </g>
</svg>`;

const naturalezaIconSvgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="32px" height="32px">
  <title>Naturaleza</title>
  <defs>
    <linearGradient id="follajeGradient" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:#2E7D32;" />
      <stop offset="40%" style="stop-color:#388E3C;" />
      <stop offset="80%" style="stop-color:#1B5E20;" />
      <stop offset="100%" style="stop-color:#0D2818;" />
    </linearGradient>
    <linearGradient id="troncoGradient" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:#4E342E;" />
      <stop offset="50%" style="stop-color:#5D4037;" />
      <stop offset="100%" style="stop-color:#3E2723;" />
    </linearGradient>
    <radialGradient id="follajeHighlight" cx="40%" cy="20%" r="60%">
      <stop offset="0%" style="stop-color:#4CAF50; stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#1B5E20; stop-opacity:0.2" />
    </radialGradient>
  </defs>
  <path fill="url(#troncoGradient)" d="M25 52.1h14V64H25z"/>
  <path fill="#3E2723" d="M27 54.1h10V62H27z" opacity="0.6"/>
  
  <path fill="url(#follajeGradient)" d="M32 34.9L2 55.1s14.5 3.4 30 3.4s30-3.4 30-3.4z"/>
  <path fill="url(#follajeHighlight)" d="M32 34.9L2 55.1s14.5 3.4 30 3.4s30-3.4 30-3.4z" opacity="0.5"/>
  
  <path fill="url(#follajeGradient)" d="M32 23.6L7 43.8s12.1 3.4 25 3.4s25-3.4 25-3.4z" style="opacity:0.95"/>
  <path fill="url(#follajeHighlight)" d="M32 23.6L7 43.8s12.1 3.4 25 3.4s25-3.4 25-3.4z" style="opacity:0.4"/>
  
  <path fill="url(#follajeGradient)" d="M32 12.3L12 32.5s9.7 3.4 20 3.4s20-3.4 20-3.4z" style="opacity:0.9"/>
  <path fill="url(#follajeHighlight)" d="M32 12.3L12 32.5s9.7 3.4 20 3.4s20-3.4 20-3.4z" style="opacity:0.3"/>
  
  <path fill="url(#follajeGradient)" d="M32 1L17 20.8s7.2 3.8 15 3.8s15-3.8 15-3.8z" style="opacity:0.85"/>
  <path fill="url(#follajeHighlight)" d="M32 1L17 20.8s7.2 3.8 15 3.8s15-3.8 15-3.8z" style="opacity:0.25"/>
</svg>`;

const gobiernoIconSvgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32px" height="32px">
  <title>Dependencia de Gobierno</title>
  <defs>
    <linearGradient id="gobiernoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#37474F; stop-opacity:1"/>
      <stop offset="30%" style="stop-color:#455A64; stop-opacity:1"/>
      <stop offset="70%" style="stop-color:#37474F; stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#263238; stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="gobiernoAccent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#546E7A; stop-opacity:0.6"/>
      <stop offset="100%" style="stop-color:#263238; stop-opacity:0.8"/>
    </linearGradient>
    <radialGradient id="gobiernoHighlight" cx="50%" cy="30%" r="70%">
      <stop offset="0%" style="stop-color:#607D8B; stop-opacity:0.4"/>
      <stop offset="100%" style="stop-color:#263238; stop-opacity:0.1"/>
    </radialGradient>
  </defs>
  <path fill="url(#gobiernoGradient)" d="M13.032 2.336a1.75 1.75 0 0 0-2.064 0L3.547 7.75c-.977.712-.474 2.256.734 2.258H16V10h3v.007h.719c1.208-.002 1.71-1.546.734-2.258zM12 5.26a1 1 0 1 1 0 2a1 1 0 0 1 0-2m-.75 10.149q-.137.28-.2.594h-1.8v-4.997h2zm3.5-3.972A2.75 2.75 0 0 0 13 14v.05a3 3 0 0 0-.25.064v-3.108h2zM11 17.003V20.5H3.75a.75.75 0 0 1-.75-.75v-.5a2.25 2.25 0 0 1 2.25-2.248zm-5.5-1h2.25v-4.996H5.5zM14 15h-.5a1.5 1.5 0 0 0-1.5 1.5V18h2.5v-.25a.75.75 0 0 1 1.5 0V18h3v-.25a.75.75 0 0 1 1.5 0V18H23v-1.5a1.5 1.5 0 0 0-1.5-1.5H21v-1a1.75 1.75 0 0 0-1.75-1.75h-3.5A1.75 1.75 0 0 0 14 14zm1.5-1a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v1h-4zm-2 9a1.5 1.5 0 0 1-1.5-1.5v-2h2.5v.75a.75.75 0 0 0 1.5 0v-.75h3v.75a.75.75 0 0 0 1.5 0v-.75H23v2a1.5 1.5 0 0 1-1.5 1.5z"/>
  <path fill="url(#gobiernoAccent)" d="M13.032 2.336a1.75 1.75 0 0 0-2.064 0L3.547 7.75c-.977.712-.474 2.256.734 2.258H16V10h3v.007h.719c1.208-.002 1.71-1.546.734-2.258z"/>
  <path fill="url(#gobiernoHighlight)" d="M13.032 2.336a1.75 1.75 0 0 0-2.064 0L3.547 7.75c-.977.712-.474 2.256.734 2.258H16V10h3v.007h.719c1.208-.002 1.71-1.546.734-2.258zM12 5.26a1 1 0 1 1 0 2a1 1 0 0 1 0-2"/>
  <circle fill="#78909C" cx="12" cy="6.26" r="0.8" opacity="0.7"/>
</svg>`;

const hospedajeIconSvgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="32px" height="32px">
  <title>Hospedaje</title>
  <defs>
    <linearGradient id="hotelGradientBody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#3E2723;" />
      <stop offset="30%" style="stop-color:#5D4037;" />
      <stop offset="70%" style="stop-color:#4E342E;" />
      <stop offset="100%" style="stop-color:#2C1810;" />
    </linearGradient>
    <linearGradient id="hotelGradientRoof" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#8B0000;" />
      <stop offset="50%" style="stop-color:#B71C1C;" />
      <stop offset="100%" style="stop-color:#4A0000;" />
    </linearGradient>
    <linearGradient id="hotelGradientWindow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1565C0;" />
      <stop offset="50%" style="stop-color:#1976D2;" />
      <stop offset="100%" style="stop-color:#0A3F73;" />
    </linearGradient>
    <linearGradient id="hotelGradientDoor" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4E342E;" />
      <stop offset="100%" style="stop-color:#2C1810;" />
    </linearGradient>
    <radialGradient id="buildingHighlight" cx="50%" cy="20%" r="80%">
      <stop offset="0%" style="stop-color:#6D4C41; stop-opacity:0.4"/>
      <stop offset="100%" style="stop-color:#3E2723; stop-opacity:0.1"/>
    </radialGradient>
  </defs>
  
  <path fill="url(#hotelGradientBody)" d="m20.6 51.7l-10.7.01s-4.53-7.4-4.93-7.98c-.53-.75-1.72-.63-2.11-.57c-.67.09-.14 1.17.61 2.25s3.94 6.43 3.94 6.43v72.02h113.22l.09-71.78s3.98-6.54 4.37-7.19s.98-1.69.26-1.73c-.78-.04-1.68-.18-2.45 1.03c-.88 1.39-4.58 7.16-4.58 7.16h-10.8V40.17h-16.6s-.59-22.84-27.15-22.68c-26.55.17-26.25 22.66-26.25 22.66H20.74c0 .01-.14 11.35-.14 11.55z"/>
  
  <path fill="url(#buildingHighlight)" d="m20.6 51.7l-10.7.01s-4.53-7.4-4.93-7.98c-.53-.75-1.72-.63-2.11-.57c-.67.09-.14 1.17.61 2.25s3.94 6.43 3.94 6.43v72.02h113.22l.09-71.78s3.98-6.54 4.37-7.19s.98-1.69.26-1.73c-.78-.04-1.68-.18-2.45 1.03c-.88 1.39-4.58 7.16-4.58 7.16h-10.8V40.17h-16.6s-.59-22.84-27.15-22.68c-26.55.17-26.25 22.66-26.25 22.66H20.74c0 .01-.14 11.35-.14 11.55z"/>
  
  <path fill="url(#hotelGradientBody)" d="M9.86 56.19h10.59v44.28l-10.68.1zm13.28-11.52v44.38l81.98-.09v-44.1H85.81s1.38-22.41-21.45-22.65c-23.67-.26-21.91 22.28-21.91 22.28z"/>
  <path fill="url(#hotelGradientBody)" d="M118.25 56.56h-10.32v43.9h10.22z"/>
  
  <path fill="url(#hotelGradientRoof)" d="m3.68 43.11l17.03.21s-.07-10.03 0-10.78c.07-.74.67-.97 1.63-.97h11.52s4.21-19.72 30.67-19.58c25.08.13 29.89 19.36 29.89 19.36s11.22.15 11.96.15s1.11.59 1.11 1.41v10.26h16.78l-.8 1.93l-4.9 8.25l-109.24-.01z"/>
  
  <path fill="#6B1A00" d="M19.42 91.91s.07 5.86.12 6.83s-.11 1.89 2.06 1.91c2.13.02 84.69.04 85.76.04s2.28-.61 2.38-2.14c.1-1.52.05-6.43.05-6.43l-46.36-1.6z"/>
  
  <path fill="url(#hotelGradientWindow)" d="M46.9 37.64h8.64v10H46.9zm26.15 0h8.64v10h-8.64z M46.9 50.64h8.64v10H46.9zm26.15 0h8.64v10h-8.64z M46.9 63.64h8.64v10H46.9zm26.15 0h8.64v10h-8.64z"/>
  <path fill="url(#hotelGradientWindow)" d="M26.74 47.06h6.38v10.06h-6.38zm-.03 14.02h6.38v10.06h-6.38z M95.68 46.61h6.38v10.06h-6.38zm-.03 14.02h6.38v10.06h-6.38z"/>
  
  <path fill="#0A3F73" d="M46.4 37.14h9.64v11H46.4zm26.15 0h9.64v11h-9.64z M46.4 50.14h9.64v11H46.4zm26.15 0h9.64v11h-9.64z M46.4 63.14h9.64v11H46.4zm26.15 0h9.64v11h-9.64z" opacity="0.8"/>
  
  <path fill="url(#hotelGradientDoor)" d="m50.22 99.45l-.03 24.75H78.2l.03-25.51z"/>
  <path fill="#2C1810" d="M52.8 102.66v18.63h9.88v-18.57zm12.71.19h9.76l.25 18.44h-9.94z"/>
  <circle fill="#8D6E63" cx="55" cy="112" r="0.8" opacity="0.8"/>
  <circle fill="#8D6E63" cx="71" cy="112" r="0.8" opacity="0.8"/>
</svg>`;
// --- FIN DE SVGs ---


const poiTypes = [
  { tipo: "Todos", Icono: FaThList, svgString: null, emoji: "🗺️" }, // Opción para mostrar todos
  { tipo: "Museos", Icono: MdMuseum, svgString: museoIconSvgString, emoji: "🏛️" },
  { tipo: "Monumentos Históricos", Icono: FaLandmark, svgString: monumentoHistoricoIconSvgString, emoji: "🗿" },
  { tipo: "Naturaleza", Icono: MdPark, svgString: naturalezaIconSvgString, emoji: "🌿" },
  { tipo: "Gastronomía", Icono: MdFastfood, svgString: restauranteIconSvgString, emoji: "🍽️" },
  { tipo: "Dependencias de Gobierno", Icono: FaBuilding, svgString: gobiernoIconSvgString, emoji: "🏢" },
  { tipo: "Hospedaje", Icono: MdHotel, svgString: hospedajeIconSvgString, emoji: "🏨" },
];

export default function GoogleMaps() {
  const [location, setLocation] = useState(null); // Internal GPS
  const [externalGpsLocation, setExternalGpsLocation] = useState(null); // External GPS
  const [error, setError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [usingExternalGps, setUsingExternalGps] = useState(false); // User's choice of GPS source
  const [lugares, setLugares] = useState([]);

  const mapRef = useRef(null);
  const activeMarkerRef = useRef(null); // Marker for current location (internal or external)
  const poiMarkersRef = useRef([]); // Markers for points of interest
  const openInfoWindowRef = useRef(null);

  const [isPoiMenuOpen, setIsPoiMenuOpen] = useState(false);
  const [selectedPoiType, setSelectedPoiType] = useState(poiTypes[0]); // Default to "Todos"

<<<<<<< HEAD
  const drawRouteFromMapbox = async (coordsArray, color = '#0074D9') => {
  if (!mapRef.current || !window.google?.maps) return;

  const coords = coordsArray.map(p => p.join(',')).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.warn("No se encontraron rutas desde Mapbox.");
      return;
    }

    const route = data.routes[0].geometry.coordinates;
    const path = route.map(([lng, lat]) => ({ lat, lng }));

    const polyline = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 0.9,
      strokeWeight: 4,
    });

    polyline.setMap(mapRef.current);
  } catch (error) {
    console.error("Error al obtener la ruta desde Mapbox:", error);
  }
};

=======
  const [mapStatusMessage, setMapStatusMessage] = useState(''); // For "Esperando datos validos", etc.
  const wsRef = useRef(null); // WebSocket reference
>>>>>>> c5d28c9cd2bdbe07b174565b3f314f62f9994837

  const requestLocation = useCallback(async (showAlert = true) => {
    setError(null);
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
      if (!usingExternalGps && mapRef.current) { // Pan to new internal location if it's active
        mapRef.current.panTo({ lat: loc.lat, lng: loc.lng });
      }
    } catch (err) {
      setError(err.message);
      if (showAlert) alert(`Error obteniendo ubicación: ${err.message}`);
    }
  }, [usingExternalGps]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!wsRef.current) {
        wsRef.current = new WebSocket('ws://localhost:8080');

        wsRef.current.onopen = () => {
            console.log('GoogleMaps WebSocket connected');
            setMapStatusMessage(''); 
        };

        wsRef.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                 // console.log('GoogleMaps WS message:', message); 

                if (message.type === 'gps_status') {
                    const { status, message: statusMessage } = message.payload;
                    if (status === 'waiting_for_valid_data') {
                        setMapStatusMessage(statusMessage || "Esperando datos GPS válidos...");
                        setExternalGpsLocation(null); 
                    } else if (status === 'disconnected' || status === 'disconnected_error' || status === 'script_launch_error' || status === 'script_error') {
                        setMapStatusMessage(statusMessage || 'GPS desconectado o con error.');
                        setExternalGpsLocation(null);
                         if (usingExternalGps) {
                            // Potentially switch back to internal GPS or show message
                         }
                    }
                } else if (message.type === 'gps_update' && message.payload.lat) {
                    setMapStatusMessage(''); 
                    setExternalGpsLocation({
                        lat: message.payload.lat,
                        lng: message.payload.lng,
                        accuracy: 5, 
                        humidity: message.payload.humidity,
                        temperature: message.payload.temperature
                    });
                }
            } catch (error) {
                console.error('Error processing WebSocket message in GoogleMaps:', error);
                setMapStatusMessage('Error procesando datos del GPS.');
            }
        };

        wsRef.current.onclose = () => {
            console.log('GoogleMaps WebSocket disconnected');
            // ¿setMapStatusMessage('Conexión con el servidor GPS perdida.');
            // setExternalGpsLocation(null);
        };

        wsRef.current.onerror = (error) => {
            console.error('GoogleMaps WebSocket error:', error);
            
            setExternalGpsLocation(null);
        };
    }

    const handleGpsDataActive = () => setMapStatusMessage('');
    const handleGpsConnectionLost = () => {
        setExternalGpsLocation(null);
    };

    window.addEventListener('gps-data-active', handleGpsDataActive);
    window.addEventListener('gps-connection-lost', handleGpsConnectionLost);

    return () => {
        window.removeEventListener('gps-data-active', handleGpsDataActive);
        window.removeEventListener('gps-connection-lost', handleGpsConnectionLost);
    };
  }, [usingExternalGps]);


  const updateMarker = useCallback((lat, lng, isExternalSource = usingExternalGps, heading = 0, data = {}) => {
    if (!mapRef.current || !window.google?.maps) return;

    activeMarkerRef.current?.setMap(null); 

    const createSimpleMarkerSVG = (isExt, svgSize = 32, svgHeading = 0) => {
      const color = isExt ? '#EF4444' : '#1E40AF'; 
      const outerSize = svgSize;
      const innerSize = svgSize * 0.4;
      const center = outerSize / 2;
      const arrowLength = innerSize;

      return `
        <svg width="${outerSize}" height="${outerSize}" viewBox="0 0 ${outerSize} ${outerSize}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow${isExt ? 'External' : 'Internal'}" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.2)"/>
            </filter>
          </defs>
          <circle cx="${center}" cy="${center}" r="${center - 2}" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1" stroke-opacity="0.4" filter="url(#shadow${isExt ? 'External' : 'Internal'})"/>
          <circle cx="${center}" cy="${center}" r="${innerSize / 2}" fill="${color}" stroke="white" stroke-width="2"/>
          <g transform="translate(${center}, ${center}) rotate(${svgHeading})">
            <path d="M 0,-${innerSize/2 + 4} L ${arrowLength/3},-${innerSize/2 - 2} L 0,-${innerSize/2 + 2} L -${arrowLength/3},-${innerSize/2 - 2} Z" fill="white" stroke="${color}" stroke-width="1"/>
          </g>
        </svg>`;
    };

    const createMarkerIcon = (isExt, zoom, svgHeading = 0) => {
      const minSize = 24; 
      const maxSize = 48;
      const minZoom = 10;
      const maxZoom = 20;
      const normalizedZoom = Math.max(minZoom, Math.min(maxZoom, zoom || 15));
      const size = minSize + ((normalizedZoom - minZoom) / (maxZoom - minZoom)) * (maxSize - minSize);
      const svgString = createSimpleMarkerSVG(isExt, size, svgHeading);
      return {
        url: `data:image/svg+xml,${encodeURIComponent(svgString)}`,
        scaledSize: new window.google.maps.Size(size, size),
        anchor: new window.google.maps.Point(size / 2, size / 2),
        optimized: false 
      };
    };

    const currentZoom = mapRef.current.getZoom();
    const markerIcon = createMarkerIcon(isExternalSource, currentZoom, heading);

    const newMarker = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapRef.current,
      title: isExternalSource ? "GPS Externo" : "Mi ubicación (GPS Interno)",
      icon: markerIcon,
      zIndex: 1000 
    });
    
    let contentString = `
      <div style="color: #000; padding: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; max-width: 250px;">
        <div style="font-weight: 600; margin-bottom: 4px; color: ${isExternalSource ? '#EF4444' : '#1E40AF'};">
          ${newMarker.title}
        </div>
        <div style="color: #333; font-size: 12px;">Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</div>`;
    if (isExternalSource) {
        if (data.humidity !== null && data.humidity !== undefined) {
            contentString += `<div style="color: #333; font-size: 12px;">Humedad: ${data.humidity}%</div>`;
        }
        if (data.temperature !== null && data.temperature !== undefined) {
            contentString += `<div style="color: #333; font-size: 12px;">Temp: ${data.temperature}°C</div>`;
        }
    }
    if (data.accuracy) {
         contentString += `<div style="color: #666; font-size: 11px;">Precisión: ${data.accuracy.toFixed(1)}m</div>`;
    }
    contentString += `</div>`;


    const infoWindow = new window.google.maps.InfoWindow({ content: contentString });

    newMarker.addListener("click", () => {
      openInfoWindowRef.current?.close();
      infoWindow.open(mapRef.current, newMarker);
      openInfoWindowRef.current = infoWindow;
    });

    activeMarkerRef.current = newMarker;

  }, [usingExternalGps]);


  const toggleGpsSource = useCallback(() => {
    const newUsingExternalGps = !usingExternalGps;
    setUsingExternalGps(newUsingExternalGps);
    setMapStatusMessage(''); 
    setError('');

    if (newUsingExternalGps) {
      if (!externalGpsLocation) {
        setMapStatusMessage("Cambiado a GPS Externo. Esperando datos...");
        activeMarkerRef.current?.setMap(null); 
      } else {
        mapRef.current?.panTo({ lat: externalGpsLocation.lat, lng: externalGpsLocation.lng });
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
        if(!location) requestLocation(false);
    }

  }, [mapLoaded, location, requestLocation]); 


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
        setTimeout(()=> setMapStatusMessage(''), 3000);
      } else {
        setMapStatusMessage('');
      }
    } catch (err) {
      console.error("Error al obtener lugares:", err);
      setError("Error al cargar lugares de interés.");
      setMapStatusMessage("Error al cargar lugares.");
    }
  }, []);

  const fetchAllLugares = useCallback(async () => {
    setLugares([]);
    try {
        const querySnapshot = await getDocs(collection(db, "lugares"));
        const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setLugares(data);
        if (data.length === 0) {
            setMapStatusMessage(`No se encontraron lugares.`);
            setTimeout(() => setMapStatusMessage(''), 3000);
        } else {
            setMapStatusMessage('');
        }
    } catch (err) {
        console.error("Error al obtener todos los lugares:", err);
        setError("Error al cargar todos los lugares de interés.");
        setMapStatusMessage("Error al cargar lugares.");
    }
  }, []);


  // Efecto para inicializar el mapa y actualizar el marcador principal
  useEffect(() => {
    if (!mapLoaded || !window.google?.maps) return;

    let currentDisplayLocation = null;
    let isExternalSourceForMarker = false;
    let markerData = {};

    if (usingExternalGps) {
        if (externalGpsLocation) {
            currentDisplayLocation = externalGpsLocation;
            isExternalSourceForMarker = true;
            markerData = { humidity: externalGpsLocation.humidity, temperature: externalGpsLocation.temperature, accuracy: externalGpsLocation.accuracy };
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
            center: { lat: currentDisplayLocation.lat, lng: currentDisplayLocation.lng },
            zoom: 15,
            mapTypeId: "roadmap",
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            gestureHandling: "greedy",
            disableDoubleClickZoom: true,
            }
        );
        mapRef.current.addListener('zoom_changed', () => {
            if (activeMarkerRef.current && activeMarkerRef.current.getMap()) { 
                 // const pos = activeMarkerRef.current.getPosition();
                 // const newZoom = mapRef.current.getZoom();
                 // const currentIsExternal = activeMarkerRef.current.getTitle().includes("Externo"); 
                 // const createSimpleMarkerSVG = (isExt, svgSize = 32, svgHeading = 0) => {/*...*/}; 
                 // const createMarkerIcon = (isExt, zoom, svgHeading = 0) => {/*...*/}; 
                 // activeMarkerRef.current.setIcon(createMarkerIcon(currentIsExternal, newZoom, 0)); 
            }
        });


    } else if (mapRef.current && currentDisplayLocation) { 
        if (mapRef.current.getCenter().lat() !== currentDisplayLocation.lat || mapRef.current.getCenter().lng() !== currentDisplayLocation.lng) {
            mapRef.current.panTo({ lat: currentDisplayLocation.lat, lng: currentDisplayLocation.lng });
        }
    }

    if (currentDisplayLocation) {
        updateMarker(currentDisplayLocation.lat, currentDisplayLocation.lng, isExternalSourceForMarker, 0, markerData);
    } else {
        activeMarkerRef.current?.setMap(null); 
    }

  }, [location, externalGpsLocation, mapLoaded, usingExternalGps, updateMarker]);


  // Efecto para dibujar marcadores de Puntos de Interés (POIs)
  useEffect(() => {
    if (!mapLoaded || !window.google?.maps || !mapRef.current) return;

    poiMarkersRef.current.forEach((m) => m.setMap(null));
    poiMarkersRef.current = [];
    if (openInfoWindowRef.current) { 
        if (activeMarkerRef.current && openInfoWindowRef.current.anchor === activeMarkerRef.current) {
          // No cerrar
        } else {
             openInfoWindowRef.current.close();
             openInfoWindowRef.current = null;
        }
    }


    lugares.forEach((lugar) => {
      const { lat, lng } = lugar.ubicacion || {};
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

      const poiDefinition = poiTypes.find(pt => pt.tipo === lugar.tipo);
      let iconOptions = {
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 32), 
      };

      if (poiDefinition) {
        if (poiDefinition.svgString) {
          iconOptions = {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(poiDefinition.svgString)}`,
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16),
          };
        } else if (poiDefinition.emoji && poiDefinition.tipo !== "Todos") { // No usar emoji para "Todos" si no tiene SVG
          const svgEmoji = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20">${poiDefinition.emoji}</text></svg>`;
          iconOptions = {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgEmoji)}`,
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16),
          };
        }
      }

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current,
        title: lugar.nombre,
        icon: iconOptions,
      });

      const id = `carrusel-${lugar.id || Math.random().toString(36).substr(2, 9)}`;
      const imagenes = lugar.imagenes && lugar.imagenes.length > 0 ? lugar.imagenes : ['/icons/placeholder.png']; 

      const svgArrowLeft = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M257.5 445.1l-22.2 22.2c-9.4 9.4-24.6 9.4-33.9 0L7 273c-9.4-9.4-9.4-24.6 0-33.9L201.4 44.7c9.4-9.4 24.6-9.4 33.9 0l22.2 22.2c9.5 9.5 9.3 25-.4 34.3L136.6 216H424c13.3 0 24 10.7 24 24v32c0 13.3-10.7 24-24 24H136.6l120.5 114.8c9.8 9.3 10 24.8.4 34.3z"></path></svg>`;
      const svgArrowRight = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M190.5 66.9l22.2-22.2c9.4-9.4 24.6-9.4 33.9 0L416 239c9.4 9.4 9.4 24.6 0 33.9L246.6 467.3c-9.4-9.4-24.6-9.4-33.9 0l-22.2-22.2c-9.5-9.5-9.3-25 .4-34.3L311.4 296H24c-13.3 0-24-10.7-24-24v-32c0-13.3 10.7-24 24-24h287.4L190.9 101.2c-9.8-9.3-10-24.8-.4-34.3z"></path></svg>`;
      const svgClose = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>`;

      const infoWindowContent = `
      <style>
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
        .info-window-image-gallery { margin-bottom: 16px; position: relative; }
        .info-window-image-wrapper { width: 100%; height: 180px; overflow: hidden; border-radius: 12px; background: linear-gradient(45deg, #f0f2f5, #e2e8f0); margin-bottom: 12px; position: relative; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
        .info-window-image { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .info-window-image:hover { transform: scale(1.02); }
        .info-window-gallery-controls { display: flex; justify-content: center; gap: 16px; align-items: center; }
        .info-window-gallery-button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 0; width: 48px; height: 48px; border-radius: 12px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); position: relative; overflow: hidden; touch-action: manipulation; }
        .info-window-gallery-button::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); transition: left 0.5s; }
        .info-window-gallery-button:hover::before { left: 100%; }
        .info-window-gallery-button svg { width: 22px; height: 22px; transition: transform 0.2s ease; }
        .info-window-gallery-button:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4); }
        .info-window-gallery-button:hover svg { transform: scale(1.1); }
        .info-window-gallery-button:disabled { background: linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%); cursor: not-allowed; transform: none; box-shadow: none; }
        .info-window-gallery-button:disabled::before { display: none; }
        .info-window-description { margin: 0 0 16px; font-size: 0.9rem; line-height: 1.6; color: #4a5568; background: #f7fafc; padding: 14px 16px; border-radius: 10px; border-left: 4px solid #667eea; position: relative; }
        .info-window-details { font-size: 0.85rem; color: #2d3748; }
        .info-window-detail-item { display: flex; align-items: flex-start; margin-bottom: 10px; padding: 12px 14px; background: #f8fafc; border-radius: 8px; transition: all 0.2s ease; border: 1px solid #e2e8f0; }
        .info-window-detail-item:hover { background: #edf2f7; transform: translateX(2px); }
        .info-window-detail-item:last-child { margin-bottom: 0; }
        .info-window-detail-label { font-weight: 600; color: #667eea; margin-right: 8px; min-width: 50px; flex-shrink: 0; }
        .info-window-detail-value { color: #4a5568; flex: 1; word-wrap: break-word; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .info-window-custom-container { animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        @media (max-width: 480px) { .info-window-custom-container { width: 100%; min-width: 260px; max-width: 280px; } .info-window-header { padding: 12px 16px; } .info-window-custom-title { font-size: 1rem; } .info-window-body { padding: 16px; max-height: 50vh; } .info-window-image-wrapper { height: 150px; } .info-window-gallery-button { width: 44px; height: 44px; } .info-window-gallery-button svg { width: 20px; height: 20px; } .info-window-description { font-size: 0.85rem; padding: 12px 14px; } .info-window-details { font-size: 0.8rem; } .info-window-detail-item { padding: 10px 12px; flex-direction: column; align-items: flex-start; } .info-window-detail-label { margin-bottom: 4px; margin-right: 0; } }
        @media (max-width: 320px) { .info-window-custom-container { max-width: 260px; } .info-window-gallery-controls { gap: 12px; } }
        @media (hover: none) and (pointer: coarse) { .info-window-gallery-button:hover { transform: none; } .info-window-detail-item:hover { transform: none; } .info-window-image:hover { transform: none; } }
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
          <p class="info-window-description">${lugar.descripcion || "No hay descripción disponible."}</p>
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

      marker.addListener("click", () => {
        openInfoWindowRef.current?.close(); 
        infoWindow.open(mapRef.current, marker);
        openInfoWindowRef.current = infoWindow;
      });

      window.google.maps.event.addListener(infoWindow, 'domready', () => {
        const closeButton = document.getElementById(`${id}-custom-close-btn`);
        if (closeButton) {
          closeButton.onclick = () => infoWindow.close();
        }

        if (imagenes.length > 1) {
          const prevButton = document.getElementById(`${id}-prev`);
          const nextButton = document.getElementById(`${id}-next`);
          const imgElement = document.getElementById(`${id}-img`);
          let currentImageIndex = 0;

          const updateGallery = () => {
            if(imgElement) {
                imgElement.style.opacity = '0.5';
                setTimeout(() => {
                    imgElement.src = imagenes[currentImageIndex];
                    imgElement.style.opacity = '1';
                }, 150);
            }
            if(prevButton) prevButton.disabled = currentImageIndex === 0;
            if(nextButton) nextButton.disabled = currentImageIndex === imagenes.length - 1;
          };
          
          if(prevButton) prevButton.onclick = () => { if (currentImageIndex > 0) { currentImageIndex--; updateGallery(); } };
          if(nextButton) nextButton.onclick = () => { if (currentImageIndex < imagenes.length - 1) { currentImageIndex++; updateGallery(); } };
          
          if (imgElement) {
              let touchStartX = 0;
              imgElement.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
              imgElement.addEventListener('touchend', (e) => {
                  const touchEndX = e.changedTouches[0].screenX;
                  const swipeThreshold = 50;
                  if (touchStartX - touchEndX > swipeThreshold && currentImageIndex < imagenes.length - 1) {
                      currentImageIndex++; updateGallery();
                  } else if (touchEndX - touchStartX > swipeThreshold && currentImageIndex > 0) {
                      currentImageIndex--; updateGallery();
                  }
              });
          }
          updateGallery();
        }
      });
      poiMarkersRef.current.push(marker);
    });
<<<<<<< HEAD
  }, [
    location,
    externalGpsLocation,
    mapLoaded,
    usingExternalGps,
    lugares,
    
    updateMarker
  ]);
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

useEffect(() => {
  if (!mapLoaded) return;

  drawRouteFromMapbox(rutatecnologico, '#0074D9'); // Azul
  drawRouteFromMapbox(rutacerril, '#2ECC40');       // Verde
  drawRouteFromMapbox(geo, '#FF4136');              // Rojo
  drawRouteFromMapbox(nieves, '#B10DC9');           // Morado
}, [mapLoaded]);
=======
  }, [mapLoaded, lugares]);
>>>>>>> c5d28c9cd2bdbe07b174565b3f314f62f9994837


  const togglePoiMenu = useCallback(() => setIsPoiMenuOpen(prev => !prev), []);
  
  const handlePoiTypeSelect = useCallback((poi) => {
    setSelectedPoiType(poi);
    if (poi.tipo === "Todos") {
        fetchAllLugares();
    } else {
        fetchLugaresPorTipo(poi.tipo);
    }
    setIsPoiMenuOpen(false);
  }, [fetchLugaresPorTipo, fetchAllLugares]);

  // Cargar todos los lugares al inicio si "Todos" es la selección por defecto
  useEffect(() => {
    if (selectedPoiType && selectedPoiType.tipo === "Todos" && mapLoaded) {
        fetchAllLugares();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]); // Solo ejecutar cuando el mapa está cargado y "Todos" es la opción inicial


  return (
    <div className={styles.mapRoot}>
      <Sidebar />
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
          className={`${styles.mapButton} ${styles.gpsToggle} ${usingExternalGps ? styles.externalActive : ''}`}
          title={usingExternalGps ? "Usando GPS Externo (click para cambiar a Interno)" : "Usando GPS Interno (click para cambiar a Externo)"}
        >
          {usingExternalGps ? <MdGpsFixed size={24} /> : <MdGpsOff size={24} />}
        </button>
      </div>

      <div className={styles.mapContainer}>
        {mapStatusMessage && (
          <div className={styles.mapOverlayMessage}>
            {mapStatusMessage}
          </div>
        )}
        {!mapLoaded && !mapStatusMessage && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            Cargando mapa...
          </div>
        )}
        <div 
            id="map" 
            className={styles.mapElement} 
            style={{ visibility: mapLoaded ? 'visible' : 'hidden' }}
        >
        </div>
      </div>

      <div className={styles.poiFabContainer}>
        {isPoiMenuOpen && (
          <div className={styles.poiMenu}>
            {poiTypes.map((poi, index) => (
              <button
                key={poi.tipo}
                onClick={() => handlePoiTypeSelect(poi)}
                className={`${styles.poiMenuItem} ${selectedPoiType && selectedPoiType.tipo === poi.tipo ? styles.poiMenuItemActive : ''}`}
                title={poi.tipo}
                style={{ animationDelay: `${index * 0.08}s` }} 
              >
                <poi.Icono size={22} />
                <span className={styles.poiMenuItemText}>{poi.tipo === "Todos" ? "Todos los lugares" : poi.tipo}</span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={togglePoiMenu}
          className={styles.poiFab}
          title={selectedPoiType ? `Mostrando: ${selectedPoiType.tipo === "Todos" ? "Todos los lugares" : selectedPoiType.tipo}` : "Seleccionar tipo de lugar"}
          aria-expanded={isPoiMenuOpen}
          aria-haspopup="true"
        >
          {selectedPoiType ? <selectedPoiType.Icono size={28} /> : <FaMapMarkerAlt size={28} />}
        </button>
      </div>
    </div>
  );
}