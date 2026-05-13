export type Investment = {
  id: string;
  itemId: string;
  name: string | null;
  type: string | null;
  subtype: string | null;
  balance: number | null;
  currencyCode: string | null;
  value: number | null;
  quantity: number | null;
  amount: number | null;
  taxes: number | null;
  taxes2: number | null;
  amountProfit: number | null;
  amountWithdrawal: number | null;
  amountOriginal: number | null;
  // taxas e retorno
  lastMonthRate: number | null;
  lastTwelveMonthsRate: number | null;
  annualRate: number | null;
  fixedAnnualRate: number | null;
  rate: number | null;
  rateType: string | null;
  // identificação
  code: string | null;
  isin: string | null;
  number: string | null;
  metadata: string | null;
  // emissão
  issuer: string | null;
  issuerCNPJ: string | null;
  issueDate: string | null;
  purchaseDate: string | null;
  dueDate: string | null;
  date: string | null;
  owner: string | null;
  institution: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  syncedAt: string;
};
