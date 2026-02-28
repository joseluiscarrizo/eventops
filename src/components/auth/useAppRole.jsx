import { useState, useEffect, createContext, useContext } from "react";
import { base44 } from "@/api/base44Client";

export const ROLE_LABELS = {
  admin: "Administrador",
  planificador: "Planificador",
  empleado: "Empleado",
};

// Permissions per role
export const CAN = {
  manageUsers:    (role) => role === "admin",
  manageSettings: (role) => role === "admin",
  managePersonal: (role) => role === "admin" || role === "planificador",
  manageOrders:   (role) => role === "admin" || role === "planificador",
  manageShifts:   (role) => role === "admin" || role === "planificador",
  manageEvents:   (role) => role === "admin" || role === "planificador",
  manageClients:  (role) => role === "admin" || role === "planificador",
  viewReports:    (role) => role === "admin" || role === "planificador",
  viewOwnShifts:  () => true,
  registerAbsences: () => true,
};

export const RoleContext = createContext({ user: null, role: "empleado", loading: true });

export function RoleProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(u => { setUser(u); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const role = user?.role || "empleado";

  return (
    <RoleContext.Provider value={{ user, role, loading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useAppRole() {
  return useContext(RoleContext);
}