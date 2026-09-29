export type LifecycleAccessType = "BORROW" | "RENT" | "BUY_USED" | "BUY_NEW";

export type AccessRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export type ExchangeStatus =
  | "PENDING_HANDOVER"
  | "HANDED_OVER"
  | "IN_USE"
  | "RETURN_PENDING"
  | "RETURNED"
  | "COMPLETED"
  | "CANCELLED";

export type LifecycleListing = {
  id: string;
  title: string;
  itemName: string;
  description: string;
  image: string | null;
  accessType: LifecycleAccessType;
  price: number;
  priceUnit: string;
  deposit: number;
  currency: string;
  location: string;
};

export type LifecycleParticipant = { id: string; name: string };

export type AccessRequestRecord = {
  id: string;
  listing: LifecycleListing;
  requester: LifecycleParticipant;
  owner: LifecycleParticipant;
  accessType: LifecycleAccessType;
  status: AccessRequestStatus;
  requestedFrom: string | null;
  requestedUntil: string | null;
  message: string | null;
  offeredPrice: number | null;
  depositAmount: number;
  createdAt: string;
  exchangeId: string | null;
  exchangeStatus: ExchangeStatus | null;
};

export type ExchangeRecord = {
  id: string;
  status: ExchangeStatus;
  accessRequestId: string;
  listing: LifecycleListing;
  owner: LifecycleParticipant;
  requester: LifecycleParticipant;
  expectedReturnAt: string | null;
  handoverAt: string | null;
  receivedAt: string | null;
  returnedAt: string | null;
  returnConfirmedAt: string | null;
  handoverNotes: string | null;
  returnNotes: string | null;
  createdAt: string;
};
