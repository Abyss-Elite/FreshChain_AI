import { Metadata } from "next";
import { AIOrderAssistant } from "@/components/ai-order-assistant";

export const metadata: Metadata = {
  title: "Create Order with AI | FreshChain AI",
  description: "Tạo đơn hàng với trợ lý AI thông minh",
};

export default function CreateOrderWithAIPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🤖 Tạo Đơn Hàng Với AI
          </h1>
          <p className="text-gray-600 text-lg">
            Trợ lý AI sẽ hướng dẫn bạn tạo đơn hàng hoàn chỉnh chỉ trong vài phút
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-semibold text-gray-900 mb-1">Hỏi Tương Tác</h3>
            <p className="text-sm text-gray-600">
              AI hỏi từng câu một, dễ hiểu và tự nhiên
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <div className="text-3xl mb-2">✅</div>
            <h3 className="font-semibold text-gray-900 mb-1">Kiểm Tra Tự Động</h3>
            <p className="text-sm text-gray-600">
              Không bỏ sót thông tin bắt buộc
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-1">Nhanh Chóng</h3>
            <p className="text-sm text-gray-600">
              Chỉ 10-15 câu hỏi, tất cả hoàn tất
            </p>
          </div>
        </div>

        {/* AI Assistant Component */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <AIOrderAssistant />
        </div>

        {/* Help Text */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Mẹo Sử Dụng:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Trả lời đầy đủ để AI hiểu chính xác thông tin của bạn</li>
            <li>✓ Nếu sai, có thể chỉnh sửa lại trước khi gửi</li>
            <li>✓ Kiểm tra kỹ thông tin ở bước xác nhận cuối</li>
            <li>✓ Sau khi gửi, chủ xe sẽ thấy đơn hàng của bạn</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
