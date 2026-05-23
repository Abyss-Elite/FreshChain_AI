"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Route, Snowflake, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-3 font-bold">
          <span className="grid size-10 place-items-center rounded-lg bg-emerald-500 text-white"><Route size={20} /></span>
          FreshChain Logistics
        </Link>
        <div className="flex gap-2">
          <Link href="/login"><Button variant="ghost">Đăng nhập</Button></Link>
          <Link href="/dashboard"><Button>Vào hệ thống</Button></Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl items-center gap-8 px-5 py-8 lg:grid-cols-[1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <Badge tone="green">Ghép hàng và tối ưu vận tải chuỗi lạnh</Badge>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
            Tối ưu tải trọng xe lạnh và giảm chuyến rỗng cho vận tải nông sản.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Kết nối chủ xe còn tải trọng trống với doanh nghiệp cần vận chuyển theo tuyến, tải trọng, nhiệt độ và thời gian sẵn sàng.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/matching"><Button className="h-12 px-6">Xem ghép hàng <ArrowRight size={18} /></Button></Link>
            <Link href="/shipments/create"><Button variant="outline" className="h-12 px-6">Tạo đơn hàng</Button></Link>
          </div>
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            {["Tối ưu tải trọng 82%", "Tiết kiệm 186 triệu VND", "20 xe sẵn sàng"].map((item) => <Card key={item} className="p-4 text-sm font-semibold">{item}</Card>)}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Tuyến chuỗi lạnh đang vận hành</p>
                <h2 className="text-2xl font-bold">Lâm Đồng đến Hồ Chí Minh</h2>
              </div>
              <Badge tone="blue"><Snowflake size={12} /> 2,8°C</Badge>
            </div>
            <div className="mt-8 h-72 rounded-lg border bg-white p-5">
              <div className="relative h-full">
                <div className="absolute left-8 top-12 size-4 rounded-full bg-emerald-500" />
                <div className="absolute bottom-14 right-10 size-4 rounded-full bg-sky-500" />
                <div className="absolute left-10 top-16 h-40 w-[75%] rounded-br-[90px] border-b-4 border-r-4 border-dashed border-emerald-500/70" />
                <div className="absolute left-[48%] top-[46%] grid size-12 place-items-center rounded-lg bg-white shadow-lg"><Truck className="text-emerald-600" /></div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["Nhiệt độ phù hợp", "Trùng tuyến 96%", "Tiết kiệm 1,8 triệu"].map((item) => <div key={item} className="flex items-center gap-2 text-sm"><CheckCircle2 className="text-emerald-500" size={16} />{item}</div>)}
            </div>
          </Card>
        </motion.div>
      </section>
    </main>
  );
}
