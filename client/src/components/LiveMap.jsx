import React, { useMemo, useRef, useEffect } from "react";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import { useGoogleMaps } from "../config/googleMaps";

/* ================= MAP STYLE ================= */
const containerStyle = {
  width: "100%",
  height: "400px",
};

export default function LiveMap({ userLocation, driverLocation, routePath }) {

  const { isLoaded, loadError } = useGoogleMaps();

  const mapRef = useRef(null);

  /* ================= CENTER ================= */
  const center = useMemo(() => {
    return (
      userLocation ||
      driverLocation || {
        lat: 20.5937, // India center fallback
        lng: 78.9629
      }
    );
  }, [userLocation, driverLocation]);

  /* ================= AUTO FIT BOUNDS ================= */
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const bounds = new window.google.maps.LatLngBounds();

    if (userLocation) bounds.extend(userLocation);
    if (driverLocation) bounds.extend(driverLocation);

    if (userLocation || driverLocation) {
      mapRef.current.fitBounds(bounds, 100);
    }

  }, [userLocation, driverLocation]);

  /* ================= ERROR ================= */
  if (loadError) {
    return (
      <div className="h-[400px] flex items-center justify-center text-red-500">
        ❌ Failed to load Google Maps
      </div>
    );
  }

  /* ================= LOADING ================= */
  if (!isLoaded) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        ⏳ Loading Map...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
      onLoad={(map) => (mapRef.current = map)}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >

      {/* 👤 USER LOCATION */}
      {userLocation && (
        <Marker
          position={userLocation}
          label="You"
          icon={{
            url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
          }}
        />
      )}

      {/* 🚗 DRIVER LOCATION */}
      {driverLocation && (
        <Marker
          position={driverLocation}
          label="Driver"
          icon={{
            url: "https://maps.google.com/mapfiles/ms/icons/cab.png",
            scaledSize: new window.google.maps.Size(40, 40)
          }}
        />
      )}

      {/* 🛣 ROUTE PATH */}
      {routePath && routePath.length > 1 && (
        <Polyline
          path={routePath}
          options={{
            strokeColor: "#4f46e5",
            strokeOpacity: 1,
            strokeWeight: 5
          }}
        />
      )}

    </GoogleMap>
  );
}