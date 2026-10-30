import { PortfolioView } from "@/features/portfolio";

export const metadata = {
  title: "Portfolio & AI Advisory Agent | NEPSE Analytics",
  description:
    "Track your NEPSE portfolio holdings, exact WACCs, capital gains tax, and receive real-time algorithmic AI guidance on whether to sell, wait, or buy more.",
};

export default function PortfolioPage() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">
      <PortfolioView />
    </main>
  );
}
