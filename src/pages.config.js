/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Altas from './pages/Altas';
import Asignacion from './pages/Asignacion';
import Camareros from './pages/Camareros';
import Chat from './pages/Chat';
import Clientes from './pages/Clientes';
import Comunicacion from './pages/Comunicacion';
import ConfiguracionCuenta from './pages/ConfiguracionCuenta';
import ConfiguracionNotificaciones from './pages/ConfiguracionNotificaciones';
import ConfirmarServicio from './pages/ConfirmarServicio';
import Coordinadores from './pages/Coordinadores';
import DashboardCoordinador from './pages/DashboardCoordinador';
import Disponibilidad from './pages/Disponibilidad';
import FichajeQR from './pages/FichajeQR';
import HistorialMensajes from './pages/HistorialMensajes';
import Home from './pages/Home';
import Informes from './pages/Informes';
import Pedidos from './pages/Pedidos';
import PerfilCamarero from './pages/PerfilCamarero';
import PreferenciasNotificaciones from './pages/PreferenciasNotificaciones';
import TableroEventos from './pages/TableroEventos';
import TiempoReal from './pages/TiempoReal';
import VistaMovil from './pages/VistaMovil';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Altas": Altas,
    "Asignacion": Asignacion,
    "Camareros": Camareros,
    "Chat": Chat,
    "Clientes": Clientes,
    "Comunicacion": Comunicacion,
    "ConfiguracionCuenta": ConfiguracionCuenta,
    "ConfiguracionNotificaciones": ConfiguracionNotificaciones,
    "ConfirmarServicio": ConfirmarServicio,
    "Coordinadores": Coordinadores,
    "DashboardCoordinador": DashboardCoordinador,
    "Disponibilidad": Disponibilidad,
    "FichajeQR": FichajeQR,
    "HistorialMensajes": HistorialMensajes,
    "Home": Home,
    "Informes": Informes,
    "Pedidos": Pedidos,
    "PerfilCamarero": PerfilCamarero,
    "PreferenciasNotificaciones": PreferenciasNotificaciones,
    "TableroEventos": TableroEventos,
    "TiempoReal": TiempoReal,
    "VistaMovil": VistaMovil,
}

export const pagesConfig = {
    mainPage: "Pedidos",
    Pages: PAGES,
    Layout: __Layout,
};