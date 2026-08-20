"use client";

import React, { useEffect, useState } from "react";
import {
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
  MessageSquare,
  BadgeDollarSign,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NegotiationRound {
  id: string;
  roundNumber: number;
  proposedPrice: number;
  respondedPrice?: number | null;
  proposedBy: string;
  respondedBy?: string | null;
  message?: string | null;
  responseMessage?: string | null;
  status: string;
  createdAt: string;
  respondedAt?: string | null;
}

interface Deal {
  id: string;
  shipmentId: string;
  truckId: string;
  ownerId: string;
  finalPrice?: number | null;
  status: string;
  negotiationRounds: NegotiationRound[];
}

interface NegotiationSummary {
  dealId: string;
  currentRound: number;
  totalRounds: number;
  initialPrice: number;
  currentProposedPrice: number;
  lastCounterPrice?: number | null;
  finalPrice?: number | null;

  priceHistory: Array<{
    round: number;
    proposed: number;
    counter?: number | null;
    by: string;
  }>;

  status: string;
}

const vnd = (value?: number | null) =>
  `₫${(value || 0).toLocaleString("vi-VN")}`;

export function NegotiationFlow({ dealId }: { dealId: string }) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [summary, setSummary] = useState<NegotiationSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [counterPrice, setCounterPrice] = useState("");
  const [counterMessage, setCounterMessage] = useState("");

  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadDealData();

    const interval = setInterval(() => {
      loadDealData();
    }, 5000);

    return () => clearInterval(interval);
  }, [dealId]);

  const loadDealData = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/negotiation/deals/${dealId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();

      setDeal(data.deal);
      setSummary(data.summary);

      if (data.deal?.status === "ACCEPTED" || data.deal?.finalPrice) {
        setCompleted(true);
      }
    } catch (error) {
      console.error("Failed to load deal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!deal || !counterPrice) return;

    try {
      setSubmitting(true);

      const latestRound =
        deal.negotiationRounds[deal.negotiationRounds.length - 1];

      const response = await fetch(
        `/api/negotiation/deals/${dealId}/rounds/${latestRound.id}/respond`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },

          body: JSON.stringify({
            counterPrice: Number(counterPrice),
            message: counterMessage,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Response failed");
      }

      if (data.dealAccepted) {
        setCompleted(true);
      }

      setCounterPrice("");
      setCounterMessage("");

      await loadDealData();
    } catch (error) {
      console.error(error);
      alert("Lỗi phản hồi giá");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async () => {
    if (!deal) return;

    try {
      setSubmitting(true);

      const latestRound =
        deal.negotiationRounds[deal.negotiationRounds.length - 1];

      const response = await fetch(
        `/api/negotiation/deals/${dealId}/rounds/${latestRound.id}/accept`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Accept failed");
      }

      if (data.success) {
        setCompleted(true);
      }

      await loadDealData();
    } catch (error) {
      console.error(error);
      alert("Lỗi chấp nhận giá");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!deal) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/negotiation/deals/${dealId}/reject`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },

        body: JSON.stringify({
          reason: "Từ chối thương lượng",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Reject failed");
      }

      await loadDealData();
    } catch (error) {
      console.error(error);
      alert("Lỗi từ chối");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !summary || !deal) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const latestRound = deal.negotiationRounds[deal.negotiationRounds.length - 1];

  const isWaitingForResponse = latestRound?.status === "WAITING_FOR_COUNTER";

  const priceChangePercent =
    summary.initialPrice > 0
      ? (
          ((summary.currentProposedPrice - summary.initialPrice) /
            summary.initialPrice) *
          100
        ).toFixed(2)
      : "0";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4">
      {/* SUMMARY */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-slate-500">Giá khởi đầu</p>

            <p className="mt-2 text-2xl font-bold text-blue-600">
              {vnd(summary.initialPrice)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-slate-500">Giá hiện tại</p>

            <p className="mt-2 text-2xl font-bold text-orange-600">
              {vnd(summary.currentProposedPrice)}
            </p>

            <div className="mt-2 flex items-center gap-1 text-xs">
              {Number(priceChangePercent) >= 0 ? (
                <TrendingUp className="h-3 w-3 text-red-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-emerald-500" />
              )}

              <span>{Math.abs(Number(priceChangePercent))}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-slate-500">
              Vòng thương lượng
            </p>

            <p className="mt-2 text-2xl font-bold text-purple-600">
              {summary.currentRound} / {summary.totalRounds}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-slate-500">Trạng thái</p>

            <div className="mt-3">
              <Badge className={completed ? "bg-emerald-600" : "bg-amber-500"}>
                {completed ? "Đã chốt hợp đồng" : "Đang thương lượng"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TIMELINE */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Lịch sử thương lượng</CardTitle>

          <CardDescription>
            Theo dõi toàn bộ các vòng đàm phán giá
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {deal.negotiationRounds.map((round) => (
              <div
                key={round.id}
                className={`rounded-xl border p-4 ${
                  round.status === "COMPLETED"
                    ? "border-emerald-200 bg-emerald-50"
                    : round.status === "RESPONDED"
                      ? "border-blue-200 bg-blue-50"
                      : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="mb-3 flex items-center gap-2">
                      <Badge className="bg-red-600 hover:bg-red-700 text-white">
                        Vòng {round.roundNumber}
                      </Badge>

                      <Badge>{round.status}</Badge>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* PROPOSED */}
                      <div className="rounded-lg bg-white p-3 border">
                        <p className="text-xs text-slate-500">Đề nghị bởi</p>

                        <p className="mt-1 font-semibold text-slate-800">
                          {round.proposedBy}
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <BadgeDollarSign className="h-4 w-4 text-blue-600" />

                          <span className="text-lg font-bold text-blue-600">
                            {vnd(round.proposedPrice)}
                          </span>
                        </div>

                        {round.message && (
                          <div className="mt-3 rounded-md bg-slate-50 p-2 text-sm text-slate-700">
                            💬 {round.message}
                          </div>
                        )}
                      </div>

                      {/* RESPONSE */}
                      {round.respondedPrice && (
                        <div className="rounded-lg bg-white p-3 border">
                          <p className="text-xs text-slate-500">Phản hồi bởi</p>

                          <p className="mt-1 font-semibold text-slate-800">
                            {round.respondedBy}
                          </p>

                          <div className="mt-3 flex items-center gap-2">
                            <BadgeDollarSign className="h-4 w-4 text-orange-600" />

                            <span className="text-lg font-bold text-orange-600">
                              {vnd(round.respondedPrice)}
                            </span>
                          </div>

                          {round.responseMessage && (
                            <div className="mt-3 rounded-md bg-slate-50 p-2 text-sm text-slate-700">
                              💬 {round.responseMessage}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-500">
                    <p>
                      {new Date(round.createdAt).toLocaleDateString("vi-VN")}
                    </p>

                    <p className="mt-1">
                      {new Date(round.createdAt).toLocaleTimeString("vi-VN")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ACTIONS */}
      {!completed && isWaitingForResponse && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle>⏳ Chờ phản hồi của bạn</CardTitle>

            <CardDescription>
              Giá hiện tại: {vnd(summary.currentProposedPrice)}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Giá phản hồi</p>

              <Input
                type="number"
                placeholder="Nhập giá phản hồi..."
                value={counterPrice}
                disabled={submitting}
                onChange={(e) => setCounterPrice(e.target.value)}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Tin nhắn</p>

              <Input
                placeholder="Nhập nội dung phản hồi..."
                value={counterMessage}
                disabled={submitting}
                onChange={(e) => setCounterMessage(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleRespond}
                disabled={submitting || !counterPrice}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="mr-2 h-4 w-4" />
                )}
                Phản hồi giá
              </Button>

              <Button
                onClick={handleAccept}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Chấp nhận
              </Button>

              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleReject}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Từ chối
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SUCCESS */}
      {completed && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="py-10">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-20 w-20 text-emerald-600" />

              <h2 className="mt-5 text-3xl font-bold text-emerald-700">
                Thương lượng thành công
              </h2>

              <p className="mt-2 text-slate-600">
                Hai bên đã thống nhất giá vận chuyển
              </p>

              <div className="mt-6 rounded-2xl border border-emerald-200 bg-white px-8 py-5">
                <p className="text-sm text-slate-500">Giá chốt cuối cùng</p>

                <p className="mt-2 text-4xl font-extrabold text-emerald-600">
                  {vnd(summary.finalPrice)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
