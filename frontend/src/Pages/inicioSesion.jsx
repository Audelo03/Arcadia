import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../Estilos/inicioSesion.module.css';
import logo from '../Images/logo.jpeg';
import ConfirmationDialog from '../Components/ConfirmationDialog'; 
import logoGoogle from '../Images/g-logo.png';
export default function InicioSesion() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [id]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };
  
  const handleContinueWithoutLogin = () => {
    setShowConfirmation(true);
  };

  const handleConfirmContinue = () => {
    setShowConfirmation(false); // Oculta el diálogo
    navigate('/mapa'); // Navega al mapa
  };
  const handleCancelContinue = () => {
    setShowConfirmation(false); // Oculta el diálogo
  };

  return (
    <div className={styles['login-container']}>
     
      
      <div className={styles['login-wrapper']}>
        <div className={styles['login-image-panel']}>
          <img src={logo} alt="Imagen de login" className={styles['login-image']} />
        </div>

        <div className={styles['login-form-panel']}>
          <h2>Iniciar sesión</h2>
          <p>Ingresa tus credenciales para acceder.</p>

          <form onSubmit={handleSubmit}>
            <div className={styles['form-group']}>
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

            <div className={styles['form-group']}>
              <label htmlFor="password">Contraseña</label>
              <div className={styles['password-input']}>
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
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles['toggle-password']}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <button type="submit" className={styles['login-button']}>
              Iniciar sesión
            </button>

            <div className={styles['login-link']}>
              <p>¿No tienes cuenta? <a href="/signup">Regístrate</a></p>
            </div>
          </form>
           <button type="button" className={styles['google-button']}>
                        <img src={logoGoogle} alt="Google" className={styles['google-icon']} />
                        Continuar con Google
                      </button>

          <button 
            onClick={handleContinueWithoutLogin} 
            className={styles['continue-button']}
          >
            Continuar sin iniciar sesión

          </button>
          <ConfirmationDialog
        isOpen={showConfirmation}
        message="Se perderán funcionalidades, ¿seguro?"
        onConfirm={handleConfirmContinue}
        onCancel={handleCancelContinue}
      />
        </div>
      </div>
    </div>
  );
}