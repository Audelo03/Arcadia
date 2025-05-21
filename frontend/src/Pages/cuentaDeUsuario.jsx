import React, { useState, useEffect } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import styles from '../Estilos/cuentaDeUsuario.module.css';
import { db } from './firebase-config';
import { IoArrowBack } from 'react-icons/io5';

const CuentaDeUsuario = () => {
  const auth = getAuth();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [firestoreData, setFirestoreData] = useState({ // Still useful for reference if needed
    firstName: "",
    lastName: "",
    gender: "",
    photoURL: "",
  });

  const [loading, setLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Editable profile fields - these are the source of truth for the form
  const [photoURL, setPhotoURL] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  // displayName is derived, not directly edited in a field
  const [, setDisplayNameState] = useState(''); // Renamed to avoid conflict if 'displayName' is used elsewhere

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Feedback states
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const resetMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  // Load user data from Auth and Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setPhotoURL(currentUser.photoURL || ''); // Initialize photoURL from Auth

        const userDocRef = doc(db, "usuarios", currentUser.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setFirestoreData(userData); // Store Firestore data for reference
            setFirstName(userData.firstName || '');
            setLastName(userData.lastName || '');
            setGender(userData.gender || '');
            if (userData.photoURL) { // Prefer Firestore photoURL if it exists and is set
                setPhotoURL(userData.photoURL);
            }
            setDisplayNameState(`${userData.firstName || ''} ${userData.lastName || ''}`.trim() || currentUser.displayName || '');
          } else {
            // Document doesn't exist, use Auth data to populate fields
            console.warn("User document not found in Firestore for UID:", currentUser.uid, "Populating from Auth.");
            const nameParts = currentUser.displayName?.split(' ') || [''];
            setFirstName(nameParts[0] || '');
            setLastName(nameParts.slice(1).join(' ') || '');
            setGender(''); // Default gender
            // photoURL is already set from currentUser.photoURL
            setDisplayNameState(currentUser.displayName || '');
          }
        } catch (firestoreError) {
          console.error("Error fetching user data from Firestore:", firestoreError);
          setError("Error al cargar datos adicionales del perfil. Usando datos de autenticación como respaldo.");
          const nameParts = currentUser.displayName?.split(' ') || [''];
          setFirstName(nameParts[0] || '');
          setLastName(nameParts.slice(1).join(' ') || '');
          // photoURL already set from Auth, gender remains default
          setDisplayNameState(currentUser.displayName || '');
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth, navigate]);

  const handleProfileSaveChanges = async (e) => {
    e.preventDefault(); // Important as this is form onSubmit handler
    if (!user) return;
    resetMessages();
    setIsSaving(true);

    const newDisplayNameForAuth = `${firstName} ${lastName}`.trim();

    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: newDisplayNameForAuth,
        photoURL: photoURL,
      });

      // Update Firestore document
      const userDocRef = doc(db, "usuarios", user.uid);
      const updatedFirestoreData = {
        firstName,
        lastName,
        gender,
        photoURL, // Save photoURL to Firestore as well
        email: user.email, // Keep email, though it's not edited here
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, updatedFirestoreData, { merge: true });

      // Update local state to reflect changes (important if not reloading page)
      setUser(prevUser => ({ ...prevUser, displayName: newDisplayNameForAuth, photoURL }));
      setFirestoreData(prevData => ({ ...prevData, ...updatedFirestoreData }));
      setDisplayNameState(newDisplayNameForAuth);
      // Individual field states (firstName, lastName, gender, photoURL) are already up-to-date from user input

      setSuccessMessage('Perfil actualizado con éxito.');
      setTimeout(() => {
        window.location.reload(); // As per your existing code
      }, 1000);

    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.message || 'No se pudo actualizar el perfil. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!user) return;
    resetMessages();

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Las nuevas contraseñas no coinciden.");
      return;
    }
    if (!currentPassword) {
      setError("Por favor, ingresa tu contraseña actual.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);

      setSuccessMessage("Contraseña actualizada con éxito.");
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      console.error("Error updating password:", err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("La contraseña actual es incorrecta.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Demasiados intentos. Intenta más tarde.");
      } else {
        setError(err.message || "No se pudo actualizar la contraseña.");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading) {
    return <div className={styles.loadingContainer}>Cargando datos del usuario...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.accountWrapper}>
        <header className={styles.accountHeader}>
          <h1>Mi Cuenta</h1>
        </header>

        {error && <p className={styles.errorMessage}>{error}</p>}
        {successMessage && <p className={styles.successMessage}>{successMessage}</p>}

        <button
          type="button" // Important: type="button" if not submitting a form
          className={`${styles.button} ${styles.mapButton}`}
          style={{ marginBottom: '20px' }} // Added some bottom margin
          onClick={() => navigate('/mapa')}
        >
          <IoArrowBack size={20} />
          <span style={{ marginLeft: '8px' }}>Volver</span>
        </button>

        {/* Profile Information Form */}
        <form onSubmit={handleProfileSaveChanges} className={isChangingPassword ? styles.hiddenSection : ''}>
          <section className={styles.userDetailsSection}>
            <h2>Información del Perfil</h2>

            <div className={styles.profilePicturePreview}>
              {photoURL ? (
                <img src={photoURL} alt="Foto de perfil" className={styles.profilePicture} />
              ) : (
                <div className={styles.profilePicturePlaceholder}>Sin foto</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email (no editable)</label>
              <input type="email" id="email" value={user.email || ''} className={styles.formInput} disabled />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="firstName">Nombre(s)</label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lastName">Apellidos</label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="photoURL">URL de Foto de Perfil (.png, .jpg, etc)</label>
              <input
                type="url"
                id="photoURL"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                className={styles.formInput}
                placeholder="https://example.com/image.png"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Género</label>
              <div className={styles.radioGroup}>
                {["Masculino", "Femenino", "Otro"].map((option) => (
                  <label key={option} className={`${styles.radioOption} ${gender === option.toLowerCase() ? styles.radioOptionChecked : ""}`}>
                    <input
                      type="radio"
                      name="gender"
                      value={option.toLowerCase()}
                      checked={gender === option.toLowerCase()}
                      onChange={(e) => setGender(e.target.value)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
            <p className={styles.uidText}><strong>UID:</strong> {user.uid}</p>
          </section>

          <div className={styles.actionButtons}>
            <button type="submit" className={`${styles.button} ${styles.saveButton}`} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>

        {/* Toggle Change Password Section Button */}
        {/* Show this button only if profile form is not hidden (i.e., not changing password) */}
        {!isChangingPassword && (
             <div className={styles.actionButtons} style={{ marginTop: '20px' }}>
                <button
                    type="button"
                    className={`${styles.button} ${styles.changePasswordToggleButton}`} // You might need to style this
                    onClick={() => {
                        setIsChangingPassword(true); // Show password section
                        resetMessages();
                    }}
                >
                    Cambiar Contraseña
                </button>
            </div>
        )}


        {/* Password Change Form */}
        {isChangingPassword && (
          <form onSubmit={handlePasswordUpdate} style={{marginTop: '20px'}}>
            <section className={styles.passwordChangeSection}>
              <h2>Cambiar Contraseña</h2>
              {/* Inputs for password change */}
              <div className={styles.formGroup}>
                <label htmlFor="currentPassword">Contraseña Actual</label>
                <input type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={styles.formInput} required />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="newPassword">Nueva Contraseña</label>
                <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={styles.formInput} placeholder="Mínimo 6 caracteres" required />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="confirmNewPassword">Confirmar Nueva Contraseña</label>
                <input type="password" id="confirmNewPassword" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className={styles.formInput} required />
              </div>
              <div className={styles.actionButtons}>
                <button type="submit" className={`${styles.button} ${styles.saveButton}`} disabled={isUpdatingPassword}>
                  {isUpdatingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
                <button 
                    type="button" 
                    className={`${styles.button} ${styles.cancelButton}`} 
                    style={{marginLeft: '10px'}}
                    onClick={() => {
                        setIsChangingPassword(false);
                        resetMessages();
                        // Clear password fields on cancel
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                    }}
                    disabled={isUpdatingPassword}
                >
                    Cancelar
                </button>
              </div>
            </section>
          </form>
        )}

        {/* Saved Routes Section */}
        <section className={`${styles.savedRoutesSection} ${isChangingPassword ? styles.hiddenSection : ''}`}>
          <h2>Rutas Guardadas</h2>
          <div className={styles.routesList}>
            <p>Actualmente no tienes rutas guardadas.</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CuentaDeUsuario;