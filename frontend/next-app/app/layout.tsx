import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { readLocaleFromCookies } from "@/lib/i18n/server";

export const metadata: Metadata = {
    title: "HR-IMS Modern",
    description: "Human Resource & Inventory Management System",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const initialLocale = await readLocaleFromCookies();

    return (
        <html lang={initialLocale}>
            <body style={{ fontFamily: 'system-ui, sans-serif' }}>
                <Providers initialLocale={initialLocale}>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
