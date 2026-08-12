"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { copilotApi } from "@/lib/api";
import { Loader2, Mic, MicOff, RotateCcw, Sparkles } from "lucide-react";

type CopilotIntent = "CREATE_TRUCK" | "CREATE_SHIPMENT" | "UNKNOWN";
type CopilotStatus =
  | "COLLECTING_DATA"
  | "VALIDATING"
  | "AWAITING_APPROVAL"
  | "EXECUTING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED";

interface CopilotContext {
  intent: CopilotIntent;
  status: CopilotStatus;
  api: "/api/trucks" | "/api/shipments" | null;
  method: "POST";
  data: Record<string, any>;
  missingFields: string[];
  validationErrors: string[];
  confirmationMessage: string | null;
  approved: boolean;
}

interface CopilotResponse {
  sessionId: string;
  context: CopilotContext;
  message: string;
  rawInput: string;
}

interface SessionSnapshot {
  sessionId: string;
  intent: CopilotIntent;
  status: CopilotStatus;
  approved: boolean;
  api: string | null;
  method: string;
  data: Record<string, any>;
  missingFields: string[];
  validationErrors: string[];
  confirmationMessage: string | null;
}

interface ChatItem {
  role: "user" | "assistant";
  content: string;
}

function formatDateTime(value: any) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function previewFields(context: CopilotContext | null) {
  if (!context) return [] as Array<{ label: string; value: string }>;

  const data = context.data || {};

  if (context.intent === "CREATE_TRUCK") {
    return [
      { label: "Loại xe", value: data.type || "—" },
      { label: "Biển số", value: data.plateNumber || "—" },
      {
        label: "Tải trọng tối đa",
        value:
          data.maxCapacityKg != null ? `${data.maxCapacityKg} kg` : "—",
      },
      {
        label: "Tải trọng còn trống",
        value: data.remainingKg != null ? `${data.remainingKg} kg` : "—",
      },
      { label: "Xe lạnh", value: data.refrigerated === true ? "Có" : data.refrigerated === false ? "Không" : "—" },
      {
        label: "Nhiệt độ",
        value:
          data.tempMin != null || data.tempMax != null
            ? `${data.tempMin ?? "—"} đến ${data.tempMax ?? "—"} °C`
            : "—",
      },
      { label: "Tuyến hiện tại", value: data.currentRoute || "—" },
      { label: "Thời gian dự kiến đến", value: formatDateTime(data.eta) },
    ];
  }

  if (context.intent === "CREATE_SHIPMENT") {
    return [
      { label: "Loại hàng", value: data.cargoType || "—" },
      { label: "Nhóm hàng", value: data.category || "—" },
      {
        label: "Khối lượng",
        value: data.weightKg != null ? `${data.weightKg} kg` : "—",
      },
      {
        label: "Nhiệt độ yêu cầu",
        value:
          data.requiredTempMin != null || data.requiredTempMax != null
            ? `${data.requiredTempMin ?? "—"} đến ${data.requiredTempMax ?? "—"} °C`
            : "—",
      },
      { label: "Điểm lấy hàng", value: data.pickup || "—" },
      { label: "Điểm giao hàng", value: data.dropoff || "—" },
      { label: "Thời gian giao", value: formatDateTime(data.deliveryTime) },
      {
        label: "Giá đề xuất",
        value:
          data.proposedPrice != null
            ? `${Number(data.proposedPrice).toLocaleString("vi-VN")} đ`
            : "—",
      },
      {
        label: "Hàng dễ vỡ",
        value: data.fragile === true ? "Có" : data.fragile === false ? "Không" : "—",
      },
      {
        label: "Hàng đông lạnh",
        value:
          data.frozenRequired === true
            ? "Có"
            : data.frozenRequired === false
              ? "Không"
              : "—",
      },
      {
        label: "Có mùi mạnh",
        value:
          data.strongSmell === true
            ? "Có"
            : data.strongSmell === false
              ? "Không"
              : "—",
      },
      {
        label: "Cho phép ghép hàng",
        value:
          data.allowCombine === true
            ? "Có"
            : data.allowCombine === false
              ? "Không"
              : "—",
      },
      { label: "Ghi chú", value: data.notes || "—" },
    ];
  }

  return [];
}

