export type Transaction = {
  id: string;
  accountId: string;
  description: string | null;
  descriptionRaw: string | null;
  currencyCode: string | null;
  amount: number | null;
  amountInAccountCurrency: number | null;
  date: string | null;
  category: string | null;
  categoryId: string | null;
  balance: number | null;
  providerCode: string | null;
  status: string | null;
  type: string | null;
  operationType: string | null;
  providerId: string | null;
  order: number | null;
  // paymentData (serializado como JSON)
  paymentData: string | null;
  // creditCardMetadata
  ccCardNumber: string | null;
  ccBillId: string | null;
  ccPurchaseDate: string | null;
  ccTotalInstallments: number | null;
  ccInstallmentNumber: number | null;
  ccPayeeMCC: number | null;
  // outros
  merchant: string | null;
  acquirerData: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  syncedAt: string;
};
