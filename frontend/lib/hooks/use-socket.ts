import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let socketInstance: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (socketRef.current?.connected) return;

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socketInstance.on("connected", (data) => {
        console.log("Socket connected:", data);
      });

      socketInstance.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });
    }

    socketRef.current = socketInstance;

    return () => {
      // Không disconnect ở đây, giữ connection sống
    };
  }, []);

  return socketRef.current;
}
