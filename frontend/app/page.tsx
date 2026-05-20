"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Route, Snowflake, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-3 font-bold"><span className="grid size-10 place-items-center rounded-lg bg-emerald-500 text-white"><Route size={20} /></span>FreshChain AI</Link>
        <div className="flex gap-2">
          <Link href="/login"><Button variant="ghost">Login</Button></Link>
          <Link href="/dashboard"><Button>Mo demo</Button></Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-82px)] max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <Badge tone="green">AI Matching & Logistics Optimization</Badge>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
            Toi uu tai trong xe lanh va giam xe chay rong cho chuoi nong san tuoi.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            FreshChain AI ket noi chu xe con tai trong trong voi doanh nghiep can van chuyen nong san, thuy san tuoi song theo rule-based matching, nhiet do va tuyen duong.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/matching"><Button className="h-12 px-6">Xem AI Matching <ArrowRight size={18} /></Button></Link>
            <Link href="/shipments/create"><Button variant="outline" className="h-12 px-6">Tao don demo</Button></Link>
          </div>
          <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
            {["82% load optimization", "186M VND saved", "20 xe demo"].map((item) => <Card key={item} className="p-4 text-sm font-semibold">{item}</Card>)}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative">
          <Card className="p-5 shadow-glow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Live cold-chain route</p>
                <h2 className="text-2xl font-bold">Da Lat to TP.HCM</h2>
              </div>
              <Badge tone="blue"><Snowflake size={12} /> 2.8C</Badge>
            </div>
            <div className="mt-8 h-72 rounded-lg border bg-[linear-gradient(135deg,rgba(16,185,129,.16),rgba(14,165,233,.14))] p-5">
              <div className="relative h-full">
                <div className="absolute left-8 top-12 size-4 rounded-full bg-emerald-500" />
                <div className="absolute bottom-14 right-10 size-4 rounded-full bg-sky-500" />
                <div className="absolute left-10 top-16 h-40 w-[75%] rounded-br-[90px] border-b-4 border-r-4 border-dashed border-emerald-500/70" />
                <div className="absolute left-[48%] top-[46%] grid size-12 place-items-center rounded-lg bg-card shadow-lg"><Truck className="text-emerald-600" /></div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["Temperature compatible", "Route overlap 96%", "Savings 1.8M"].map((x) => <div key={x} className="flex items-center gap-2 text-sm"><CheckCircle2 className="text-emerald-500" size={16} />{x}</div>)}
            </div>
          </Card>
        </motion.div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-12 md:grid-cols-3">
        {[
          ["AI Matching", "Cham diem xe bang tuyen duong, tai trong, ETA va nhiet do."],
          ["Compatibility", "Canh bao smell conflict, temperature conflict, fragile cargo."],
          ["Realtime Tracking", "Gia lap GPS, ETA va nhiet do xe lanh theo thoi gian thuc."]
        ].map(([title, desc]) => <Card key={title} className="p-6"><h3 className="text-xl font-bold">{title}</h3><p className="mt-2 text-muted-foreground">{desc}</p></Card>)}
      </section>
      <footer className="border-t px-5 py-8 text-center text-sm text-muted-foreground">FreshChain AI demo platform - built for startup pitching</footer>
    </main>
  );
}
