import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

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
  finalPrice?: number;
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

  useEffect(() => {
    loadDealData();
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
      const latestRound = deal.negotiationRounds[deal.negotiationRounds.length - 1];

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
        alert(`✅ Thương lượng thành công! Giá chốt: ${data.finalPrice}`);
      }

      // Reload data
      await loadDealData();
      setCounterPrice("");
      setCounterMessage("");
    } catch (error) {
      console.error("Failed to respond:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!deal) return;

    try {
      setLoading(true);
      const latestRound = deal.negotiationRounds[deal.negotiationRounds.length - 1];

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
        alert(
          `✅ ${data.message}`
        );
      }

      // Reload data
      await loadDealData();
    } catch (error) {
      console.error("Failed to accept:", error);
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
    } finally {
      setLoading(false);
    }
  };

  if (!summary) {
    return <div className="p-4">Đang tải dữ liệu...</div>;
  }

  const latestRound = deal?.negotiationRounds[deal.negotiationRounds.length - 1];
  const isWaitingForResponse =
    latestRound?.status === "WAITING_FOR_COUNTER";
  const isPriceMatched = latestRound?.proposedPrice === latestRound?.respondedPrice;

  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>💰 Thương Lượng Giá</CardTitle>
          <CardDescription>
            Round {summary.currentRound} of {summary.totalRounds}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Giá ban đầu</p>
              <p className="text-2xl font-bold text-blue-600">
                {summary.initialPrice.toLocaleString()} đ
              </p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Giá hiện tại</p>
              <p className="text-2xl font-bold text-orange-600">
                {summary.currentProposedPrice.toLocaleString()} đ
              </p>
            </div>

            {summary.finalPrice && (
              <div className="bg-green-50 p-4 rounded-lg col-span-2">
                <p className="text-sm text-gray-600">Giá chốt</p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.finalPrice.toLocaleString()} đ ✅
                </p>
              </div>
            )}
          </div>

          {/* Price History */}
          <div>
            <h3 className="font-semibold mb-3">📊 Lịch sử thương lượng</h3>
            <div className="space-y-2">
              {summary.priceHistory.map((history) => (
                <div
                  key={history.round}
                  className="flex justify-between items-center p-3 bg-gray-100 rounded"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">Round {history.round}</p>
                    <p className="text-xs text-gray-600">
                      Đề nghị bởi: {history.by}
                    </p>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Đề nghị</p>
                      <p className="font-semibold">
                        {history.proposed.toLocaleString()} đ
                      </p>
                    </div>

                    {history.counter && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Phản hồi</p>
                        <p className="font-semibold text-blue-600">
                          {history.counter.toLocaleString()} đ
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Trạng thái</p>
            <div className="flex items-center gap-2 mt-2">
              {completed ? (
                <Badge className="bg-green-600">Hoàn thành</Badge>
              ) : isWaitingForResponse ? (
                <Badge className="bg-yellow-600">Chờ phản hồi</Badge>
              ) : (
                <Badge className="bg-blue-600">Đang thương lượng</Badge>
              )}

              {summary.lastCounterPrice && (
                <span className="text-sm">
                  Giá cuối cùng: {summary.lastCounterPrice.toLocaleString()} đ
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Negotiation Action Card */}
      {!completed && isWaitingForResponse && (
        <Card>
          <CardHeader>
            <CardTitle>📝 Giá Đề Nghị Hiện Tại</CardTitle>
            <CardDescription>
              Giá hiện tại: {summary.currentProposedPrice.toLocaleString()} đ
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Giá Phản Hồi / Phản Đối (VND)
              </label>
              <Input
                type="number"
                placeholder="Nhập giá phản đối của bạn"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Thông Điệp (Tùy Chọn)</label>
              <Input
                type="text"
                placeholder="Thêm tin nhắn để giải thích giá của bạn"
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleRespond}
                disabled={loading || !counterPrice}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Đang xử lý..." : "💭 Phản Đối Giá"}
              </Button>

              {isPriceMatched && (
                <Button
                  onClick={handleAccept}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Đang xử lý..." : "✅ Chấp Nhận"}
                </Button>
              )}

              <Button
                onClick={handleReject}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                {loading ? "Đang xử lý..." : "❌ Từ Chối"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Card */}
      {completed && (
        <Card className="border-green-500">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-green-600 mb-2">
                ✅ Thương Lượng Hoàn Thành!
              </h3>
              <p className="text-gray-600">
                Giá chốt: <span className="text-2xl font-bold text-green-600">
                  {summary.finalPrice?.toLocaleString()} đ
                </span>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Sau {summary.totalRounds} vòng thương lượng
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Rounds Detail */}
      {deal && deal.negotiationRounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🔍 Chi Tiết Tất Cả Vòng Thương Lượng</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {deal.negotiationRounds.map((round) => (
                <div key={round.id} className="border-l-4 border-gray-300 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">
                        Round {round.roundNumber} - {round.proposedBy}
                      </p>
                      <p className="text-sm text-gray-600">
                        Đề nghị: {round.proposedPrice.toLocaleString()} đ
                      </p>

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
