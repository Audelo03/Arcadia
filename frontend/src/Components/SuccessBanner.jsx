// src/Components/ErrorBanner.js
import React from 'react';
import styles from '../Estilos/successBanner.module.css'; // Asegúrate de que la ruta sea correcta
const WarningIcon = () => (

    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width="1.5em"
      height="1.5em"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M288 117.333c0-41.237-33.429-74.666-74.667-74.666l-4.096.11c-39.332 2.127-70.57 34.694-70.57 74.556c0 41.238 33.429 74.667 74.666 74.667l4.097-.111c39.332-2.126 70.57-34.693 70.57-74.556m-32 256c0 19.205 4.614 37.332 12.794 53.334H64v-76.8c0-62.033 47.668-112.614 107.383-115.104l4.617-.096h74.667c29.474 0 56.29 11.711 76.288 30.855C285.219 283.501 256 325.005 256 373.333m117.333-96c-53.019 0-96 42.981-96 96s42.981 96 96 96c53.02 0 96-42.981 96-96s-42.98-96-96-96m62.763 62.763l-84.095 84.094l-41.428-41.428l18.856-18.856l22.572 22.572l65.239-65.238z"
        clipRule="evenodd"
      ></path>
    </svg>
);

const ErrorBanner = ({ message }) => {
  if (!message) {
    return null; 
  }

  return (
    <div className={styles.successBanner}>
      <WarningIcon />
      <span className={styles.message}>{message}</span>
    </div>
  );
};

export default ErrorBanner;