"use client";

import { create } from "zustand";
import { shipments, trucks } from "@/lib/demo-data";

type DemoState = {
  shipments: typeof shipments;
  trucks: typeof trucks;
  addShipment: (shipment: any) => void;
  addTruck: (truck: any) => void;
};

export const useDemoStore = create<DemoState>((set) => ({
  shipments,
  trucks,
  addShipment: (shipment) => set((state) => ({ shipments: [{ id: `SHP-${1030 + state.shipments.length}`, status: "Matching", ...shipment }, ...state.shipments] })),
  addTruck: (truck) => set((state) => ({ trucks: [{ id: `TRK-${state.trucks.length + 1}`, ...truck }, ...state.trucks] }))
}));
