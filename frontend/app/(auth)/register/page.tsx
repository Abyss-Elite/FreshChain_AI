"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { authApi } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm({
    defaultValues: { name: "", company: "", email: "", password: "", role: "SHIPPER" },
  });

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tạo tài khoản</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              try {
                const data = await authApi.register(values);
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                toast.success("Tạo tài khoản thành công");
                router.push("/matching");
              } catch (error: any) {
                toast.error(error.message || "Không thể tạo tài khoản");
              }
            })}
          >
            <Field label="Họ tên"><Input {...register("name")} /></Field>
            <Field label="Công ty"><Input {...register("company")} /></Field>
            <Field label="Email"><Input type="email" {...register("email")} /></Field>
            <Field label="Mật khẩu"><Input type="password" {...register("password")} /></Field>
            <Field label="Vai trò">
              <Select {...register("role")}>
                <option value="SHIPPER">Chủ Nhà Xe</option>
                <option value="CARRIER">Chủ Hàng</option>
                <option value="ADMIN">Quản trị</option>
              </Select>
            </Field>
            <Button className="w-full" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Đang xử lý..." : "Đăng ký"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Đã có tài khoản? <Link className="text-emerald-600" href="/login">Đăng nhập</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
