import { PortfolioView } from "@/features/portfolio";
import { PageContainer } from "@/shared/ui";

export const metadata = {
  title: "Portfolio & AI Advisory Agent | NEPSE Analytics",
  description:
    "Track your NEPSE portfolio holdings, exact WACCs, capital gains tax, and receive real-time algorithmic AI guidance on whether to sell, wait, or buy more.",
};

export default function PortfolioPage() {
  return (
    <PageContainer maxWidth="standard">
      <PortfolioView />
    </PageContainer>
  );
}
