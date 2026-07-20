import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "Daylight — Personal Planner",
  description: "A calm, private planner protected by GitHub sign-in.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Daylight",
    description: "Your time, softly held.",
    images: [{ url: "/og.png", width: 1731, height: 909 }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
