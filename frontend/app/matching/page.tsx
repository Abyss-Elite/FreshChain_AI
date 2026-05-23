"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Loader2, RefreshCw, Scale, Truck, Wallet, Zap } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dealsApi, matchingApi } from "@/lib/api";
import { onlyDigits, vnd } from "@/lib/utils";

export default function MatchingPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offerFor, setOfferFor] = useState<string | null>(null);
  const [offer, setOffer] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      setRefreshing(true);
      setData(await matchingApi.getContext());
    } catch (error: any) {
      toast.error(error.message || "Khong tai duoc du lieu ghep hang");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createDeal = async (match: any, accepted: boolean) => {
    const price = accepted ? match.shipment.proposedPrice : Number(offer);
    if (!price || price <= 0) return toast.error("Gia thuong luong phai la so duong");

    try {
      const key = `${match.shipment.id}-${match.truck.id}`;
      setBusy(key);
      await dealsApi.create({
        shipmentId: match.shipment.id,
        truckId: match.truck.id,
        proposedPrice: price,
        status: accepted ? "ACCEPTED" : "PROPOSED",
      });
      toast.success(accepted ? "Da chap nhan ghep hang" : "Da gui gia thuong luong");
      setOfferFor(null);
      setOffer("");
      load();
    } catch (error: any) {
      toast.error(error.message || "Khong tao duoc de xuat");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          Dang tinh toan ghep hang...
        </div>
      </DashboardShell>
    );
  }

  const isCarrier = data?.role === "CARRIER";
  const target = data?.target;
  const matches = data?.matches || [];

  return (
    <DashboardShell>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-3xl">Ghep hang thong minh</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isCarrier ? "Chu xe xem don hang phu hop voi xe cua minh." : "Chu hang xem xe phu hop voi don hang cua minh."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Lam moi
        </Button>
      </div>

      {target ? (
        <Card className="mb-4 border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-white p-2 text-emerald-700">
              {isCarrier ? <Truck size={18} /> : <Scale size={18} />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-emerald-700">{isCarrier ? "Xe dang xet" : "Don hang dang xet"}</p>
              <h2 className="mt-1 truncate text-base font-bold text-slate-900" title={isCarrier ? target.plateNumber : target.cargoType}>
                {isCarrier ? target.plateNumber : target.cargoType}
              </h2>
              <p className="mt-1 truncate text-sm text-slate-600" title={isCarrier ? target.currentRoute : `${target.pickup} -> ${target.dropoff}`}>
                {isCarrier ? target.currentRoute : `${target.pickup} -> ${target.dropoff}`}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {isCarrier ? "Ban chua co xe nao de ghep don." : "Ban chua co don hang nao de ghep xe."}
        </Card>
      )}

      <div className="space-y-3">
        {matches.map((match: any) => {
          const key = `${match.shipment.id}-${match.truck.id}`;
          const primary = isCarrier ? match.shipment.cargoType : match.truck.plateNumber;
          const secondary = isCarrier ? `${match.shipment.pickup} -> ${match.shipment.dropoff}` : match.truck.currentRoute;
          const weight = isCarrier ? match.shipment.weightKg : match.truck.remainingKg;
          const route = isCarrier ? `${match.shipment.pickup} -> ${match.shipment.dropoff}` : match.truck.currentRoute;
          const temp = match.truck.refrigerated
            ? `${match.truck.tempMin}C den ${match.truck.tempMax}C`
            : "Khong lanh";
          const price = isCarrier ? match.shipment.proposedPrice : match.estimatedSavings;

          return (
            <Card key={key} className="border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Zap size={17} className="shrink-0 text-amber-500" />
                    <h2 className="truncate text-base font-bold text-slate-900" title={primary}>{primary}</h2>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500" title={secondary}>{secondary}</p>
                </div>
                <Badge tone={match.matchingScore >= 80 ? "green" : "amber"} className="shrink-0">{match.matchingScore}%</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">{isCarrier ? "Khoi luong" : "Tai con trong"}</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900" title={`${weight} kg`}>{Number(weight || 0).toLocaleString("vi-VN")} kg</p>
                  <p className="mt-2 truncate text-xs text-slate-500" title={temp}>{temp}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">Lo trinh</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900" title={route}>{route}</p>
                  <p className="mt-2 truncate text-xs text-slate-500" title={vnd(price)}>{vnd(price)}</p>
                </div>
              </div>

              {match.warnings?.length > 0 && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                  {match.warnings.slice(0, 2).map((warning: string, index: number) => (
                    <p key={index} className="truncate text-xs text-amber-800" title={warning}>{warning}</p>
                  ))}
                </div>
              )}

              {offerFor === key && (
                <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                  <label className="text-xs font-semibold text-slate-600">Gia de xuat</label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      inputMode="numeric"
                      value={offer ? Number(offer).toLocaleString("vi-VN") : ""}
                      onChange={(event) => setOffer(onlyDigits(event.target.value))}
                      placeholder="1,500,000 VND"
                    />
                    <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={busy === key} onClick={() => createDeal(match, false)}>
                      Gui
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{offer ? `${vnd(offer)} dang cho xac nhan` : "Chi nhap chu so"}</p>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
                <Button variant="outline" size="sm" onClick={() => setOfferFor(offerFor === key ? null : key)}>
                  <Wallet size={14} />
                  Thuong luong gia
                </Button>
                <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={busy === key} onClick={() => createDeal(match, true)}>
                  <CheckCircle size={14} />
                  Chap nhan ghep
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </DashboardShell>
  );
}
