export type WalletType = "InstaPay" | "Vodafone Cash" | "Etisalat Cash";

/** API values for seller wallets. Bank transfer is a separate payout channel. */
export type WalletPaymentMethod = "instapay" | "vodafone_cash" | "etisalat_cash";

export type PaymentMethod = WalletPaymentMethod | "bank_transfer";

export type WalletMethod = {
  id: string;
  type: WalletType;
  handle: string;
};

export type BankAccount = {
  holderName: string;
  bankName: string;
  iban: string;
};

export type PickupAddress = {
  city: string;
  area: string;
  street: string;
  building: string;
};

export type NotificationPrefs = {
  listingEnquiries: boolean;
  orderUpdates: boolean;
  editorial: boolean;
};

export type AccountExtras = {
  address: PickupAddress;
  wallets: WalletMethod[];
  bank: BankAccount | null;
  notifications: NotificationPrefs;
};

const DEFAULTS: AccountExtras = {
  address: { city: "", area: "", street: "", building: "" },
  wallets: [],
  bank: null,
  notifications: {
    listingEnquiries: true,
    orderUpdates: true,
    editorial: false,
  },
};

function key(userId: number) {
  return `gt-account-extras-${userId}`;
}

export function loadAccountExtras(userId: number): AccountExtras {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return structuredClone(DEFAULTS);
    return { ...DEFAULTS, ...JSON.parse(raw) } as AccountExtras;
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveAccountExtras(userId: number, extras: AccountExtras) {
  localStorage.setItem(key(userId), JSON.stringify(extras));
}

export function formatPickupAddress(address: PickupAddress) {
  return [address.street, address.building, address.area, address.city]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

export function walletToPaymentMethod(type: WalletType): WalletPaymentMethod {
  if (type === "Vodafone Cash") return "vodafone_cash";
  if (type === "Etisalat Cash") return "etisalat_cash";
  return "instapay";
}

export function paymentMethodToWalletType(type: string): WalletType {
  const key = type.toLowerCase().replace(/\s+/g, "_");
  if (key === "vodafone_cash" || key === "vodafone") return "Vodafone Cash";
  if (key === "etisalat_cash" || key === "etisalat") return "Etisalat Cash";
  return "InstaPay";
}

export function extrasFromUser(user: {
  pickup_address?: Partial<PickupAddress> | null;
  payout_wallets?: Array<{ id?: string; type: string; handle: string }>;
  payout_bank?: { holder_name: string; bank_name: string; iban: string } | null;
}): AccountExtras {
  const address = user.pickup_address || {};
  return {
    address: {
      city: address.city || "",
      area: address.area || "",
      street: address.street || "",
      building: address.building || "",
    },
    wallets: (user.payout_wallets || []).map((wallet) => ({
      id: wallet.id || wallet.type,
      type: paymentMethodToWalletType(wallet.type),
      handle: wallet.handle,
    })),
    bank: user.payout_bank
      ? {
          holderName: user.payout_bank.holder_name,
          bankName: user.payout_bank.bank_name,
          iban: user.payout_bank.iban,
        }
      : null,
    notifications: structuredClone(DEFAULTS.notifications),
  };
}

export function extrasHavePayout(extras: AccountExtras) {
  return Boolean(
    extras.wallets.length || extras.bank || formatPickupAddress(extras.address),
  );
}

export function extrasToProfilePayload(extras: AccountExtras) {
  return {
    pickup_address: extras.address,
    payout_wallets: extras.wallets.map((wallet) => ({
      id: wallet.id,
      type: walletToPaymentMethod(wallet.type),
      handle: wallet.handle,
    })),
    payout_bank: extras.bank
      ? {
          holder_name: extras.bank.holderName,
          bank_name: extras.bank.bankName,
          iban: extras.bank.iban,
        }
      : null,
  };
}

export function paymentMethodsFromExtras(extras: AccountExtras): PaymentMethod[] {
  const methods: PaymentMethod[] = extras.wallets.map((wallet) =>
    walletToPaymentMethod(wallet.type),
  );
  if (extras.bank) methods.push("bank_transfer");
  return [...new Set(methods)];
}
