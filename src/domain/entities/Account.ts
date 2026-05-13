export type Account = {
  id: string;
  itemId: string;
  type: string | null;
  subtype: string | null;
  name: string | null;
  balance: number | null;
  currencyCode: string | null;
  number: string | null;
  owner: string | null;
  taxNumber: string | null;
  marketingName: string | null;
  // bankData
  transferNumber: string | null;
  closingBalance: number | null;
  automaticallyInvestedBalance: number | null;
  overdraftContractedLimit: number | null;
  overdraftUsedLimit: number | null;
  unarrangedOverdraftAmount: number | null;
  // creditData
  ccLevel: string | null;
  ccBrand: string | null;
  ccBalanceDueDate: string | null;
  ccCreditLimit: number | null;
  ccAvailableCreditLimit: number | null;
  ccMinimumPayment: number | null;
  ccBalanceForeignCurrency: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  syncedAt: string;
};
