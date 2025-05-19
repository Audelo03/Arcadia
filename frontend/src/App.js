import React, { useState, useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import "./App.css";
import './Estilos/global.css';
import GoogleMaps from "./Pages/GoogleMaps";
import Registro from "./Pages/registro";
import InicioSesion from "./Pages/inicioSesion";
import SplashScreen from "./Components/SplashScreen";
import './Estilos/SplashScreen.module.css'; // Asegúrate de importar el archivo CSS correcto

// Duraciones (en milisegundos)
const SPLASH_DISPLAY_TIME = 2000;
const FADE_OUT_DURATION = 1500;

const App = () => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showSplash, setShowSplash] = useState(true); // Controla la visibilidad del splash screen

  useEffect(() => {
    // Este efecto se ejecuta solo una vez después del montaje inicial del componente App
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true); // Inicia la animación de desvanecimiento
    }, SPLASH_DISPLAY_TIME);

    const removeSplashTimer = setTimeout(() => {
      setShowSplash(false); // Oculta el SplashScreen y permite que se muestre la app
    }, SPLASH_DISPLAY_TIME + FADE_OUT_DURATION);

    // Limpieza de los temporizadores si el componente se desmonta prematuramente
    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(removeSplashTimer);
    };
  }, []); // El array de dependencias vacío asegura que se ejecute solo una vez

  // Si showSplash es true, muestra el SplashScreen
  if (showSplash) {
    return (
      <div className={`splashContainer ${isFadingOut ? 'splashContainerHidden' : ''}`}>
        <SplashScreen />
      </div>
    );
  }

  // Una vez que showSplash es false, muestra la aplicación principal con las rutas
  return (
    <div className="Todo">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<InicioSesion />} />
          <Route path="/login" element={<InicioSesion />} />
          <Route path="/signup" element={<Registro />} />
          <Route path="/mapa" element={<GoogleMaps />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;