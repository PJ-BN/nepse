import { MacroDashboard } from "@/features/macro";
import { PageContainer, PageHeader } from "@/shared/ui";

export default function MacroPage() {
  return (
    <PageContainer maxWidth="standard">
      <div className="space-y-6">
        <PageHeader
          title="Macro Liquidity & Market Breadth"
          description="NRB banking system liquidity regimes, interbank rates, Relative Rotation Graphs (RRG), and McClellan market breadth oscillators."
          icon="🌐"
        />
        <MacroDashboard />
      </div>
    </PageContainer>
  );
}
