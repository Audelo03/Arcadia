import React, { useState } from "react";
import {
  FaBars,
  FaLandmark,
  FaMonument,
  FaTree,
  FaUtensils,
  FaBuilding,
  FaBed,
} from "react-icons/fa";
import { MdLocationCity } from "react-icons/md";

export default function CategoriaMenu({ onCategoriaSeleccionada }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const categorias = [
    { nombre: "Museos", icono: <FaLandmark /> },
    { nombre: "Monumentos Históricos", icono: <FaMonument /> },
    { nombre: "Naturaleza", icono: <FaTree /> },
    { nombre: "Gastronomía", icono: <FaUtensils /> },
    { nombre: "Hospedaje", icono: <FaBed /> },
    { nombre: "Dependencias de Gobierno", icono: <MdLocationCity /> },
  ];

  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
      }}
    >
      {/* Botón FAB */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        style={{
          background:
            "linear-gradient(135deg,rgb(5, 31, 148) 0%,rgb(3, 0, 157) 100%)",
          color: "white",
          borderRadius: "50%",
          width: "60px",
          height: "60px",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
          fontSize: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FaBars />
      </button>

      {/* Menú vertical con íconos */}
      {isMenuOpen && (
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            alignItems: "flex-end",
          }}
        >
          {categorias.map((cat) => (
            <button
              key={cat.nombre}
              onClick={() => {
                onCategoriaSeleccionada(cat.nombre);
                setIsMenuOpen(false);
              }}
              style={{
                backgroundColor: "#2c3e50",
                color: "white",
                borderRadius: "50%",
                width: "50px",
                height: "50px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                transition:
                  "transform 0.2s, background-color 0.2s, box-shadow 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.backgroundColor = "#0056b3"; // Azul rey intenso
                e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.4)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.backgroundColor = "#2c3e50"; // Vuelve al original
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
              }}
              title={cat.nombre}
            >
              {cat.icono}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
