const nf = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const npr = (v: string | number | null | undefined) => (v == null ? "—" : nf.format(Number(v)));
export const signClass = (v: string | number | null | undefined) =>
  v == null ? "" : Number(v) > 0 ? "text-green-600" : Number(v) < 0 ? "text-red-600" : "";
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" });
