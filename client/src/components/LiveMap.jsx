import React, { useMemo } from "react";
import { GoogleMap, Marker, useJsApiLoader, Polyline } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "400px",
};

export default function LiveMap({ userLocation, driverLocation, routePath }) {

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY
  });

  const center = useMemo(() => userLocation, [userLocation]);

  if (!isLoaded) return <p>Loading Map...</p>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
    >
      {/* USER */}
      {userLocation && (
        <Marker position={userLocation} label="You" />
      )}

      {/* DRIVER */}
      {driverLocation && (
        <Marker
          position={driverLocation}
          label="Driver"
          icon={{
            url: "https://maps.google.com/mapfiles/ms/icons/cab.png"
          }}
        />
      )}

      {/* ROUTE LINE */}
      {routePath && (
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