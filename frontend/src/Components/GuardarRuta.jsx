import React, { useState, useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../Pages/firebase-config";
import { getAuth } from "firebase/auth";
import "./GuardarRuta.css";

export default function GuardarRuta({
  isOpen,
  onClose,
  lugarCoordenadas,
  nombreLugar,
}) {
  const [nombreRuta, setNombreRuta] = useState("");
  const [descripcion, setDescripcion] = useState("");

  useEffect(() => {
    if (nombreLugar) {
      setNombreRuta(nombreLugar); // Asignar nombre del lugar por defecto como editable
    }
  }, [nombreLugar]);

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
        }
      );
    });
  };

  const handleGuardar = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      window.location.href = "/signup";
      return;
    }

    if (!lugarCoordenadas) {
      alert("No se proporcionaron coordenadas del destino.");
      return;
    }

    try {
      const origen = await getCurrentLocation(); // Obtiene la ubicación actual del usuario
      const destino = lugarCoordenadas; // Se espera que sea un objeto { lat, lng }
      const rutaCoords = [origen, destino];

      await addDoc(collection(db, "rutas"), {
        userId: user.uid,
        nombreRuta,
        descripcion,
        coordenadas: rutaCoords,
        createdAt: new Date(),
      });

      alert("¡Ruta guardada exitosamente!");
      onClose(); // Cierra el modal
    } catch (error) {
      console.error("Error al guardar la ruta:", error);
      alert("Hubo un error al guardar la ruta. Inténtalo de nuevo.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Guardar Ruta Personalizada</h2>
        <input
          type="text"
          placeholder="Nombre de la ruta"
          value={nombreRuta}
          onChange={(e) => setNombreRuta(e.target.value)}
        />
        <textarea
          placeholder="Descripción o nota de la ruta"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        ></textarea>
        <div className="modal-buttons">
          <button onClick={handleGuardar}>Guardar</button>
          <button onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
