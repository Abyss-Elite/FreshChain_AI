const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function apiCall(endpoint: string, options: RequestOptions = {}) {
  const url = `${API_URL}${endpoint}`;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const rawMessage = await response.text().catch(() => response.statusText);
    let message = rawMessage;
    try {
      const parsed = JSON.parse(rawMessage);
      message = parsed.message || parsed.issues?.[0]?.message || rawMessage;
    } catch {
      message = rawMessage;
    }
    throw new Error(message || `Lỗi API: ${response.statusText}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// Dashboard
export const dashboardApi = {
  getDashboard: () => apiCall("/api/dashboard"),
  getAnalytics: () => apiCall("/api/admin/analytics"),
};

// Shipments
export const shipmentsApi = {
  getAll: () => apiCall("/api/shipments"),
  create: (data: any) =>
    apiCall("/api/shipments", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiCall(`/api/shipments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) => apiCall(`/api/shipments/${id}`, { method: "DELETE" }),
  getMatches: (shipmentId: string) => apiCall(`/api/match/${shipmentId}`),
};

// Trucks
export const trucksApi = {
  getAll: () => apiCall("/api/trucks"),
  create: (data: any) =>
    apiCall("/api/trucks", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiCall(`/api/trucks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) => apiCall(`/api/trucks/${id}`, { method: "DELETE" }),
};

// Deals
export const dealsApi = {
  getAll: () => apiCall("/api/deals"),
  create: (data: any) =>
    apiCall("/api/deals", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiCall(`/api/deals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

export const matchingApi = {
  getContext: () => apiCall("/api/matching-context"),
  getShipmentDetail: (shipmentId: string) =>
    apiCall(`/api/shipments/${shipmentId}/matches`),
  getTruckDetail: (truckId: string) => apiCall(`/api/trucks/${truckId}/matches`),
};

// Aggregation
export const aggregationApi = {
  aggregate: (shipmentId: string, neededTrucks: number) =>
    apiCall("/api/aggregate", {
      method: "POST",
      body: JSON.stringify({ shipmentId, neededTrucks }),
    }),
};

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiCall("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (data: any) =>
    apiCall("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const userApi = {
  getProfile: () => apiCall("/api/user/profile"),
  updateProfile: (data: {
    name?: string;
    phone?: string;
    company?: string;
    password?: string;
  }) =>
    apiCall("/api/user/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
