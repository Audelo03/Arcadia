// src/Pages/inicioSesion.jsx
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail, 
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import styles from "../Estilos/inicioSesion.module.css";
import logo from "../Images/logo.jpeg";
import logopng from "../Images/logopng.png";
import logoGoogle from "../Images/g-logo.png";
import { db } from "./firebase-config";
import ConfirmationDialog from "../Components/ConfirmationDialog";
import ErrorBanner from "../Components/errorbanner";
import SuccessBanner from "../Components/SuccessBanner";

import { IoEye } from "react-icons/io5";
import { IoEyeOffSharp } from "react-icons/io5";

const auth = getAuth();
const provider = new GoogleAuthProvider();

export default function InicioSesion() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [successKey, setSuccessKey] = useState(0);

  const [viewMode, setViewMode] = useState("login"); // 'login' or 'forgotPassword'
  const [resetEmail, setResetEmail] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    let errorTimer;
    if (errorMessage) {
      errorTimer = setTimeout(() => setErrorMessage(""), 3000); // Aumentado a 3s para mejor visibilidad
    }
    return () => clearTimeout(errorTimer);
  }, [errorMessage, errorKey]);

  useEffect(() => {
    let successTimer;
    if (successMessage) {
      successTimer = setTimeout(() => setSuccessMessage(""), 3000); // Aumentado a 3s
    }
    return () => clearTimeout(successTimer);
  }, [successMessage, successKey]);

  const showError = (message) => {
    setErrorMessage(message);
    setErrorKey((prevKey) => prevKey + 1);
    setSuccessMessage("");
  };

  const showSuccess = (message, redirectPath, delay = 2000) => {
    setSuccessMessage(message);
    setSuccessKey((prevKey) => prevKey + 1);
    setErrorMessage("");
    if (redirectPath) {
      setTimeout(() => {
        navigate(redirectPath);
      }, delay);
    }
  };

  const handleInputChange = useCallback((e) => {
    const { id, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  }, []);

  const handleResetEmailChange = useCallback((e) => {
    setResetEmail(e.target.value);
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const { email, password } = formData;

      signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
          const user = userCredential.user;
          const userRef = doc(db, "usuarios", user.uid);
          const docSnap = await getDoc(userRef);
          let displayName = user.email;

          if (docSnap.exists()) {
            const userData = docSnap.data();
            displayName = userData.firstName || user.email;
          } else {
            await setDoc(userRef, {
              email: user.email,
              firstName: user.displayName ? user.displayName.split(" ")[0] : "",
              lastName: user.displayName ? user.displayName.split(" ")[1] : "",
              gender: "no especificado",
              createdAt: new Date(),
            });
            displayName = user.displayName ? user.displayName.split(" ")[0] : user.email;
          }
          showSuccess(`¡Bienvenido, ${displayName}!`, "/mapa");
        })
        .catch((error) => {
          console.error("Error al iniciar sesión:", error.code, error.message);
          let friendlyMessage = "Error al iniciar sesión. Inténtalo de nuevo.";
          switch (error.code) {
            case "auth/user-not-found":
            case "auth/invalid-user-token":
              friendlyMessage = "Usuario no encontrado. Verifica tu correo.";
              break;
            case "auth/wrong-password":
              friendlyMessage = "Contraseña incorrecta. Inténtalo de nuevo.";
              break;
            case "auth/invalid-email":
              friendlyMessage = "El correo electrónico no es válido.";
              break;
            case "auth/too-many-requests":
              friendlyMessage = "Demasiados intentos fallidos. Intenta más tarde.";
              break;
            case "auth/invalid-credential":
              friendlyMessage = "Credenciales inválidas. Verifica tu correo y contraseña.";
              break;
            default:
              friendlyMessage = "Error al iniciar sesión. Por favor, inténtalo de nuevo.";
          }
          showError(friendlyMessage);
        });
    },
    [formData, navigate] // showSuccess removido de aquí, showError también.
  );

  const handleGoogleSignIn = useCallback(() => {
    signInWithPopup(auth, provider)
      .then(async (result) => {
        const user = result.user;
        const userRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userRef);
        let displayName = user.displayName || user.email;

        if (!docSnap.exists()) {
          await setDoc(userRef, {
            email: user.email,
            firstName: user.displayName ? user.displayName.split(" ")[0] : "",
            lastName: user.displayName ? user.displayName.split(" ")[1] : "",
            gender: "no especificado",
            createdAt: new Date(),
          });
          displayName = user.displayName ? user.displayName.split(" ")[0] : user.email;
        } else {
          const userData = docSnap.data();
          displayName = userData.firstName || user.displayName || user.email;
        }
        showSuccess(`¡Bienvenido, ${displayName}!`, "/mapa");
      })
      .catch((error) => {
        console.error("Error al iniciar sesión con Google:", error.code, error.message);
        let friendlyMessage = "Error con Google. Inténtalo de nuevo.";
        if (error.code === "auth/popup-closed-by-user") {
          friendlyMessage = "Cancelaste el inicio de sesión con Google.";
        } else if (error.code === "auth/cancelled-popup-request") {
          friendlyMessage = "Se canceló la solicitud de inicio con Google.";
        } else if (error.code === "auth/account-exists-with-different-credential") {
          friendlyMessage = "Ya existe una cuenta con este correo, pero con un método de inicio de sesión diferente.";
        }
        showError(friendlyMessage);
      });
  }, [navigate]); // showSuccess y showError removidos

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prevState) => !prevState);
  }, []);

  const handleContinueWithoutLogin = useCallback(() => {
    setShowConfirmation(true);
  }, []);

  const handleConfirmContinue = useCallback(() => {
    setShowConfirmation(false);
    signOut(auth);
    navigate("/mapa");
  }, [navigate]);

  const handleCancelContinue = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  const handleForgotPasswordClick = () => {
    setViewMode("forgotPassword");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleBackToLoginClick = () => {
    setViewMode("login");
    setResetEmail("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSendResetEmail = useCallback((e) => {
    e.preventDefault();
    if (!resetEmail) {
      showError("Por favor, ingresa tu correo electrónico.");
      return;
    }
    sendPasswordResetEmail(auth, resetEmail)
      .then(() => {
        showSuccess("Correo de restablecimiento enviado. Revisa tu bandeja de entrada (y spam).", null, 5000);
        setViewMode("login");
        // setResetEmail("");
      })
      .catch((error) => {
        console.error("Error al enviar correo de restablecimiento:", error.code, error.message);
        if (error.code === "auth/user-not-found") {
          showError("No se encontró un usuario con ese correo electrónico.");
        } else if (error.code === "auth/invalid-email") {
          showError("El formato del correo electrónico no es válido.");
        } else {
          showError("Error al enviar el correo. Inténtalo de nuevo.");
        }
      });
  }, [resetEmail, auth]); // showError y showSuccess removidos

  return (
    <div className={styles["login-container"]}>
      {errorMessage && <ErrorBanner key={`err-${errorKey}`} message={errorMessage} />}
      {successMessage && <SuccessBanner key={`succ-${successKey}`} message={successMessage} />}
      <div className={styles["login-wrapper"]}>
        <div className={styles["login-image-panel"]}>
          <img
            src={logo}
            alt="Imagen de login"
            className={styles["login-image"]}
            loading="lazy"
          />
        </div>
        <div className={styles["login-form-panel"]}>
          {viewMode === "login" && (
            <>
              <div>
                <h2 className={styles["login-title-container"]}>
                  <img
                    src={logopng}
                    alt="Logo"
                    className={styles["login-logo"]}
                    loading="lazy"
                  />
                  <span>Iniciar sesión</span>
                </h2>
              </div>
              <p>Ingresa tus credenciales para acceder.</p>
              <form onSubmit={handleSubmit}>
                <div className={styles["form-group"]}>
                  <label htmlFor="email">Correo Electrónico</label>
                  <input
                    type="email"
                    id="email"
                    placeholder="ej. juan.perez@gmail.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label htmlFor="password">Contraseña</label>
                  <div className={styles["password-input"]}>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder="Ingresa tu contraseña"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className={styles["toggle-password"]}
                    >
                      {showPassword ? <IoEye size={24} /> : <IoEyeOffSharp size={24} />}
                    </button>
                  </div>
                </div>
                <div className={styles["forgot-password-link"]}>
                  <button type="button" onClick={handleForgotPasswordClick} className={styles["link-button"]}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <button type="submit" className={styles["login-button"]}>
                  Iniciar sesión
                </button>
                <div className={styles["login-link"]}>
                  <p>
                    ¿No tienes cuenta? <Link to="/signup">Regístrate</Link>
                  </p>
                </div>
              </form>
              <button
                type="button"
                className={styles["google-button"]}
                onClick={handleGoogleSignIn}
              >
                <img
                  src={logoGoogle}
                  alt="Google"
                  className={styles["google-icon"]}
                />
                Continuar con Google
              </button>
              <button
                onClick={handleContinueWithoutLogin}
                className={styles["continue-button"]}
              >
                Continuar sin iniciar sesión
              </button>
            </>
          )}

          {viewMode === "forgotPassword" && (
            <>
              <div>
                <h2 className={styles["login-title-container"]}>
                  <img
                    src={logopng}
                    alt="Logo"
                    className={styles["login-logo"]}
                    loading="lazy"
                  />
                  <span>Restablecer Contraseña</span>
                </h2>
              </div>
              <p>Ingresa tu correo electrónico para recibir un enlace de restablecimiento.</p>
              <form onSubmit={handleSendResetEmail}>
                <div className={styles["form-group"]}>
                  <label htmlFor="resetEmail">Correo Electrónico</label>
                  <input
                    type="email"
                    id="resetEmail"
                    placeholder="ej. juan.perez@gmail.com"
                    value={resetEmail}
                    onChange={handleResetEmailChange}
                    required
                  />
                </div>
                <button type="submit" className={styles["login-button"]}>
                  Enviar Correo de Restablecimiento
                </button>
              </form>
              <div className={styles["login-link"]} style={{ marginTop: '15px' }}>
                <button type="button" onClick={handleBackToLoginClick} className={styles["link-button"]}>
                  Volver a Iniciar Sesión
                </button>
              </div>
            </>
          )}

          <ConfirmationDialog
            isOpen={showConfirmation}
            message="¿Estás seguro de que deseas continuar sin iniciar sesión? Perderás el acceso a funciones personalizadas."
            onConfirm={handleConfirmContinue}
            onCancel={handleCancelContinue}
          />
        </div>
      </div>
    </div>
  );
}