import React, { useState, useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import "./App.css";
import './Estilos/global.css';
import GoogleMaps from "./Pages/GoogleMaps";
import Registro from "./Pages/registro";
import InicioSesion from "./Pages/inicioSesion";
import SplashScreen from "./Components/SplashScreen";
import CuentaDeUsuario from "./Pages/cuentaDeUsuario";
import './Estilos/SplashScreen.module.css'; 

const SPLASH_DISPLAY_TIME = 2000;
const FADE_OUT_DURATION = 1500;

const App = () => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true); 
    }, SPLASH_DISPLAY_TIME);

    const removeSplashTimer = setTimeout(() => {
      setShowSplash(false); 
    }, SPLASH_DISPLAY_TIME + FADE_OUT_DURATION);

  
    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(removeSplashTimer);
    };
  }, []); 

  if (showSplash) {
    return (
      <div className={`splashContainer ${isFadingOut ? 'splashContainerHidden' : ''}`}>
        <SplashScreen />
      </div>
    );
  }
  return (
    <div className="Todo">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<InicioSesion />} />
          <Route path="/login" element={<InicioSesion />} />
          <Route path="/signup" element={<Registro />} />
          <Route path="/mapa" element={<GoogleMaps />} />
          <Route path="/account" element={<CuentaDeUsuario />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;