//Arcadia\frontend\src\Components\CustomModal.jsx
import React from "react";
import styles from "../Estilos/CustomModal.module.css";

export default function CustomModal({
  isVisible,
  title,
  message,
  distancia = null,
  tiempoEstimado = null,
  onClose,
  type = "info",
}) {
  if (!isVisible) return null;

  const colors = {
    info: "#4A90E2",
    warning: "#F5A623",
    error: "#D0021B",
    success: "#27AE60",
  };

  const currentColor = colors[type] || colors.info;

  return (
    <div className={styles.modalOverlay}>
      <div
        className={styles.modalContent}
        style={{ borderColor: currentColor }}
      >
        <h2 style={{ color: currentColor }}>{title || "Notificación"}</h2>
        <p>{message || "Sin mensaje."}</p>

        {/* Mostrar distancia si existe */}
        {distancia !== null && (
          <p>
            <strong>Distancia:</strong> {Math.round(distancia)} kilómetros
          </p>
        )}

        {/* Mostrar tiempo estimado si existe */}
        {tiempoEstimado !== null && (
          <p>
            <strong>Tiempo estimado:</strong> {tiempoEstimado} min
          </p>
        )}

        <button onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
