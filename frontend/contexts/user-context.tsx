"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export interface User {
  id: string;
  email: string;
  role: "SHIPPER" | "CARRIER" | "ADMIN";
  name: string;
  company: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Decode JWT token để lấy user info mà không cần backend call
 * Token payload chứa: { id, email, role, name, company, iat, exp }
 */
function decodeToken(token: string): User | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const payload = JSON.parse(jsonPayload);
    return {
      id: payload.id || "",
      email: payload.email || "",
      role: payload.role || "SHIPPER",
      name: payload.name || "Người dùng",
      company: payload.company || "Công ty",
    };
  } catch (error) {
    console.error("Lỗi decode token:", error);
    return null;
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        const decoded = decodeToken(token);
        setUser(decoded);
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, loading, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser phải được sử dụng bên trong UserProvider");
  }
  return context;
}
