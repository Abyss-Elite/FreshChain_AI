import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { UserProvider } from "@/contexts/user-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreshChain Logistics",
  description: "Hệ thống ghép hàng và tối ưu vận tải chuỗi lạnh",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <UserProvider>
            {children}
            <Toaster richColors position="top-right" />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
