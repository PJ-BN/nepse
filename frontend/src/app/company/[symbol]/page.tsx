import { CompanyPage } from "@/features/company";

export default async function Page({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <CompanyPage symbol={decodeURIComponent(symbol).toUpperCase()} />;
}