function statusTone(status: CopilotStatus) {
  switch (status) {
    case "AWAITING_APPROVAL":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "EXECUTING":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "SUCCESS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "FAILED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "CANCELLED":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
}

export function TransportCopilot() {
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<CopilotContext | null>(null);
  const [message, setMessage] = useState<string>(
    "Nhập yêu cầu tự nhiên để tạo xe chở hàng hoặc hàng hóa.",
  );
  const [history, setHistory] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const current = (await copilotApi.getCurrentSession()) as SessionSnapshot;
        if (!active) return;

        setSessionId(current.sessionId);
        const restoredContext: CopilotContext = {
          intent: current.intent,
          status: current.status,
          api: (current.api as "/api/trucks" | "/api/shipments" | null) ?? null,
          method: "POST",
          data: current.data || {},
          missingFields: current.missingFields || [],
          validationErrors: current.validationErrors || [],
          confirmationMessage: current.confirmationMessage,
          approved: current.approved,
        };
        setContext(restoredContext);
        setMessage(
          restoredContext.confirmationMessage ||
            "Phiên Copilot đã sẵn sàng. Hãy nhập nội dung bạn muốn tạo.",
        );
      } catch {
        if (!active) return;
        setMessage("Không tải được phiên Copilot hiện tại.");
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported = Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition,
    );
    setSpeechSupported(supported);

    return () => {
      const recognition = recognitionRef.current;
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const appendMessage = (role: ChatItem["role"], content: string) => {
    setHistory((prev) => [...prev, { role, content }]);
  };

  const stopDictation = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  const startDictation = () => {
    if (!speechSupported) {
      setSpeechError("Trình duyệt này chưa hỗ trợ voice-to-text.");
      return;
    }

    if (isListening) {
      stopDictation();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError("Trình duyệt này chưa hỗ trợ voice-to-text.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    liveTranscriptRef.current = "";
    setSpeechError(null);
    setIsListening(true);

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      liveTranscriptRef.current = transcript.trim();
    };

    recognition.onerror = (event: any) => {
      setSpeechError(event?.error ? `Voice error: ${event.error}` : "Không thể nhận diện giọng nói.");
      setIsListening(false);
      liveTranscriptRef.current = "";
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;

      const transcript = liveTranscriptRef.current.trim();
      if (transcript) {
        setInput((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      }
      liveTranscriptRef.current = "";
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      setSpeechError("Không thể khởi động ghi âm.");
      setIsListening(false);
      recognitionRef.current = null;
    }
  };

  const handleParse = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      appendMessage("user", trimmed);
      const response = (await copilotApi.parse({
        message: trimmed,
        sessionId: sessionId ?? undefined,
        currentDateTime: new Date().toISOString(),
      })) as CopilotResponse;

      setSessionId(response.sessionId);
      setContext(response.context);
      setMessage(response.message);
      appendMessage("assistant", response.message);
      setInput("");
    } catch (error: any) {
      const fallback = error?.message || "Không thể xử lý yêu cầu Copilot.";
      setMessage(fallback);
      appendMessage("assistant", fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!sessionId || !context || context.status !== "AWAITING_APPROVAL") return;

    setConfirming(true);
    try {
      const result = (await copilotApi.execute({
        sessionId,
        approved: true,
      })) as any;

      const successMessage =
        result?.message ||
        (context.intent === "CREATE_TRUCK"
          ? "Xe đã được tạo thành công."
          : "Hàng hóa đã được tạo thành công.");
      setMessage(successMessage);
      appendMessage("assistant", successMessage);

      setContext((prev) =>
        prev
          ? {
              ...prev,
              status: "SUCCESS",
              approved: true,
            }
          : prev,
      );
    } catch (error: any) {
      const fallback = error?.message || "Không thể tạo dữ liệu lúc này.";
      setMessage(fallback);
      appendMessage("assistant", fallback);
      setContext((prev) => (prev ? { ...prev, status: "FAILED" } : prev));
    } finally {
      setConfirming(false);
    }
  };

  const handleReset = async () => {
    if (!sessionId) {
      setInput("");
      setContext(null);
      setHistory([]);
      setMessage("Bắt đầu phiên Copilot mới.");
      return;
    }

    setLoading(true);
    try {
      const result = (await copilotApi.reset(sessionId)) as SessionSnapshot;
      setSessionId(result.sessionId);
      setContext({
        intent: result.intent,
        status: result.status,
        api: null,
        method: "POST",
        data: {},
        missingFields: [],
        validationErrors: [],
        confirmationMessage: null,
        approved: result.approved,
      });
      setHistory([]);
      setMessage("Phiên Copilot đã được reset.");
      setInput("");
    } catch (error: any) {
      setMessage(error?.message || "Không thể reset phiên Copilot.");
    } finally {
      setLoading(false);
    }
  };

  const canConfirm = context?.status === "AWAITING_APPROVAL" && !confirming;
  const previewItems = previewFields(context);
  const parsedFields = previewItems.filter((field) => field.value !== "â€”").length;

  return (
    <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50 to-white">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Transport Copilot</CardTitle>
            <CardDescription>
              Tạo mới xe chở hàng hoặc hàng hóa bằng hội thoại. Copilot lưu
              session để bạn tiếp tục nhiều lượt mà không mất dữ liệu.
            </CardDescription>
          </div>
          {context && (
            <Badge className={statusTone(context.status)}>
              {context.status}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Session: {sessionId || "—"}</span>
            <span>•</span>
            <span>Intent: {context?.intent || "UNKNOWN"}</span>
            <span>•</span>
            <span>API: {context?.api || "—"}</span>
            <span>•</span>
            <span>
              Voice: {speechSupported ? "Hỗ trợ" : "Không hỗ trợ"}
            </span>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ví dụ: Tạo xe tải đông lạnh biển số 43C-123.45, tải trọng 5 tấn, còn trống 3 tấn, tuyến Đà Nẵng đi Huế, nhiệt độ từ âm 18 đến âm 10 độ, dự kiến đến lúc 9 giờ sáng mai."
            className="min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={handleParse} disabled={loading || !input.trim()}>
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              Phân tích yêu cầu
            </Button>
            <Button
              variant="outline"
              onClick={startDictation}
              disabled={loading}
            >
              {isListening ? (
                <MicOff className="mr-2 size-4" />
              ) : (
                <Mic className="mr-2 size-4" />
              )}
              {isListening ? "Dừng ghi âm" : "Nói để nhập"}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={loading}>
              <RotateCcw className="mr-2 size-4" />
              Phiên mới
            </Button>
            <Button
              variant="outline"
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              {confirming ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Xác nhận tạo
            </Button>
          </div>

          {isListening && (
            <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
              Đang nghe... hãy nói yêu cầu của bạn bằng tiếng Việt.
            </div>
          )}

          {speechError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {speechError}
            </div>
          )}

          {!speechSupported && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Trình duyệt hiện tại không hỗ trợ voice-to-text. Bạn vẫn có thể
              nhập bằng tay.
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">
              Trò chuyện
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Chưa có hội thoại nào. Nhập yêu cầu ở trên để bắt đầu.
                </div>
              ) : (
                history.map((item, index) => (
                  <div
                    key={`${item.role}-${index}`}
                    className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                      item.role === "user"
                        ? "ml-10 bg-indigo-600 text-white"
                        : "mr-10 border border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  >
                    {item.content}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">
                Xem trước dữ liệu
              </div>
              {context?.confirmationMessage && (
                <Badge className="border border-amber-200 bg-amber-50 text-amber-700">
                  Chờ xác nhận
                </Badge>
              )}
            </div>

            {context ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Intent
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {context.intent}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Trạng thái
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {context.status}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Đã parse
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {parsedFields}/{previewItems.length}
                    </div>
                  </div>
                </div>

                {previewItems.length > 0 && (
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Chi tiết đã trích xuất
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {previewItems.map((field) => (
                    <div
                      key={field.label}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                    >
                      <div className="text-xs text-slate-500">{field.label}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {field.value}
                      </div>
                    </div>
                  ))}
                </div>

                {context.missingFields.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <div className="mb-1 font-semibold">Thiếu dữ liệu</div>
                    <div>{context.missingFields.join(", ")}</div>
                  </div>
                )}

                {context.validationErrors.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    <div className="mb-1 font-semibold">Lỗi kiểm tra</div>
                    <div>{context.validationErrors.join("; ")}</div>
                  </div>
                )}

                {context.confirmationMessage && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800 whitespace-pre-line">
                    {context.confirmationMessage}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Copilot sẽ hiển thị bản xem trước khi dữ liệu đủ và hợp lệ.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          {message}
        </div>
      </CardContent>
    </Card>
  );
}
