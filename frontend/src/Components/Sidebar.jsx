// frontend/src/Components/Sidebar.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'; // <--- useRef importado aquí
import { FaBars, FaRoute, FaSignOutAlt, FaListUl, FaTrashAlt } from "react-icons/fa";
import { BiLogIn } from "react-icons/bi";
import { IoPeopleOutline } from "react-icons/io5";
import { NavLink, useNavigate } from 'react-router-dom';
import '../Estilos/Sidebar.css';
import logoPng from '../Images/logopng.png';
import { MdOutlineDeveloperBoard } from "react-icons/md";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from '../Pages/firebase-config';
// import { db } from '../Pages/firebase-config'; // Descomentar si se usa db directamente aquí
// import { collection, getDocs } from "firebase/firestore"; // Descomentar si se usa

const Sidebar = ({ onShowRoutes, onClearRoutes, isShowingRoutes, onToggleRouteList }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMenuIndex, setExpandedMenuIndex] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  const [showGpsMessage, setShowGpsMessage] = useState(false);
  const [gpsMessageText, setGpsMessageText] = useState('');
  const [gpsConnected, setGpsConnected] = useState(false);
  const [isAttemptingConnection, setIsAttemptingConnection] = useState(false);
  
  const [connectionAttemptTimeout, setConnectionAttemptTimeout] = useState(null);
  const wsRef = useRef(null);

  const clearConnectionAttemptTimeout = useCallback(() => {
    if (connectionAttemptTimeout) {
      clearTimeout(connectionAttemptTimeout);
      setConnectionAttemptTimeout(null);
    }
  }, [connectionAttemptTimeout]);

  useEffect(() => {
    if (!wsRef.current) {
        wsRef.current = new WebSocket('ws://localhost:8080');

        wsRef.current.onopen = () => {
            console.log('Sidebar WebSocket connected');
        };

        wsRef.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                // console.log('Sidebar WS message:', message); // Debug

                if (message.type === 'gps_status') {
                    const { status, message: statusMessage } = message.payload;
                    if (status === 'waiting_for_valid_data') {
                        setIsAttemptingConnection(true);
                        setGpsConnected(false);
                        setGpsMessageText(statusMessage || 'Esperando datos GPS válidos...');
                        setShowGpsMessage(true);
                    } else if (status === 'disconnected' || status === 'disconnected_error' || status === 'script_launch_error' || status === 'script_error') {
                        clearConnectionAttemptTimeout();
                        setIsAttemptingConnection(false);
                        setGpsConnected(false);
                        setGpsMessageText(statusMessage || 'GPS desconectado o error.');
                        setShowGpsMessage(true);
                        window.dispatchEvent(new CustomEvent('gps-connection-lost'));
                        setTimeout(() => setShowGpsMessage(false), 7000);
                    }
                } else if (message.type === 'gps_update' && message.payload.lat) {
                    clearConnectionAttemptTimeout();
                    if (!gpsConnected) { 
                        setGpsMessageText("GPS conectado y recibiendo datos.");
                        setShowGpsMessage(true);
                        setTimeout(() => setShowGpsMessage(false), 5000);
                    }
                    setGpsConnected(true);
                    setIsAttemptingConnection(false);
                    window.dispatchEvent(new CustomEvent('gps-data-active')); 
                }
            } catch (error) {
                console.error('Error processing WebSocket message in Sidebar:', error);
            }
        };

        wsRef.current.onclose = () => {
            console.log('Sidebar WebSocket disconnected');
            // No cambiar estado aquí directamente si el cierre es inesperado
        };

        wsRef.current.onerror = (error) => {
            console.error('Sidebar WebSocket error:', error);
            setGpsMessageText("Error de conexión con el servidor GPS.");
            setShowGpsMessage(true);
            setIsAttemptingConnection(false);
            setGpsConnected(false);
            clearConnectionAttemptTimeout();
            setTimeout(() => setShowGpsMessage(false), 7000);
        };
    }
    
    return () => {
        clearConnectionAttemptTimeout();
    };
  }, [gpsConnected, clearConnectionAttemptTimeout]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const toggle = () => {
    if (isOpen) {
      setExpandedMenuIndex(null);
    }
    setIsOpen(!isOpen);
  };

  const toggleSubMenu = (index) => {
    if (!isOpen) {
      setIsOpen(true);
      setExpandedMenuIndex(index);
    } else {
      setExpandedMenuIndex(prevIndex => (prevIndex === index ? null : index));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("Sesión cerrada");
      setGpsConnected(false); 
      setIsAttemptingConnection(false);
      // No hay 'pythonProcess' que verificar aquí, eso es del backend.
      // Si es necesario, la acción de desconectar GPS se haría a través de una llamada API a disconnectGps()
      // si el GPS estuviera activo.
      if (gpsConnected || isAttemptingConnection) {
        disconnectGps(); // Intenta desconectar si estaba activo o intentando.
      }
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };
  
  const handleExternalGpsClick = useCallback(() => {
    clearConnectionAttemptTimeout(); 

    if (gpsConnected) { 
      disconnectGps();
      return;
    }

    if (isAttemptingConnection) {
      setGpsMessageText("Intentando conectar... Esperando datos GPS válidos.");
      setShowGpsMessage(true);
      return; 
    }

    setIsAttemptingConnection(true);
    setGpsConnected(false); 
    setGpsMessageText("Iniciando conexión GPS... Asegúrate que los datos GPS (longitud, latitud, [humedad], [temperatura]) estén separados por comas.");
    setShowGpsMessage(true);

    const timeoutId = setTimeout(() => {
      if (isAttemptingConnection && !gpsConnected) { 
        setGpsMessageText("Error: Tiempo de espera agotado. Verifica el dispositivo GPS y la conexión del servidor.");
        setShowGpsMessage(true);
        setIsAttemptingConnection(false); 
        setTimeout(() => setShowGpsMessage(false), 7000);
      }
    }, 25000); 
    setConnectionAttemptTimeout(timeoutId);

    fetch('http://localhost:3001/api/connect-gps')
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => { throw new Error(err.message || `Error del servidor: ${response.status}`) });
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error(data.message || "Fallo al iniciar la conexión GPS desde el servidor.");
        }
        // El estado real (conectado, esperando datos) lo dará el WebSocket.
      })
      .catch(error => {
        clearConnectionAttemptTimeout();
        setGpsMessageText(error.message || "Error de red o servidor al intentar conectar con GPS.");
        setShowGpsMessage(true);
        setIsAttemptingConnection(false);
        setTimeout(() => setShowGpsMessage(false), 7000);
      });
  }, [gpsConnected, isAttemptingConnection, clearConnectionAttemptTimeout]);

  // Definir disconnectGps usando useCallback para evitar re-creaciones innecesarias si se pasa como prop o dependencia
  const disconnectGps = useCallback(() => {
    clearConnectionAttemptTimeout();
    setGpsMessageText("Desconectando GPS...");
    setShowGpsMessage(true);
    fetch('http://localhost:3001/api/disconnect-gps')
      .then(response => response.json())
      .then(data => {
        setGpsMessageText(data.message || "Solicitud de desconexión GPS enviada.");
      })
      .catch(error => {
        setGpsMessageText("Error al solicitar desconexión del GPS. Forzando estado desconectado localmente.");
        setIsAttemptingConnection(false); 
        setGpsConnected(false);
        window.dispatchEvent(new CustomEvent('gps-connection-lost'));
      })
      .finally(() => {
        setTimeout(() => setShowGpsMessage(false), 5000);
      });
  }, [clearConnectionAttemptTimeout]); // Añadir dependencias si las usa directamente

  const getGpsButtonText = () => {
    if (isAttemptingConnection) return 'Conectando (Esperando datos...)';
    if (gpsConnected) return 'Desconectar GPS Externo';
    return 'Agregar GPS Externo';
  };

  const getGpsButtonIcon = () => {
    if (isAttemptingConnection) return <AiOutlineLoading3Quarters className="rotating-icon" />;
    return <MdOutlineDeveloperBoard />;
  };

  const menuItems = [
    {
      name: 'Cuenta',
      path: '/login',
      icon: <IoPeopleOutline />,
      submenu: !currentUser ? [ 
        { icon: <BiLogIn />, name: 'Iniciar Sesión', path: '/login' }
      ] : null,
    },
    {
      name: getGpsButtonText(),
      icon: getGpsButtonIcon(),
      action: handleExternalGpsClick,
      className: gpsConnected ? 'connected' : (isAttemptingConnection ? 'connecting' : '')
    },
    {
      name: isShowingRoutes ? 'Eliminar Rutas Mostradas' : 'Mostrar Rutas',
      icon: isShowingRoutes ? <FaTrashAlt /> : <FaRoute />,
      action: () => {
        if (isShowingRoutes) {
          onShowRoutes && onShowRoutes(); // Corregido: Llamar onShowRoutes para mostrar, o onClearRoutes para eliminar
        } else {
           onToggleRouteList && onToggleRouteList(true); // Esto parece correcto para abrir el modal
        }
         // Si la lógica es: si está mostrando -> el botón dice "Eliminar Rutas" -> llama onClearRoutes
         //                   si no está mostrando -> el botón dice "Mostrar Rutas" -> llama onToggleRouteList(true) o onShowRoutes directamente.
         // La prop onShowRoutes no estaba definida, asumo que es onClearRoutes() la que se llama cuando isShowingRoutes es true.
         // Reemplazo con onClearRoutes si esa es la intención:
         if (isShowingRoutes && onClearRoutes) {
             onClearRoutes();
         } else if (!isShowingRoutes && onToggleRouteList) {
             onToggleRouteList(true);
         }

      },
    },
  ];

  if (currentUser) {
    menuItems.push({
      name: 'Cerrar Sesión',
      icon: <FaSignOutAlt />,
      action: handleLogout,
      path: '#' 
    });
  }

  const renderMenuItem = (item, index) => {
    const isExpanded = expandedMenuIndex === index;
    const linkClass = `link ${item.submenu && isExpanded ? 'expanded' : ''} ${item.className || ''}`;
    const isDisabled = item.name === getGpsButtonText() && isAttemptingConnection && !gpsConnected;

    if (item.action) {
      return (
        <div key={item.name + index} 
             className={`${linkClass} ${isDisabled ? 'disabled' : ''}`} 
             onClick={!isDisabled ? item.action : undefined} 
             style={{cursor: isDisabled ? 'not-allowed' : 'pointer'}}>
          <div className="icon">{item.icon}</div>
          <div style={{ display: isOpen ? "block" : "none" }} className="link_text">{item.name}</div>
        </div>
      );
    } else if (item.submenu && item.submenu.length > 0) {
      return (
        <div key={item.name + index}>
          <div className={linkClass} onClick={() => toggleSubMenu(index)} style={{cursor: 'pointer'}}>
            <div className="icon">{item.icon}</div>
            <div style={{ display: isOpen ? "block" : "none" }} className="link_text">{item.name}</div>
          </div>
          <div className={`submenu_container ${isExpanded ? 'open' : ''}`}>
            {isExpanded && item.submenu.map((subitem, subindex) => (
              <NavLink to={subitem.path} key={subitem.name + subindex} className="link sublink" activeclassname="active">
                <div className="icon">{subitem.icon}</div>
                <div className="submenu_text">{subitem.name}</div>
              </NavLink>
            ))}
          </div>
        </div>
      );
    } else if (item.path) {
      return (
        <NavLink to={item.path} key={item.name + index} className={linkClass} activeclassname="active">
          <div className="icon">{item.icon}</div>
          <div style={{ display: isOpen ? "block" : "none" }} className="link_text">{item.name}</div>
        </NavLink>
      );
    }
    return null;
  };

  return (
    <> 
      <div className={`sidebar ${isOpen ? "open" : ""}`} style={{ width: isOpen ? "var(--sidebar-width)" : "60px" }}>
        <div className="top">
  <h1 style={{ display: isOpen ? "flex" : "none" }} className="logo">
    <img src={logoPng} alt="Logo" className="logoPng" />
  </h1>
  <div className="bars" onClick={toggle}>
    <FaBars />
  </div>
</div>
        {menuItems.map(renderMenuItem)}

        {showGpsMessage && (
          <div className={`gps-status-message ${gpsConnected ? 'success' : (isAttemptingConnection ? 'connecting' : 'error')}`}>
            {gpsMessageText}
          </div>
        )}
      </div>
      <div className="mobile-menu-toggle" onClick={toggle}>
        <img alt="logopng" src={logoPng} className='logoPng'/>
      </div>
    </>
  );
};

export default Sidebar; 