import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AIAssistantCard() {
  return (
    <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              AI Order Assistant
            </CardTitle>
            <CardDescription>
              Tạo đơn hàng với trợ lý thông minh
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Không cần điền biểu mẫu phức tạp. AI sẽ hỏi từng câu một để giúp bạn tạo đơn hàng hoàn chỉnh.
        </p>

        <div className="space-y-2 mb-4 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Hỏi tương tác, dễ hiểu</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Kiểm tra tự động, không bỏ sót</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Chỉ 10-15 câu hỏi, tất cả xong</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Xem lại toàn bộ thông tin trước gửi</span>
          </div>
        </div>

        <Link href="/create-order-ai">
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            🚀 Bắt Đầu Với AI
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function AIAssistantInfo() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-4">
        📊 Cách AI Assistant Hoạt Động
      </h3>

      <div className="space-y-3">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold">
              1
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Khởi Tạo Session</h4>
            <p className="text-sm text-gray-600">
              Bạn bắt đầu cuộc hội thoại với AI Assistant
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold">
              2
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">AI Hỏi Câu Hỏi</h4>
            <p className="text-sm text-gray-600">
              Mỗi lần một câu, AI sẽ hỏi thông tin cần thiết cho đơn hàng
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold">
              3
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Bạn Trả Lời</h4>
            <p className="text-sm text-gray-600">
              Nhập thông tin hoặc chọn từ dropdown. Progress bar cập nhật tức thì
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold">
              4
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">100% Hoàn Chỉnh</h4>
            <p className="text-sm text-gray-600">
              Khi hết thông tin bắt buộc, AI hiển thị form xác nhận toàn bộ dữ liệu
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-bold">
              ✓
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Gửi Đơn Hàng</h4>
            <p className="text-sm text-gray-600">
              Click "Gửi Đơn Hàng" → Đơn được tạo và sẵn sàng cho xe tải tìm kiếm
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
