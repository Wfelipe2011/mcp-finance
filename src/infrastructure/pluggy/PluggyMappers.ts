import type { Item } from "../../domain/entities/Item.ts";
import type { Account } from "../../domain/entities/Account.ts";
import type { Transaction } from "../../domain/entities/Transaction.ts";
import type { Investment } from "../../domain/entities/Investment.ts";
import type { InvestmentTransaction } from "../../domain/entities/InvestmentTransaction.ts";
import type { Identity } from "../../domain/entities/Identity.ts";

const now = () => new Date().toISOString();

// ---- Raw API shapes (unknown → typed via as) ----

type RawItem = {
  id: string;
  connector?: { name?: string } | null;
  status?: string | null;
  executionStatus?: string | null;
  products?: string[] | null;
  lastUpdatedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RawAccount = {
  id: string;
  itemId?: string | null;
  type?: string | null;
  subtype?: string | null;
  name?: string | null;
  balance?: number | null;
  currencyCode?: string | null;
  number?: string | null;
  owner?: string | null;
  taxNumber?: string | null;
  marketingName?: string | null;
  bankData?: {
    transferNumber?: string | null;
    closingBalance?: number | null;
    automaticallyInvestedBalance?: number | null;
    overdraftContractedLimit?: number | null;
    overdraftUsedLimit?: number | null;
    unarrangedOverdraftAmount?: number | null;
  } | null;
  creditData?: {
    level?: string | null;
    brand?: string | null;
    balanceDueDate?: string | null;
    creditLimit?: number | null;
    availableCreditLimit?: number | null;
    minimumPayment?: number | null;
    balanceForeignCurrency?: number | null;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RawPaymentData = {
  paymentMethod?: string | null;
  payer?: unknown;
  receiver?: unknown;
  reason?: string | null;
  receiverReferenceId?: string | null;
  referenceNumber?: string | null;
  boletoMetadata?: unknown;
} | null;

type RawCreditCardMetadata = {
  cardNumber?: string | null;
  billId?: string | null;
  purchaseDate?: string | null;
  totalInstallments?: number | null;
  installmentNumber?: number | null;
  payeeMCC?: number | null;
} | null;

type RawTransaction = {
  id: string;
  accountId?: string | null;
  description?: string | null;
  descriptionRaw?: string | null;
  currencyCode?: string | null;
  amount?: number | null;
  amountInAccountCurrency?: number | null;
  date?: string | null;
  category?: string | null;
  categoryId?: string | null;
  balance?: number | null;
  providerCode?: string | null;
  status?: string | null;
  type?: string | null;
  operationType?: string | null;
  providerId?: string | null;
  order?: number | null;
  paymentData?: RawPaymentData;
  creditCardMetadata?: RawCreditCardMetadata;
  merchant?: unknown;
  acquirerData?: unknown;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RawInvestment = {
  id: string;
  itemId?: string | null;
  name?: string | null;
  type?: string | null;
  subtype?: string | null;
  balance?: number | null;
  currencyCode?: string | null;
  value?: number | null;
  quantity?: number | null;
  amount?: number | null;
  taxes?: number | null;
  taxes2?: number | null;
  amountProfit?: number | null;
  amountWithdrawal?: number | null;
  amountOriginal?: number | null;
  lastMonthRate?: number | null;
  lastTwelveMonthsRate?: number | null;
  annualRate?: number | null;
  fixedAnnualRate?: number | null;
  rate?: number | null;
  rateType?: string | null;
  code?: string | null;
  isin?: string | null;
  number?: string | null;
  metadata?: string | null;
  issuer?: string | null;
  issuerCNPJ?: string | null;
  issueDate?: string | null;
  purchaseDate?: string | null;
  dueDate?: string | null;
  date?: string | null;
  owner?: string | null;
  institution?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RawExpenses = {
  incomeTax?: number | null;
  brokerageFee?: number | null;
  serviceTax?: number | null;
  settlementFee?: number | null;
  clearingFee?: number | null;
  stockExchangeFee?: number | null;
  custodyFee?: number | null;
  operatingFee?: number | null;
  tradingAssetsNoticeFee?: number | null;
  maintenanceFee?: number | null;
  other?: number | null;
} | null;

type RawInvestmentTransaction = {
  id: string;
  description?: string | null;
  amount?: number | null;
  value?: number | null;
  quantity?: number | null;
  tradeDate?: string | null;
  date?: string | null;
  type?: string | null;
  netAmount?: number | null;
  movementType?: string | null;
  brokerageNumber?: string | null;
  agreedRate?: number | null;
  expenses?: RawExpenses;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RawIdentity = {
  id: string;
  itemId?: string | null;
  fullName?: string | null;
  birthDate?: string | null;
  taxNumber?: string | null;
  document?: string | null;
  documentType?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  phoneNumbers?: unknown[] | null;
  emails?: unknown[] | null;
  addresses?: unknown[] | null;
  relations?: unknown;
  investorProfile?: unknown;
  establishmentCode?: string | null;
  establishmentName?: string | null;
  financialRelationships?: {
    startDate?: string | null;
    productsServicesType?: unknown[] | null;
    procurators?: unknown[] | null;
    accounts?: unknown[] | null;
  } | null;
  qualifications?: {
    companyCnpj?: string | null;
    informedIncome?: {
      amount?: number | null;
      frequency?: string | null;
      date?: string | null;
    } | null;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

// ---- Mapper functions ----

export function mapItem(raw: RawItem): Item {
  return {
    id: raw.id,
    connector: raw.connector?.name ?? null,
    status: raw.status ?? null,
    executionStatus: raw.executionStatus ?? null,
    products: raw.products ? JSON.stringify(raw.products) : null,
    lastUpdatedAt: raw.lastUpdatedAt ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    syncedAt: now(),
  };
}

export function mapAccount(raw: RawAccount): Account {
  return {
    id: raw.id,
    itemId: raw.itemId ?? "",
    type: raw.type ?? null,
    subtype: raw.subtype ?? null,
    name: raw.name ?? null,
    balance: raw.balance ?? null,
    currencyCode: raw.currencyCode ?? null,
    number: raw.number ?? null,
    owner: raw.owner ?? null,
    taxNumber: raw.taxNumber ?? null,
    marketingName: raw.marketingName ?? null,
    transferNumber: raw.bankData?.transferNumber ?? null,
    closingBalance: raw.bankData?.closingBalance ?? null,
    automaticallyInvestedBalance: raw.bankData?.automaticallyInvestedBalance ?? null,
    overdraftContractedLimit: raw.bankData?.overdraftContractedLimit ?? null,
    overdraftUsedLimit: raw.bankData?.overdraftUsedLimit ?? null,
    unarrangedOverdraftAmount: raw.bankData?.unarrangedOverdraftAmount ?? null,
    ccLevel: raw.creditData?.level ?? null,
    ccBrand: raw.creditData?.brand ?? null,
    ccBalanceDueDate: raw.creditData?.balanceDueDate ?? null,
    ccCreditLimit: raw.creditData?.creditLimit ?? null,
    ccAvailableCreditLimit: raw.creditData?.availableCreditLimit ?? null,
    ccMinimumPayment: raw.creditData?.minimumPayment ?? null,
    ccBalanceForeignCurrency: raw.creditData?.balanceForeignCurrency ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    syncedAt: now(),
  };
}

export function mapTransaction(raw: RawTransaction, accountId: string): Transaction {
  return {
    id: raw.id,
    accountId: raw.accountId ?? accountId,
    description: raw.description ?? null,
    descriptionRaw: raw.descriptionRaw ?? null,
    currencyCode: raw.currencyCode ?? null,
    amount: raw.amount ?? null,
    amountInAccountCurrency: raw.amountInAccountCurrency ?? null,
    date: raw.date ?? null,
    category: raw.category ?? null,
    categoryId: raw.categoryId ?? null,
    balance: raw.balance ?? null,
    providerCode: raw.providerCode ?? null,
    status: raw.status ?? null,
    type: raw.type ?? null,
    operationType: raw.operationType ?? null,
    providerId: raw.providerId ?? null,
    order: raw.order ?? null,
    paymentData: raw.paymentData != null ? JSON.stringify(raw.paymentData) : null,
    ccCardNumber: raw.creditCardMetadata?.cardNumber ?? null,
    ccBillId: raw.creditCardMetadata?.billId ?? null,
    ccPurchaseDate: raw.creditCardMetadata?.purchaseDate ?? null,
    ccTotalInstallments: raw.creditCardMetadata?.totalInstallments ?? null,
    ccInstallmentNumber: raw.creditCardMetadata?.installmentNumber ?? null,
    ccPayeeMCC: raw.creditCardMetadata?.payeeMCC ?? null,
    merchant: raw.merchant != null ? JSON.stringify(raw.merchant) : null,
    acquirerData: raw.acquirerData != null ? JSON.stringify(raw.acquirerData) : null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    syncedAt: now(),
  };
}

export function mapInvestment(raw: RawInvestment): Investment {
  return {
    id: raw.id,
    itemId: raw.itemId ?? "",
    name: raw.name ?? null,
    type: raw.type ?? null,
    subtype: raw.subtype ?? null,
    balance: raw.balance ?? null,
    currencyCode: raw.currencyCode ?? null,
    value: raw.value ?? null,
    quantity: raw.quantity ?? null,
    amount: raw.amount ?? null,
    taxes: raw.taxes ?? null,
    taxes2: raw.taxes2 ?? null,
    amountProfit: raw.amountProfit ?? null,
    amountWithdrawal: raw.amountWithdrawal ?? null,
    amountOriginal: raw.amountOriginal ?? null,
    lastMonthRate: raw.lastMonthRate ?? null,
    lastTwelveMonthsRate: raw.lastTwelveMonthsRate ?? null,
    annualRate: raw.annualRate ?? null,
    fixedAnnualRate: raw.fixedAnnualRate ?? null,
    rate: raw.rate ?? null,
    rateType: raw.rateType ?? null,
    code: raw.code ?? null,
    isin: raw.isin ?? null,
    number: raw.number ?? null,
    metadata: raw.metadata ?? null,
    issuer: raw.issuer ?? null,
    issuerCNPJ: raw.issuerCNPJ ?? null,
    issueDate: raw.issueDate ?? null,
    purchaseDate: raw.purchaseDate ?? null,
    dueDate: raw.dueDate ?? null,
    date: raw.date ?? null,
    owner: raw.owner ?? null,
    institution: raw.institution ?? null,
    status: raw.status ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    syncedAt: now(),
  };
}

export function mapInvestmentTransaction(
  raw: RawInvestmentTransaction,
  investmentId: string
): InvestmentTransaction {
  return {
    id: raw.id,
    investmentId,
    description: raw.description ?? null,
    amount: raw.amount ?? null,
    value: raw.value ?? null,
    quantity: raw.quantity ?? null,
    tradeDate: raw.tradeDate ?? null,
    date: raw.date ?? null,
    type: raw.type ?? null,
    netAmount: raw.netAmount ?? null,
    movementType: raw.movementType ?? null,
    brokerageNumber: raw.brokerageNumber ?? null,
    agreedRate: raw.agreedRate ?? null,
    expIncomeTax: raw.expenses?.incomeTax ?? null,
    expBrokerageFee: raw.expenses?.brokerageFee ?? null,
    expServiceTax: raw.expenses?.serviceTax ?? null,
    expSettlementFee: raw.expenses?.settlementFee ?? null,
    expClearingFee: raw.expenses?.clearingFee ?? null,
    expStockExchangeFee: raw.expenses?.stockExchangeFee ?? null,
    expCustodyFee: raw.expenses?.custodyFee ?? null,
    expOperatingFee: raw.expenses?.operatingFee ?? null,
    expTradingAssetsNoticeFee: raw.expenses?.tradingAssetsNoticeFee ?? null,
    expMaintenanceFee: raw.expenses?.maintenanceFee ?? null,
    expOther: raw.expenses?.other ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    syncedAt: now(),
  };
}

export function mapIdentity(raw: RawIdentity): Identity {
  return {
    id: raw.id,
    itemId: raw.itemId ?? "",
    fullName: raw.fullName ?? null,
    birthDate: raw.birthDate ?? null,
    taxNumber: raw.taxNumber ?? null,
    document: raw.document ?? null,
    documentType: raw.documentType ?? null,
    jobTitle: raw.jobTitle ?? null,
    companyName: raw.companyName ?? null,
    phoneNumbers: raw.phoneNumbers != null ? JSON.stringify(raw.phoneNumbers) : null,
    emails: raw.emails != null ? JSON.stringify(raw.emails) : null,
    addresses: raw.addresses != null ? JSON.stringify(raw.addresses) : null,
    relations: raw.relations != null ? JSON.stringify(raw.relations) : null,
    investorProfile: raw.investorProfile != null ? JSON.stringify(raw.investorProfile) : null,
    establishmentCode: raw.establishmentCode ?? null,
    establishmentName: raw.establishmentName ?? null,
    frStartDate: raw.financialRelationships?.startDate ?? null,
    frProductsServicesType:
      raw.financialRelationships?.productsServicesType != null
        ? JSON.stringify(raw.financialRelationships.productsServicesType)
        : null,
    frProcurators:
      raw.financialRelationships?.procurators != null
        ? JSON.stringify(raw.financialRelationships.procurators)
        : null,
    frAccounts:
      raw.financialRelationships?.accounts != null
        ? JSON.stringify(raw.financialRelationships.accounts)
        : null,
    qualCompanyCnpj: raw.qualifications?.companyCnpj ?? null,
    qualInformedIncomeAmount: raw.qualifications?.informedIncome?.amount ?? null,
    qualInformedIncomeFrequency: raw.qualifications?.informedIncome?.frequency ?? null,
    qualInformedIncomeDate: raw.qualifications?.informedIncome?.date ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    syncedAt: now(),
  };
}

// ---- Type-safe coercion helpers ----

export function asRawItem(v: unknown): RawItem {
  return v as RawItem;
}
export function asRawAccount(v: unknown): RawAccount {
  return v as RawAccount;
}
export function asRawTransaction(v: unknown): RawTransaction {
  return v as RawTransaction;
}
export function asRawInvestment(v: unknown): RawInvestment {
  return v as RawInvestment;
}
export function asRawInvestmentTransaction(v: unknown): RawInvestmentTransaction {
  return v as RawInvestmentTransaction;
}
export function asRawIdentity(v: unknown): RawIdentity {
  return v as RawIdentity;
}
