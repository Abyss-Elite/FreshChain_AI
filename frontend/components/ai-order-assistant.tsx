"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Progress } from "./ui/progress";
import { AlertCircle, CheckCircle2, Edit2, Send } from "lucide-react";

interface AssistantQuestion {
  question: string;
  fieldName: string;
  type: "text" | "number" | "date" | "select" | "checkbox";
  options?: string[];
  placeholder?: string;
  required: boolean;
}

interface AssistantSession {
  sessionId: string;
  status: string;
  completenessScore: number;
  isComplete: boolean;
  nextQuestion: AssistantQuestion | null;
  summary: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ReviewData {
  summary: Record<string, any>;
  completenessScore: number;
  conversationHistory: any[];
}

export function AIOrderAssistant() {
  const [session, setSession] = useState<AssistantSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentValue, setCurrentValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/assistant/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      setSession(data);

      // Add initial greeting
      if (data.nextQuestion) {
        setMessages([
          {
            role: "assistant",
            content: `Xin chào! Tôi là trợ lý AI của FreshChain. Tôi sẽ giúp bạn tạo đơn hàng hoàn chỉnh.\n\n${data.nextQuestion.question}`,
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to initialize session:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!session || !session.nextQuestion || !currentValue) return;

    try {
      setLoading(true);

      // Add user message
      setMessages((prev) => [...prev, { role: "user", content: currentValue }]);

      // Send response to assistant
      const response = await fetch(
        `/api/assistant/sessions/${session.sessionId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            fieldName: session.nextQuestion.fieldName,
            value: currentValue,
            message: currentValue,
          }),
        },
      );

      const data = await response.json();

      // Update session
      setSession((prev) => ({
        ...prev!,
        completenessScore: data.completenessScore,
        isComplete: data.isComplete,
        nextQuestion: data.nextQuestion,
        summary: data.nextMessage,
      }));

      // Add assistant message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.nextMessage,
        },
      ]);

      // If complete, fetch review data
      if (data.isComplete) {
        const reviewResponse = await fetch(
          `/api/assistant/sessions/${session.sessionId}/review`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const reviewData = await reviewResponse.json();
        setReviewData(reviewData);
      }

      setCurrentValue("");
    } catch (error) {
      console.error("Failed to send response:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!session) return;

    try {
      setLoading(true);

      const response = await fetch(
        `/api/assistant/sessions/${session.sessionId}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `✅ Tuyệt vời! Đơn hàng của bạn đã được tạo thành công.\n\nMã đơn hàng: ${data.shipmentId}\n\nBước tiếp theo: Hãy chờ các chủ xe gửi yêu cầu hoặc bạn có thể chủ động tìm xe phù hợp.`,
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to submit order:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <div className="p-4">Đang khởi tạo...</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>🤖 Trợ Lý AI - Tạo Đơn Hàng</CardTitle>
          <CardDescription>
            {session.isComplete
              ? "Đơn hàng hoàn chỉnh! Hãy kiểm tra lại trước khi gửi."
              : `Hoàn thành: ${Math.round(session.completenessScore)}%`}
          </CardDescription>
          <Progress value={session.completenessScore} className="mt-4" />
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Messages */}
          <div className="space-y-3 h-80 overflow-y-auto border rounded-lg p-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500">
                Bắt đầu cuộc hội thoại...
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-300 text-gray-800"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Section */}
          {!session.isComplete && !submitted && session.nextQuestion && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                {session.nextQuestion.question}
              </label>

              {/* Text Input */}
              {session.nextQuestion.type === "text" && (
                <Input
                  type="text"
                  placeholder={session.nextQuestion.placeholder}
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  disabled={loading}
                />
              )}

              {/* Number Input */}
              {session.nextQuestion.type === "number" && (
                <Input
                  type="number"
                  placeholder={session.nextQuestion.placeholder}
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  disabled={loading}
                />
              )}

              {/* Date Input */}
              {session.nextQuestion.type === "date" && (
                <Input
                  type="date"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  disabled={loading}
                />
              )}

              {/* Select */}
              {session.nextQuestion.type === "select" && (
                <Select value={currentValue} onValueChange={setCurrentValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn một lựa chọn..." />
                  </SelectTrigger>
                  <SelectContent>
                    {session.nextQuestion.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Checkbox */}
              {session.nextQuestion.type === "checkbox" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={currentValue === "true"}
                    onCheckedChange={(checked) =>
                      setCurrentValue(checked ? "true" : "false")
                    }
                  />
                  <label className="text-sm cursor-pointer">
                    {session.nextQuestion.question}
                  </label>
                </div>
              )}

              <Button
                onClick={handleSubmitResponse}
                disabled={loading || !currentValue}
                className="w-full"
              >
                {loading ? "Đang xử lý..." : "Tiếp tục"}
              </Button>
            </div>
          )}

          {/* Review Section */}
          {session.isComplete && reviewData && !submitted && (
            <div className="space-y-4">
              <h3 className="font-semibold">📋 Xác Nhận Thông Tin Đơn Hàng</h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Loại hàng:</span>
                  <p className="text-gray-600">
                    {reviewData.summary.cargoType}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Phân loại:</span>
                  <p className="text-gray-600">{reviewData.summary.category}</p>
                </div>
                <div>
                  <span className="font-medium">Khối lượng:</span>
                  <p className="text-gray-600">
                    {reviewData.summary.weightKg} kg
                  </p>
                </div>
                <div>
                  <span className="font-medium">Giá dự kiến:</span>
                  <p className="text-gray-600">
                    {reviewData.summary.proposedPrice?.toLocaleString()} đ
                  </p>
                </div>
                <div>
                  <span className="font-medium">Lấy hàng:</span>
                  <p className="text-gray-600">{reviewData.summary.pickup}</p>
                </div>
                <div>
                  <span className="font-medium">Giao hàng:</span>
                  <p className="text-gray-600">{reviewData.summary.dropoff}</p>
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Thời gian giao:</span>
                  <p className="text-gray-600">
                    {new Date(reviewData.summary.deliveryTime).toLocaleString(
                      "vi-VN",
                    )}
                  </p>
                </div>
              </div>

              {reviewData.summary.notes && (
                <div>
                  <span className="font-medium">Ghi chú:</span>
                  <p className="text-gray-600">{reviewData.summary.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitOrder}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Đang gửi..." : "✅ Gửi Đơn Hàng"}
                </Button>
                <Button
                  onClick={() => setCurrentValue("")}
                  variant="outline"
                  className="flex-1"
                >
                  ✏️ Chỉnh Sửa
                </Button>
              </div>
            </div>
          )}

          {/* Completion Message */}
          {submitted && (
            <div className="bg-green-100 border border-green-400 rounded-lg p-4 text-center">
              <p className="text-green-800 font-semibold">
                ✅ Đơn hàng đã được tạo thành công!
              </p>
              <p className="text-green-700 text-sm mt-1">
                Bạn sẽ nhận được thông báo khi có chủ xe quan tâm.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
