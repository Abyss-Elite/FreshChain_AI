"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
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
  if (!value) return "Trống";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

const FIELD_LABELS: Record<string, string> = {
  type: "Loại xe",
  plateNumber: "Biển số",
  maxCapacityKg: "Tải trọng tối đa",
  remainingKg: "Tải trọng còn trống",
  refrigerated: "Xe lạnh",
  tempMin: "Nhiệt độ tối thiểu",
  tempMax: "Nhiệt độ tối đa",
  currentRoute: "Tuyến hiện tại",
  eta: "Thời gian dự kiến đến",
  cargoType: "Loại hàng",
  category: "Nhóm hàng",
  weightKg: "Khối lượng",
  requiredTempMin: "Nhiệt độ yêu cầu tối thiểu",
  requiredTempMax: "Nhiệt độ yêu cầu tối đa",
  pickup: "Điểm lấy hàng",
  dropoff: "Điểm giao hàng",
  deliveryTime: "Thời gian giao",
  proposedPrice: "Giá đề xuất",
  notes: "Ghi chú",
  strongSmell: "Có mùi mạnh",
  fragile: "Dễ vỡ",
  frozenRequired: "Đông lạnh",
  specialTemperature: "Nhiệt độ đặc biệt",
  allowCombine: "Cho phép ghép hàng",
  compatibilityNote: "Lý do không ghép",
};

function displayFieldName(name: string) {
  return FIELD_LABELS[name] || name;
}

function displayMissingFieldName(name: string) {
  switch (name) {
    case "eta":
      return "thời gian";
    case "deliveryTime":
      return "thời gian";
    case "tempMin":
    case "tempMax":
      return "nhiệt độ";
    case "plateNumber":
      return "biển số xe";
    case "currentRoute":
      return "tuyến hiện tại";
    case "type":
      return "loại xe";
    case "cargoType":
      return "loại hàng";
    case "category":
      return "nhóm hàng";
    case "pickup":
      return "điểm lấy hàng";
    case "dropoff":
      return "điểm giao hàng";
    case "proposedPrice":
      return "giá đề xuất";
    default:
      return displayFieldName(name).toLowerCase();
  }
}

function formatMissingFields(missingFields: string[]) {
  if (missingFields.length === 0) return "";
  const labels = missingFields.map(displayMissingFieldName);
  return labels.length === 1
    ? `Cần thêm ${labels[0]}.`
    : `Cần thêm: ${labels.join(", ")}.`;
}

function formatValidationError(error: string) {
  const normalized = stripDiacritics(error).toLowerCase();

  if (normalized === "eta") return "Cần thêm thời gian.";
  if (normalized === "deliverytime") return "Cần thêm thời gian giao.";
  if (normalized === "platenumber") return "Cần thêm biển số xe.";
  if (normalized === "currentroute") return "Cần thêm tuyến hiện tại.";
  if (normalized === "cargotype") return "Cần thêm loại hàng.";
  if (normalized === "category") return "Cần thêm nhóm hàng.";
  if (normalized === "pickup") return "Cần thêm điểm lấy hàng.";
  if (normalized === "dropoff") return "Cần thêm điểm giao hàng.";
  if (normalized.includes("remainingkg > maxcapacitykg")) {
    return "Tải trọng còn trống không được lớn hơn tải trọng tối đa.";
  }
  if (normalized.includes("maxcapacitykg")) {
    return "Tải trọng tối đa phải lớn hơn 0.";
  }
  if (normalized.includes("remainingkg")) {
    return "Tải trọng còn trống phải lớn hơn hoặc bằng 0.";
  }
  if (normalized.includes("weightkg")) {
    return "Khối lượng phải lớn hơn 0.";
  }
  if (normalized.includes("proposedprice")) {
    return "Giá đề xuất phải lớn hơn 0.";
  }
  if (normalized.includes("requiredtempmin > requiredtempmax")) {
    return "Nhiệt độ yêu cầu tối thiểu không được lớn hơn nhiệt độ tối đa.";
  }
  if (normalized.includes("tempmin > tempmax")) {
    return "Nhiệt độ tối thiểu không được lớn hơn nhiệt độ tối đa.";
  }

  return error;
}

function intentLabel(intent: CopilotIntent) {
  switch (intent) {
    case "CREATE_TRUCK":
      return "Tạo xe chở hàng";
    case "CREATE_SHIPMENT":
      return "Tạo hàng hóa";
    default:
      return "Chưa xác định";
  }
}

