import React, { createContext, useContext, useMemo } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

/* ✅ SINGLE SOURCE OF TRUTH */
export const GOOGLE_MAP_LIBRARIES = ["places"];

/* CONTEXT */
const GoogleMapsContext = createContext();

/* PROVIDER */
export const GoogleMapsProvider = ({ children }) => {

  /* ✅ prevent re-creation */
  const libraries = useMemo(() => GOOGLE_MAP_LIBRARIES, []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script", 
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries,
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

/* HOOK */
export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);

  if (!context) {
    throw new Error("useGoogleMaps must be used inside GoogleMapsProvider");
  }

  return context;
};