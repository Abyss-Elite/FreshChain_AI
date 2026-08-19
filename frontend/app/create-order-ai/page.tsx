import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { DashboardShell } from "@/components/dashboard-shell";
import { TransportCopilot } from "@/components/transport-copilot";

export const metadata: Metadata = {
  title: "Copilot vận tải | FreshChain AI",
  description: "Copilot nhập liệu tiếng Việt để tạo mới xe chở hàng và hàng hóa",
};

export default function CreateOrderWithAIPage() {
  return (
    <DashboardShell>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_45%,_#f8fafc_100%)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur">
            <div className="grid gap-8 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
              <div className="space-y-5">
                <Badge className="border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  Copilot vận tải thông minh
                </Badge>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                    Tạo xe chở hàng và hàng hóa bằng hội thoại, có lưu phiên và xác
                    nhận trước khi gửi.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                    Copilot lấy dữ liệu từ phiên đăng nhập, tự nhận dạng ý định,
                    chuẩn hóa thông tin, yêu cầu bổ sung nếu thiếu, hiển thị bản
                    xem trước và chỉ gọi API sau khi bạn xác nhận rõ ràng.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <div className="font-semibold">Lưu trạng thái</div>
                    <div>Giữ session qua nhiều lượt</div>
                  </div>
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                    <div className="font-semibold">An toàn</div>
                    <div>Xác nhận trước khi tạo</div>
                  </div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                    <div className="font-semibold">Đúng nghiệp vụ</div>
                    <div>Xe và hàng đều được hỗ trợ</div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-inner">
                <p className="text-sm font-medium text-slate-300">Quy trình hoạt động</p>
                <h2 className="mt-1 text-xl font-semibold">4 bước gọn gàng</h2>
                <div className="mt-6 space-y-4">
                  {[
                    {
                      title: "1. Nhập nội dung",
                      desc: "Bạn nói hoặc gõ yêu cầu tự nhiên về xe hoặc hàng hóa.",
                    },
                    {
                      title: "2. Copilot lưu phiên",
                      desc: "Backend giữ intent, data, status và approved để không mất ngữ cảnh.",
                    },
                    {
                      title: "3. Xem trước",
                      desc: "Copilot kiểm tra dữ liệu thiếu, chuẩn hóa và dựng bản preview.",
                    },
                    {
                      title: "4. Xác nhận tạo",
                      desc: "Chỉ sau khi bạn đồng ý, hệ thống mới gọi POST /api/trucks hoặc /api/shipments.",
                    },
                  ].map((step) => (
                    <div
                      key={step.title}
                      className="rounded-2xl border border-white/10 bg-white/10 p-4"
                    >
                      <div className="font-semibold">{step.title}</div>
                      <div className="mt-1 text-sm text-slate-300">{step.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_-25px_rgba(15,23,42,0.3)]">
            <TransportCopilot />
          </div>

          <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Mẹo sử dụng</h3>
                <p className="text-sm text-blue-800">
                  Nêu rõ loại xe/hàng, biển số, tải trọng, tuyến, thời gian và các
                  yêu cầu đặc biệt để Copilot điền chính xác hơn.
                </p>
              </div>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Không cần nhập ownerId, userId, role, accessToken</li>
                <li>• Hệ thống tự lấy thông tin người dùng từ phiên đăng nhập</li>
                <li>• Nếu thiếu dữ liệu, Copilot sẽ hỏi tiếp thay vì tự bịa</li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </DashboardShell>
  );
}