function statusLabel(status: CopilotStatus) {
  switch (status) {
    case "COLLECTING_DATA":
      return "Đang thu thập dữ liệu";
    case "VALIDATING":
      return "Đang kiểm tra dữ liệu";
    case "AWAITING_APPROVAL":
      return "Chờ xác nhận";
    case "EXECUTING":
      return "Đang gọi API";
    case "SUCCESS":
      return "Tạo thành công";
    case "FAILED":
      return "Tạo thất bại";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return "Đang thu thập dữ liệu";
  }
}

function stripDiacritics(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function normalizeVoiceTranscript(value: string) {
  let text = stripDiacritics(value).toLowerCase().replace(/\s+/g, " ").trim();

  const replacements: Array<[RegExp, string]> = [
    [/^\s*(?:ao|tao|tai)\s+hoa\b/, "Tạo hàng hóa"],
    [/^\s*(?:tao|tai)\s+hang\s+hoa\b/, "Tạo hàng hóa"],
    [/^\s*tai\s+hung\s+hoa\b/, "Tạo hàng hóa"],
    [/^\s*tai\s+van\s+hoa\b/, "Tạo hàng hóa"],
    [/^\s*ao\s+hoa\b/, "Tạo hàng hóa"],
    [/\bnhom hang\b/g, "Nhóm hàng"],
    [/\bvan hoa\b/g, "hàng hóa"],
    [/\bmung\s+(\d+)\s+thang\b/g, "gồm $1 tấn"],
    [/\bthuc pham dong thanh\b/g, "Thực phẩm đông lạnh"],
    [/\bthuc pham dong lanh\b/g, "Thực phẩm đông lạnh"],
    [/\bca dong lanh\b/g, "có đông lạnh"],
    [/\bco dong lanh\b/g, "có đông lạnh"],
    [/\bdong thanh\b/g, "đông lạnh"],
    [/\bdong lanh\b/g, "đông lạnh"],
    [/\bcang ca tho hoang\b/g, "Cảng cá Thọ Quang"],
    [/\btho hoang\b/g, "Thọ Quang"],
    [/\bhoa khanh\b/g, "Hòa Khánh"],
    [/\bda nang\b/g, "Đà Nẵng"],
    [/\bhue\b/g, "Huế"],
    [/\blay tu\b/g, "lấy tại"],
    [/\blay o\b/g, "lấy tại"],
    [/\bghe do\b/g, "giao đến"],
    [/\bdo den\b/g, "giao đến"],
    [/\bcho den\b/g, "giao đến"],
    [/\bra den\b/g, "giao đến"],
    [/\bgiao vao\b/g, "giao lúc"],
    [/\bgiao luc\b/g, "giao lúc"],
    [/\bkhong ghep hang voi cac don hang khac\b/g, "không ghép hàng với các đơn hàng khác"],
    [/\bkhong ghep voi cac don hang khac\b/g, "không ghép hàng với các đơn hàng khác"],
    [/\bkhong ghep chung\b/g, "không ghép hàng"],
    [/\bam\s+(\d+(?:[.,]\d+)?)\s+tuoi\b/g, "âm $1"],
    [/\bam\s+(\d+(?:[.,]\d+)?)\s+do\b/g, "âm $1 độ"],
    [/\b(am)\s+(\d+(?:[.,]\d+)?)\s+tuoi\b/g, "âm $2"],
    [/\b(am)\s+(\d+(?:[.,]\d+)?)\s+do\b/g, "âm $2 độ"],
    [/\bgia de xuat\b/g, "Giá đề xuất"],
    [/\bgia de xuat la\b/g, "Giá đề xuất là"],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  text = text.replace(/\b(\d{2})\s*(?:xe|x)\s*(\d{5})\b/gi, (_, prefix, serial) => {
    return `${String(prefix).toUpperCase()}C-${serial.slice(0, 3)}.${serial.slice(3)}`;
  });

  return text;
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
        value: data.maxCapacityKg != null ? `${data.maxCapacityKg} kg` : "—",
      },
      {
        label: "Tải trọng còn trống",
        value: data.remainingKg != null ? `${data.remainingKg} kg` : "—",
      },
      {
        label: "Xe lạnh",
        value:
          data.refrigerated === true
            ? "Có"
            : data.refrigerated === false
              ? "Không"
              : "—",
      },
      {
        label: "Nhiệt độ",
        value:
          data.tempMin != null || data.tempMax != null
            ? `${data.tempMin ?? "Trống"} đến ${data.tempMax ?? "Trống"} °C`
            : "Trống",
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
        value:
          data.fragile === true ? "Có" : data.fragile === false ? "Không" : "—",
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
  const didInitializeRef = useRef(false);

  useEffect(() => {
    if (didInitializeRef.current) return;
    didInitializeRef.current = true;

    let active = true;

    const load = async () => {
      try {
        const current =
          (await copilotApi.getCurrentSession()) as SessionSnapshot;
        const reset = (await copilotApi.reset(current.sessionId)) as SessionSnapshot;
        if (!active) return;

        setSessionId(reset.sessionId);
        const restoredContext: CopilotContext = {
          intent: reset.intent ?? "UNKNOWN",
          status: reset.status ?? "COLLECTING_DATA",
          api: null,
          method: "POST",
          data: {},
          missingFields: [],
          validationErrors: [],
          confirmationMessage: null,
          approved: false,
        };
        setContext(restoredContext);
        setHistory([]);
        setInput("");
        setMessage("Phiên Copilot đã được đặt lại. Hãy nhập nội dung mới.");
      } catch {
        if (!active) return;
        setSessionId(null);
        setContext(null);
        setHistory([]);
        setInput("");
        setMessage("Không thể reset phiên Copilot lúc này. Vui lòng thử lại.");
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
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition,
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
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    liveTranscriptRef.current = "";
    setSpeechError(null);
    setIsListening(true);

    let lastResultTime = Date.now();
    let silenceTimeout: NodeJS.Timeout | null = null;
    const maxSilenceDuration = 15000;
    const maxRecordingDuration = 180000;

    const resetSilenceTimeout = () => {
      if (silenceTimeout) clearTimeout(silenceTimeout);
      lastResultTime = Date.now();
      silenceTimeout = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, maxSilenceDuration);
    };

    const recordingTimeout = setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }, maxRecordingDuration);

    resetSilenceTimeout();

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result?.[0]?.transcript || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (transcript) {
        liveTranscriptRef.current = transcript;
        resetSilenceTimeout();
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (silenceTimeout) clearTimeout(silenceTimeout);
      clearTimeout(recordingTimeout);

      const transcript = normalizeVoiceTranscript(
        liveTranscriptRef.current.trim(),
      );
      if (transcript) {
        setInput((prev) =>
          prev.trim() ? `${prev.trim()} ${transcript}` : transcript,
        );
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
      if (silenceTimeout) clearTimeout(silenceTimeout);
      clearTimeout(recordingTimeout);
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
    if (!sessionId || !context || context.status !== "AWAITING_APPROVAL")
      return;

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
      setMessage("Phiên Copilot đã được đặt lại.");
      setInput("");
    } catch (error: any) {
      setMessage(error?.message || "Không thể đặt lại phiên Copilot.");
    } finally {
      setLoading(false);
    }
  };

  const canConfirm = context?.status === "AWAITING_APPROVAL" && !confirming;
  const previewItems = previewFields(context);
  const parsedFields = previewItems.filter(
    (field) => field.value !== "—" && field.value !== "Trống",
  ).length;

  return (
    <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50 to-white">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Copilot vận tải</CardTitle>
            <CardDescription>
              Tạo mới xe chở hàng hoặc hàng hóa bằng hội thoại. Copilot lưu phiên
              để bạn tiếp tục nhiều lượt mà không mất dữ liệu.
            </CardDescription>
          </div>
          {context && (
            <Badge className={statusTone(context.status)}>
              {statusLabel(context.status)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Phiên: {sessionId || "—"}</span>
            <span>•</span>
            <span>Ý định: {context ? intentLabel(context.intent) : "Chưa xác định"}</span>
            <span>•</span>
            <span>API: {context?.api || "—"}</span>
            <span>•</span>
            <span>Giọng nói: {speechSupported ? "Hỗ trợ" : "Không hỗ trợ"}</span>
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

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <div className="flex h-full min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">
              Trò chuyện
            </div>
            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
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

          <div className="flex h-full min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">
                Xem trước dữ liệu
              </div>
              {context && (
                <Badge className={statusTone(context.status)}>
                  {statusLabel(context.status)}
                </Badge>
              )}
            </div>

            {context ? (
              <div className="flex flex-1 min-h-0 flex-col space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Ý định
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {intentLabel(context.intent)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Trạng thái
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {statusLabel(context.status)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Đã phân tích
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
                      <div className="text-xs text-slate-500">
                        {field.label}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {field.value}
                      </div>
                    </div>
                  ))}
                </div>

                {context.missingFields.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <div className="mb-1 font-semibold">Cần bổ sung</div>
                    <div>{formatMissingFields(context.missingFields)}</div>
                  </div>
                )}

                {context.validationErrors.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    <div className="mb-1 font-semibold">Lỗi kiểm tra</div>
                    <div>{context.validationErrors.map(formatValidationError).join("; ")}</div>
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

