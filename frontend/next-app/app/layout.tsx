import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
    title: "HR-IMS Modern",
    description: "Human Resource & Inventory Management System",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body style={{ fontFamily: 'system-ui, sans-serif' }}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
