import "@/app/globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";

const appDomain = "https://poidh.vercel.app";
const heroImageUrl = `${appDomain}/media/hero.png`;
const splashImageUrl = `${appDomain}/media/splash.png`;

const miniAppEmbed = {
  version: "1",
  imageUrl: heroImageUrl,
  button: {
    title: "Pics Or It Didn't Happen",
    action: {
      type: "launch_miniapp" as const,
      name: "POIDH",
      url: appDomain,
      splashImageUrl,
      splashBackgroundColor: "#000000",
    },
  },
};

export const metadata: Metadata = {
  title: "POIDH - Pics Or It Didn't Happen",
  description: "Create bounties and prove it with pics on Base.",
  openGraph: {
    title: "POIDH",
    description: "Create bounties and prove it with pics. Pics Or It Didn't Happen.",
    url: appDomain,
    images: [
      {
        url: heroImageUrl,
      },
    ],
  },
  other: {
    "fc:miniapp": JSON.stringify(miniAppEmbed),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
