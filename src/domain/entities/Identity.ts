export type Identity = {
  id: string;
  itemId: string;
  fullName: string | null;
  birthDate: string | null;
  taxNumber: string | null;
  document: string | null;
  documentType: string | null;
  jobTitle: string | null;
  companyName: string | null;
  phoneNumbers: string | null; // JSON array
  emails: string | null; // JSON array
  addresses: string | null; // JSON array
  relations: string | null; // JSON ou null
  investorProfile: string | null; // JSON ou null
  establishmentCode: string | null;
  establishmentName: string | null;
  // financialRelationships
  frStartDate: string | null;
  frProductsServicesType: string | null; // JSON array
  frProcurators: string | null; // JSON array
  frAccounts: string | null; // JSON array
  // qualifications
  qualCompanyCnpj: string | null;
  qualInformedIncomeAmount: number | null;
  qualInformedIncomeFrequency: string | null;
  qualInformedIncomeDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  syncedAt: string;
};
