import React, { useMemo } from "react";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";

/* ✅ FIXED IMPORT PATH */
import { useGoogleMaps } from "../config/googleMaps";

const containerStyle = {
  width: "100%",
  height: "400px",
};

export default function LiveMap({ userLocation, driverLocation, routePath }) {

  /* ✅ GLOBAL LOADER */
  const { isLoaded, loadError } = useGoogleMaps();

  const center = useMemo(() => {
    return userLocation || driverLocation || { lat: 20.5937, lng: 78.9629 }; // fallback (India center)
  }, [userLocation, driverLocation]);

  /* ❌ ERROR HANDLING */
  if (loadError) {
    return (
      <div className="h-[400px] flex items-center justify-center text-red-500">
        Failed to load Google Maps
      </div>
    );
  }

  /* ⏳ LOADING */
  if (!isLoaded) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        Loading Map...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
    >
      {/* 👤 USER LOCATION */}
      {userLocation && (
        <Marker
          position={userLocation}
          label="You"
        />
      )}

      {/* 🚗 DRIVER LOCATION */}
      {driverLocation && (
        <Marker
          position={driverLocation}
          label="Driver"
          icon={{
            url: "https://maps.google.com/mapfiles/ms/icons/cab.png"
          }}
        />
      )}

      {/* 🛣 ROUTE PATH */}
      {routePath && routePath.length > 0 && (
        <Polyline
          path={routePath}
          options={{
            strokeColor: "#4f46e5",
            strokeWeight: 4
          }}
        />
      )}
    </GoogleMap>
  );
}