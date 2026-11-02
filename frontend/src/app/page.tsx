import { Dashboard } from "@/features/market-overview";
import { PageContainer } from "@/shared/ui";

export default function Home() {
  return (
    <PageContainer maxWidth="standard">
      <Dashboard />
    </PageContainer>
  );
}
