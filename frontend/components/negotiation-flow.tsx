import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { TrendingDown, TrendingUp, CheckCircle2, XCircle } from "lucide-react";

interface NegotiationRound {
  id: string;
  roundNumber: number;
  proposedPrice: number;
  respondedPrice?: number;
  proposedBy: string;
  respondedBy?: string;
  message?: string;
  responseMessage?: string;
  status: string;
  createdAt: string;
  respondedAt?: string;
}

interface Deal {
  id: string;
  shipmentId: string;
  truckId: string;
  ownerId: string;
  finalPrice?: number;
  status: string;
  negotiationRounds: NegotiationRound[];
}

interface NegotiationSummary {
  dealId: string;
  currentRound: number;
  totalRounds: number;
  initialPrice: number;
  currentProposedPrice: number;
  lastCounterPrice?: number;
  finalPrice?: number;
  priceHistory: Array<{
    round: number;
    proposed: number;
    counter?: number;
    by: string;
  }>;
  status: string;
}

export function NegotiationFlow({ dealId }: { dealId: string }) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [summary, setSummary] = useState<NegotiationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  const [priceChange, setPriceChange] = useState(0);

  useEffect(() => {
    loadDealData();
    // Auto-refresh every 5 seconds to get latest updates
    const interval = setInterval(loadDealData, 5000);
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

      // Calculate price change percentage
      if (data.summary) {
        const change = (
          ((data.summary.currentProposedPrice - data.summary.initialPrice) /
            data.summary.initialPrice) *
          100
        ).toFixed(2);
        setPriceChange(parseFloat(change));
      }

      if (data.deal.finalPrice) {
        setCompleted(true);
      }
    } catch (error) {
      console.error("Failed to load deal data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!deal || !counterPrice) return;

    try {
      setLoading(true);
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
            counterPrice: parseInt(counterPrice),
            message: counterMessage,
          }),
        }
      );

      const data = await response.json();

      if (data.dealAccepted) {
        setCompleted(true);
        alert(
          `✅ Thương lượng thành công! Giá chốt: ${data.finalPrice?.toLocaleString()} đ`
        );
      }

      // Reload data
      await loadDealData();
      setCounterPrice("");
      setCounterMessage("");
    } catch (error) {
      console.error("Failed to respond:", error);
      alert("Lỗi khi phản hồi giá");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!deal) return;

    try {
      setLoading(true);
      const latestRound =
        deal.negotiationRounds[deal.negotiationRounds.length - 1];

      const response = await fetch(
        `/api/negotiation/deals/${dealId}/rounds/${latestRound.id}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setCompleted(true);
        alert(`✅ Đã chấp nhận giá!`);
      }

      // Reload data
      await loadDealData();
    } catch (error) {
      console.error("Failed to accept:", error);
      alert("Lỗi khi chấp nhận giá");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!deal) return;

    try {
      setLoading(true);

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

      if (data.success) {
        alert("❌ Đã từ chối thương lượng");
        await loadDealData();
      }
    } catch (error) {
      console.error("Failed to reject:", error);
      alert("Lỗi khi từ chối");
    } finally {
      setLoading(false);
    }
  };

  if (!summary) {
    return <div className="p-4 text-center">Đang tải dữ liệu...</div>;
  }

  const latestRound = deal?.negotiationRounds[deal.negotiationRounds.length - 1];
  const isWaitingForResponse = latestRound?.status === "WAITING_FOR_COUNTER";
  const isPriceMatched =
    latestRound?.proposedPrice === latestRound?.respondedPrice;

  // Helper function to format price with color
  const getPriceColor = (price: number) => {
    if (price < summary.initialPrice) return "text-green-600"; // Going down
    if (price > summary.initialPrice) return "text-red-600"; // Going up
    return "text-gray-600";
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      {/* Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Giá Khởi Đầu</p>
            <p className="text-2xl font-bold text-blue-700">
              {summary.initialPrice.toLocaleString()} đ
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Giá Hiện Tại</p>
            <p className={`text-2xl font-bold ${getPriceColor(summary.currentProposedPrice)}`}>
              {summary.currentProposedPrice.toLocaleString()} đ
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {priceChange > 0 ? "↑" : "↓"} {Math.abs(priceChange)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Vòng Thương Lượng</p>
            <p className="text-2xl font-bold text-purple-700">
              {summary.currentRound} / {summary.totalRounds}
            </p>
          </CardContent>
        </Card>

        {summary.finalPrice && (
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Giá Chốt ✅</p>
              <p className="text-2xl font-bold text-green-700">
                {summary.finalPrice.toLocaleString()} đ
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Negotiation Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Lịch Sử Thương Lượng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deal?.negotiationRounds.map((round, idx) => (
              <div
                key={round.id}
                className={`p-4 rounded-lg border-l-4 ${
                  round.status === "COMPLETED"
                    ? "bg-green-50 border-green-500"
                    : round.status === "RESPONDED"
                    ? "bg-blue-50 border-blue-500"
                    : "bg-yellow-50 border-yellow-500"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Vòng {round.roundNumber}</span>
                      <Badge
                        variant={
                          round.status === "COMPLETED"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {round.status === "COMPLETED"
                          ? "✅ Chốt"
                          : round.status === "RESPONDED"
                          ? "↔️ Phản Hồi"
                          : "⏳ Chờ"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-600">
                          Đề Nghị Bởi: {round.proposedBy}
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          {round.proposedPrice.toLocaleString()} đ
                        </p>
                        {round.message && (
                          <p className="text-xs text-gray-500 mt-1">
                            💬 {round.message}
                          </p>
                        )}
                      </div>

                      {round.respondedPrice && (
                        <div>
                          <p className="text-xs text-gray-600">
                            Phản Hồi Bởi: {round.respondedBy}
                          </p>
                          <p className="text-lg font-bold text-orange-600">
                            {round.respondedPrice.toLocaleString()} đ
                          </p>
                          {round.responseMessage && (
                            <p className="text-xs text-gray-500 mt-1">
                              💬 {round.responseMessage}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-500">
                    {new Date(round.createdAt).toLocaleDateString("vi-VN")}
                    <br />
                    {new Date(round.createdAt).toLocaleTimeString("vi-VN")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Action Card - Waiting for Response */}
      {!completed && isWaitingForResponse && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">
              ⏳ Chờ Phản Hồi Của Bạn
            </CardTitle>
            <CardDescription>
              Giá Hiện Tại: {summary.currentProposedPrice.toLocaleString()} đ
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                Giá Phản Hồi / Phản Đối (VND)
              </label>
              <Input
                type="number"
                placeholder="Nhập giá phản đối của bạn"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
                disabled={loading}
                className="text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Từ: {summary.initialPrice.toLocaleString()} đ | Hiện Tại:{" "}
                {summary.currentProposedPrice.toLocaleString()} đ
              </p>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">
                Thông Điệp (Tùy Chọn)
              </label>
              <Input
                type="text"
                placeholder="Ví dụ: Tôi có thể chấp nhận giá này nếu..."
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleRespond}
                disabled={loading || !counterPrice}
                className="flex-1 min-w-fit bg-orange-600 hover:bg-orange-700"
              >
                {loading ? "⏳ Đang xử lý..." : "💭 Phản Đối Giá"}
              </Button>

              {isPriceMatched && (
                <Button
                  onClick={handleAccept}
                  disabled={loading}
                  className="flex-1 min-w-fit bg-green-600 hover:bg-green-700"
                >
                  {loading ? "⏳ Đang xử lý..." : "✅ Chấp Nhận"}
                </Button>
              )}

              <Button
                onClick={handleReject}
                disabled={loading}
                variant="destructive"
                className="flex-1 min-w-fit"
              >
                {loading ? "⏳ Đang xử lý..." : "❌ Từ Chối"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Card */}
      {completed && (
        <Card className="border-green-400 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-700 mb-2">
                  ✅ Thương Lượng Thành Công!
                </h3>
                <p className="text-gray-600 mb-4">
                  Sau <span className="font-semibold">{summary.totalRounds}</span> vòng
                  thương lượng
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                <p className="text-sm text-gray-600 mb-1">Giá Chốt Cuối Cùng</p>
                <p className="text-3xl font-bold text-green-700">
                  {summary.finalPrice?.toLocaleString()} đ
                </p>
                {summary.initialPrice && (
                  <p className="text-xs text-gray-500 mt-2">
                    {priceChange > 0
                      ? `↑ Tăng ${Math.abs(priceChange)}% từ giá khởi đầu`
                      : `↓ Giảm ${Math.abs(priceChange)}% từ giá khởi đầu`}
                  </p>
                )}
              </div>

              <Button
                onClick={() => window.location.href = `/deals/${dealId}`}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                📋 Xem Chi Tiết Thương Lượng
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Change Chart */}
      {deal && deal.negotiationRounds.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>📈 Xu Hướng Giá</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.priceHistory.map((history, idx) => {
                const nextPrice =
                  idx < summary.priceHistory.length - 1
                    ? summary.priceHistory[idx + 1].proposed
                    : summary.finalPrice || history.proposed;
                const change = nextPrice - history.proposed;

                return (
                  <div key={history.round} className="flex items-center gap-3">
                    <span className="text-sm font-medium min-w-fit">
                      Round {history.round}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-8 flex items-center px-3">
                      <span className="text-sm font-bold">
                        {history.proposed.toLocaleString()} đ
                      </span>
                    </div>
                    <div className="text-sm font-semibold min-w-fit">
                      {change > 0 ? (
                        <span className="text-red-600 flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" /> +
                          {change.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-green-600 flex items-center gap-1">
                          <TrendingDown className="w-4 h-4" /> -
                          {Math.abs(change).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

                      {round.message && (
                        <p className="text-sm text-gray-700 mt-1">
                          💬 {round.message}
                        </p>
                      )}

                      {round.respondedPrice && (
                        <p className="text-sm text-blue-600 mt-2">
                          ↩️ Phản hồi ({round.respondedBy}): {round.respondedPrice.toLocaleString()} đ
                        </p>
                      )}

                      {round.responseMessage && (
                        <p className="text-sm text-gray-700 mt-1">
                          💬 {round.responseMessage}
                        </p>
                      )}
                    </div>

                    <Badge
                      variant={
                        round.status === "COMPLETED"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {round.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(round.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
