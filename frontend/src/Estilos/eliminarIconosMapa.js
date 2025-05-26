// src/Estilos/eliminarIconosMapa.js
const eliminarIconosMapa = [
    {
        // Oculta todos los puntos de interés (POIs) como restaurantes, tiendas, etc.
        featureType: "poi",
        stylers: [{ visibility: "off" }],
    }
];

export default eliminarIconosMapa;
