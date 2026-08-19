"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { authApi } from "@/lib/api";
import { useUser } from "@/contexts/user-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useUser();
  const { register, handleSubmit, formState } = useForm({
    defaultValues: { email: "shipper@freshchain.vn", password: "123456" },
  });

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Đăng nhập FreshChain Logistics</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              try {
                const data = await authApi.login(values.email, values.password);
                login(data.user, data.token);
                toast.success("Đăng nhập thành công");
                router.push("/matching");
              } catch (error: any) {
                toast.error(error.message || "Không thể đăng nhập");
              }
            })}
          >
            <Field label="Email"><Input {...register("email")} /></Field>
            <Field label="Mật khẩu"><Input type="password" {...register("password")} /></Field>
            <Button className="w-full" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Chưa có tài khoản? <Link className="text-emerald-600" href="/register">Đăng ký</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
