export const TRANSACTION_API_BASE = "https://api2.warera.io/trpc";

export interface TransactionItem {
  _id: string;
  money?: number;
  buyerId: string;
  sellerId?: string;
  sellerMuId?: string;
  transactionType:
  | "applicationFee"
  | "trading"
  | "itemMarket"
  | "wage" | "wage-income" | "wage-expense"
  | "donation"
  | "articleTip"
  | "openCase"
  | "craftItem"
  | "dismantleItem";
  itemCode?: string;
  quantity?: number;
  item?: {
    _id: string;
    type: string;
    code: string;
    skills: Record<string, number>;
    state: number;
    maxState: number;
    quantity: number;
    lastAcquisitionAt: string;
  };
  offerCreatedAt?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface PaginatedTransactionsResponse {
  items: TransactionItem[];
  nextCursor: string | null;
}

export async function getPaginatedTransactions(
  userId: string,
  limit: number = 100,
  cursor: string | null = null
): Promise<PaginatedTransactionsResponse> {
  const payload: any = { limit, userId };
  if (cursor) payload.cursor = cursor;

  const token = localStorage.getItem("warera-api-token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "*/*",
  };
  if (token) {
    headers["X-API-KEY"] = token;
  }

  const res = await fetch(`${TRANSACTION_API_BASE}/transaction.getPaginatedTransactions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch transactions: ${res.statusText}`);
  }

  const json = await res.json();
  // Based on wareraApi.ts post function, it should be result.data
  return json?.result?.data as PaginatedTransactionsResponse;
}
