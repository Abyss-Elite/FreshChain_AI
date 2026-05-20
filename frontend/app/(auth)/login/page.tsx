"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

export default function LoginPage() {
  const { register, handleSubmit } = useForm({ defaultValues: { email: "shipper@freshchain.vn", password: "123456" } });
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Login FreshChain AI</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(() => toast.success("Dang nhap demo thanh cong"))}>
            <Field label="Email"><Input {...register("email")} /></Field>
            <Field label="Password"><Input type="password" {...register("password")} /></Field>
            <Button className="w-full">Login</Button>
            <p className="text-center text-sm text-muted-foreground">Chua co tai khoan? <Link className="text-emerald-600" href="/register">Register</Link></p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
