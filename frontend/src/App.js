//Arcadia\frontend\src\App.js
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

import { getAuth, onAuthStateChanged } from "firebase/auth";
const auth = getAuth();

const SPLASH_DISPLAY_TIME = 2000;
const FADE_OUT_DURATION = 1500;

const App = () => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const fadeOutTimer = setTimeout(() => setIsFadingOut(true), SPLASH_DISPLAY_TIME);
    const removeSplashTimer = setTimeout(() => setShowSplash(false), SPLASH_DISPLAY_TIME + FADE_OUT_DURATION);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsUserLoggedIn(!!user);
      setAuthChecked(true);
    });
    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(removeSplashTimer);
      unsubscribe();
    };
  }, []);

  if (showSplash) {
    return (
      <div className={`splashContainer ${isFadingOut ? 'splashContainerHidden' : ''}`}>
        <SplashScreen />
      </div>
    );
  }

  if (!authChecked) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2em' }}>Verificando sesión...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isUserLoggedIn ? <Navigate to="/mapa" replace /> : <InicioSesion />} />
        <Route path="/login" element={<InicioSesion />} />
        <Route path="/signup" element={<Registro />} />
        <Route path="/mapa" element={<GoogleMaps />} /> {/* GoogleMaps maneja su Sidebar */}
        <Route path="/account" element={!isUserLoggedIn ? <Navigate to="/login" replace /> : <CuentaDeUsuario />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
