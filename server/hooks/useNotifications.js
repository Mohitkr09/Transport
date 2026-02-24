import { useEffect } from "react";
import { io } from "socket.io-client";

export default function useNotifications() {

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token: localStorage.getItem("token") }
    });

    socket.on("notification", notif => {
      const old = JSON.parse(localStorage.getItem("notifications") || "[]");
      localStorage.setItem(
        "notifications",
        JSON.stringify([notif, ...old])
      );

      window.dispatchEvent(new Event("notif-update"));
    });

    return () => socket.disconnect();
  }, []);
}