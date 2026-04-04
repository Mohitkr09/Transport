import React, { useMemo, useRef, useEffect, useState } from "react";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import { useGoogleMaps } from "../config/googleMaps";

/* ================= MAP STYLE ================= */
const containerStyle = {
  width: "100%",
  height: "400px",
};

export default function LiveMap({
  userLocation,
  driverLocation,
  dropLocation,
  routePath
}) {

  const { isLoaded, loadError } = useGoogleMaps();

  const mapRef = useRef(null);
  const [smoothDriver, setSmoothDriver] = useState(null);
  const [directionPath, setDirectionPath] = useState([]);

  /* ================= CENTER ================= */
  const center = useMemo(() => {
    return (
      driverLocation ||
      userLocation || {
        lat: 20.5937,
        lng: 78.9629
      }
    );
  }, [userLocation, driverLocation]);

  /* ================= SMOOTH DRIVER ================= */
  useEffect(() => {
    if (!driverLocation) return;

    setSmoothDriver(prev => {
      if (!prev) return driverLocation;

      return {
        lat: prev.lat + (driverLocation.lat - prev.lat) * 0.3,
        lng: prev.lng + (driverLocation.lng - prev.lng) * 0.3
      };
    });
  }, [driverLocation]);

  /* ================= 🔥 FIXED DIRECTIONS (RUN ONLY ONCE) ================= */
  useEffect(() => {
    if (!window.google) return;

    const origin = driverLocation;
    const destination = dropLocation || userLocation;

    if (!origin || !destination) return;

    // ❌ prevent recalculation if already exists
    if (directionPath.length > 0) return;

    const service = new window.google.maps.DirectionsService();

    service.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === "OK") {
          const path = result.routes[0].overview_path.map(p => ({
            lat: p.lat(),
            lng: p.lng()
          }));

          setDirectionPath(path);
        }
      }
    );

  }, [userLocation, dropLocation]); // 🔥 removed driverLocation dependency

  /* ================= AUTO FIT ================= */
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const bounds = new window.google.maps.LatLngBounds();

    if (driverLocation) bounds.extend(driverLocation);
    if (userLocation) bounds.extend(userLocation);
    if (dropLocation) bounds.extend(dropLocation);

    if (bounds.isEmpty()) return;

    mapRef.current.fitBounds(bounds, 80);

  }, [driverLocation, userLocation, dropLocation]);

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
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >

      {/* 👤 USER / PICKUP */}
      {userLocation && (
        <Marker
          position={userLocation}
          icon={{
            url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
          }}
        />
      )}

      {/* 🏁 DROP */}
      {dropLocation && (
        <Marker
          position={dropLocation}
          icon={{
            url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
          }}
        />
      )}

      {/* 🚗 DRIVER (SMOOTH MOVEMENT) */}
      {smoothDriver && (
        <Marker
          position={smoothDriver}
          icon={{
            url: "https://cdn-icons-png.flaticon.com/512/743/743922.png",
            scaledSize: new window.google.maps.Size(40, 40)
          }}
        />
      )}

      {/* 🛣 ROUTE */}
      {(directionPath.length > 0 || routePath?.length > 1) && (
        <Polyline
          path={directionPath.length > 0 ? directionPath : routePath}
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