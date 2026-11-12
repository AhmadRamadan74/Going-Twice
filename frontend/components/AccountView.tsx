"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { ApiError, authService } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  extrasFromUser,
  extrasHavePayout,
  extrasToProfilePayload,
  loadAccountExtras,
  saveAccountExtras,
  type AccountExtras,
  type BankAccount,
  type NotificationPrefs,
  type PickupAddress,
  type WalletMethod,
  type WalletType,
} from "@/lib/account-settings";
import {
  BoxIcon,
  ChatIcon,
  DashboardIcon,
  DocumentIcon,
  HeartIcon,
  PencilIcon,
  PlusIcon,
  SignOutIcon,
  TrashIcon,
} from "./icons";

const fieldClass =
  "mt-1.5 w-full rounded-[6px] border-[0.8px] border-line bg-[#fafaf9] px-4 py-[10px] text-[15px] leading-[22.5px] text-ink outline-none placeholder:text-ink/40 focus:border-ink";

const cardClass =
  "w-full rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white p-6 sm:p-8";

const WALLET_TYPES: WalletType[] = ["InstaPay", "Vodafone Cash", "Etisalat Cash"];

function formatWalletHandle(type: WalletType, raw: string) {
  const value = raw.trim();
  if (!value) return value;
  if (type === "InstaPay" && !value.startsWith("@")) return `@${value}`;
  return value;
}

const shortcuts = [
  { href: "/messages", label: "Messages", Icon: ChatIcon },
  { href: "/account/uploads", label: "My Uploads", Icon: BoxIcon },
  { href: "/account/orders", label: "My Orders", Icon: DocumentIcon },
  { href: "/wishlist", label: "Wishlist", Icon: HeartIcon },
];

export default function AccountView() {
  const router = useRouter();
  const { user, ready, logout, refreshUser } = useAuth();
  const [extras, setExtras] = useState<AccountExtras | null>(null);
  const [payoutError, setPayoutError] = useState("");

  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/account");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    const fromServer = extrasFromUser(user);
    const local = loadAccountExtras(user.id);
    fromServer.notifications = local.notifications;
    if (!extrasHavePayout(fromServer) && extrasHavePayout(local)) {
      setExtras(local);
      void authService
        .updateProfile(extrasToProfilePayload(local))
        .then(() => refreshUser())
        .catch(() => undefined);
      return;
    }
    setExtras(fromServer);
  }, [user, refreshUser]);

  if (!ready || !user || !extras) {
    return (
      <section className="container-page py-16 text-center text-[14px] text-muted">
        Loading account…
      </section>
    );
  }

  const account = user;
  const accountExtras = extras;

  const initials = account.full_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function persist(next: AccountExtras) {
    setExtras(next);
    saveAccountExtras(account.id, next);
    setPayoutError("");
    void authService
      .updateProfile(extrasToProfilePayload(next))
      .then(() => refreshUser())
      .catch((err) => {
        setPayoutError(
          err instanceof ApiError ? err.message : "Could not save payment details.",
        );
      });
  }

  return (
    <div>
      <div className="relative overflow-hidden bg-ink">
        <Image
          src="/images/hero-living-room.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div className="relative mx-auto flex max-w-[900px] items-end gap-6 px-4 pb-10 pt-12 sm:px-6 sm:pt-12">
          <div className="relative shrink-0">
            <span className="grid size-20 place-items-center rounded-full bg-cream text-[30px] font-display font-medium text-wine shadow-[0_0_0_2px_rgba(242,232,214,0.4)]">
              {initials}
            </span>
            <Link
              href="#personal"
              aria-label="Edit profile"
              className="absolute bottom-0 right-0 grid size-7 place-items-center rounded-full border-[1.6px] border-white bg-wine text-white"
            >
              <PencilIcon className="size-2.5" />
            </Link>
          </div>
          <div className="pb-1">
            <h1 className="font-display text-[28px] font-medium leading-[1.2] tracking-[-0.02em] text-cream sm:text-[32px]">
              {account.full_name}
            </h1>
            <p className="pt-1 text-[13px] text-cream/50">{account.email}</p>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[900px] px-4 py-8 sm:px-6 sm:py-8">
        {account.email_verified === false && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[6px] border-[0.8px] border-[#fee685] bg-[#fffbeb] px-4 py-3">
            <p className="text-[13px] leading-[19.5px] text-[#bb4d00]">
              Your email isn&apos;t confirmed yet. Verify it to buy or sell on Going
              Twice.
            </p>
            <Link
              href="/verify-email"
              className="shrink-0 rounded-[2px] bg-wine px-4 py-2 text-[12px] font-medium text-white"
            >
              Verify Email
            </Link>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="rounded-[6px] border-[0.8px] border-wine/40 bg-white p-5 transition-colors hover:border-wine"
            >
              <span className="grid size-9 place-items-center rounded-[6px] bg-cream">
                <DashboardIcon className="size-4 text-wine" />
              </span>
              <p className="pt-3 font-display text-[17px] font-medium text-ink">Admin Dashboard</p>
            </Link>
          )}
          {shortcuts.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="rounded-[6px] border-[0.8px] border-line bg-white p-5 transition-colors hover:border-ink/25"
            >
              <span className="grid size-9 place-items-center rounded-[6px] bg-cream">
                <Icon className="size-4 text-ink" />
              </span>
              <p className="pt-3 font-display text-[17px] font-medium text-ink">{label}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 space-y-6">
          {payoutError && (
            <p className="rounded-[6px] bg-wine/10 px-4 py-3 text-[13px] text-wine">{payoutError}</p>
          )}
          <PersonalCard
            fullName={account.full_name}
            email={account.email}
            phone={account.phone_number || ""}
            onSaved={refreshUser}
          />

          <AddressCard
            address={accountExtras.address}
            onSave={(address) => persist({ ...accountExtras, address })}
          />

          <PaymentCard
            wallets={accountExtras.wallets}
            bank={accountExtras.bank}
            onChange={(wallets, bank) => persist({ ...accountExtras, wallets, bank })}
          />

          <NotificationsCard
            prefs={accountExtras.notifications}
            onChange={(notifications) => persist({ ...accountExtras, notifications })}
          />

          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="inline-flex items-center gap-2 rounded-[2px] border-[0.8px] border-wine px-5 py-2.5 text-[13px] font-medium text-wine transition-colors hover:bg-wine/5"
            >
              <SignOutIcon className="size-4" />
              Sign Out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PersonalCard({
  fullName,
  email,
  phone,
  onSaved,
}: {
  fullName: string;
  email: string;
  phone: string;
  onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setPending(true);
    const form = new FormData(e.currentTarget);
    try {
      await authService.updateProfile({
        full_name: String(form.get("full_name") || ""),
        phone_number: String(form.get("phone_number") || ""),
      });
      await onSaved();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save changes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form id="personal" onSubmit={onSubmit} className={cardClass}>
      <h2 className="font-display text-[22px] font-medium text-ink">Personal Information</h2>
      {error && <p className="pt-3 text-[13px] text-wine">{error}</p>}
      {saved && <p className="pt-3 text-[13px] text-olive">Changes saved.</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Full Name
          </span>
          <input name="full_name" required defaultValue={fullName} className={fieldClass} />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Email Address
          </span>
          <input value={email} disabled className={`${fieldClass} text-muted`} />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Phone Number
          </span>
          <input
            name="phone_number"
            defaultValue={phone}
            placeholder="0101 234 5678"
            className={fieldClass}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-5 rounded-[2px] bg-wine px-7 py-3.5 text-[15px] font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}

function AddressCard({
  address,
  onSave,
}: {
  address: PickupAddress;
  onSave: (address: PickupAddress) => void;
}) {
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onSave({
      city: String(form.get("city") || ""),
      area: String(form.get("area") || ""),
      street: String(form.get("street") || ""),
      building: String(form.get("building") || ""),
    });
    setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className={cardClass}>
      <h2 className="font-display text-[22px] font-medium text-ink">Pickup Address</h2>
      {saved && <p className="pt-3 text-[13px] text-olive">Address saved.</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            City
          </span>
          <input name="city" defaultValue={address.city} placeholder="Cairo" className={fieldClass} />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Area
          </span>
          <input name="area" defaultValue={address.area} placeholder="Zamalek" className={fieldClass} />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Street
          </span>
          <input
            name="street"
            defaultValue={address.street}
            placeholder="26 El Gezira St"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Building / Apartment
          </span>
          <input
            name="building"
            defaultValue={address.building}
            placeholder="Villa 4"
            className={fieldClass}
          />
        </label>
      </div>
      <button
        type="submit"
        className="mt-5 rounded-[2px] bg-wine px-7 py-3.5 text-[15px] font-medium text-white"
      >
        Save Address
      </button>
    </form>
  );
}

function PaymentCard({
  wallets,
  bank,
  onChange,
}: {
  wallets: WalletMethod[];
  bank: BankAccount | null;
  onChange: (wallets: WalletMethod[], bank: BankAccount | null) => void;
}) {
  const [addingWallet, setAddingWallet] = useState(false);
  const [addingBank, setAddingBank] = useState(false);

  return (
    <div className={cardClass}>
      <h2 className="font-display text-[22px] font-medium text-ink">Payment Methods</h2>

      <div className="mt-6 overflow-hidden rounded-[6px] border-[0.8px] border-[rgba(107,90,74,0.2)]">
        <div className="flex items-center justify-between bg-cream/60 px-4 py-3">
          <p className="font-display text-[18px] font-medium text-ink">Wallets & Cards</p>
          <button
            type="button"
            onClick={() => setAddingWallet(true)}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-wine"
          >
            <PlusIcon className="size-[11px]" />
            Add
          </button>
        </div>
        <div className="bg-white">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="flex items-center justify-between border-b-[0.8px] border-[rgba(107,90,74,0.08)] px-4 py-3 last:border-0"
            >
              <div>
                <p className="text-[13px] font-medium text-ink">{wallet.type}</p>
                <p className="text-[12px] text-muted">{wallet.handle}</p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${wallet.type}`}
                onClick={() => onChange(wallets.filter((item) => item.id !== wallet.id), bank)}
                className="text-muted transition-colors hover:text-wine"
              >
                <TrashIcon className="size-[13px]" />
              </button>
            </div>
          ))}
          {wallets.length === 0 && !addingWallet && (
            <p className="px-4 py-4 text-[13px] italic text-muted">No wallet added yet.</p>
          )}
          {addingWallet && (
            <WalletForm
              onCancel={() => setAddingWallet(false)}
              onAdd={(wallet) => {
                onChange([...wallets, wallet], bank);
                setAddingWallet(false);
              }}
            />
          )}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[6px] border-[0.8px] border-[rgba(107,90,74,0.2)]">
        <div className="flex items-center justify-between bg-cream/60 px-4 py-3">
          <p className="font-display text-[18px] font-medium text-ink">Bank Account</p>
          <button
            type="button"
            onClick={() => setAddingBank(true)}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-wine"
          >
            <PlusIcon className="size-[11px]" />
            Add
          </button>
        </div>
        <div className="bg-white">
          {bank && !addingBank && (
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[13px] font-medium text-ink">{bank.bankName}</p>
                <p className="text-[12px] text-muted">
                  {bank.holderName} · {bank.iban}
                </p>
              </div>
              <button
                type="button"
                aria-label="Remove bank account"
                onClick={() => onChange(wallets, null)}
                className="text-muted transition-colors hover:text-wine"
              >
                <TrashIcon className="size-[13px]" />
              </button>
            </div>
          )}
          {!bank && !addingBank && (
            <p className="px-4 py-4 text-[13px] italic text-muted">
              No bank account added. Required for orders above EGP 70,000.
            </p>
          )}
          {addingBank && (
            <BankForm
              onCancel={() => setAddingBank(false)}
              onAdd={(next) => {
                onChange(wallets, next);
                setAddingBank(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function WalletForm({
  onAdd,
  onCancel,
}: {
  onAdd: (wallet: WalletMethod) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<WalletType>("InstaPay");
  const [handle, setHandle] = useState("");

  return (
    <form
      className="space-y-4 border-t-[0.8px] border-[rgba(107,90,74,0.1)] px-4 py-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!handle.trim()) return;
        onAdd({
          id: crypto.randomUUID(),
          type,
          handle: formatWalletHandle(type, handle),
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Type
          </span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as WalletType)}
            className={fieldClass}
          >
            {WALLET_TYPES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Handle
          </span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@handle"
            className={fieldClass}
          />
        </label>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-[2px] bg-wine px-5 py-2.5 text-[13px] font-medium text-white"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[2px] border-[0.8px] border-line px-5 py-2.5 text-[13px] font-medium text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function BankForm({
  onAdd,
  onCancel,
}: {
  onAdd: (bank: BankAccount) => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="space-y-4 border-t-[0.8px] border-[rgba(107,90,74,0.1)] px-4 py-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        onAdd({
          holderName: String(form.get("holderName") || ""),
          bankName: String(form.get("bankName") || ""),
          iban: String(form.get("iban") || ""),
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Account Holder Name
          </span>
          <input
            name="holderName"
            required
            placeholder="e.g. Ahmed Mostafa"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Bank Name
          </span>
          <input name="bankName" required placeholder="e.g. CIB" className={fieldClass} />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            IBAN
          </span>
          <input
            name="iban"
            required
            placeholder="EG38 0019 0005 0000 0000 2635 4400"
            className={fieldClass}
          />
        </label>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-[2px] bg-wine px-5 py-2.5 text-[13px] font-medium text-white"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[2px] border-[0.8px] border-line px-5 py-2.5 text-[13px] font-medium text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function NotificationsCard({
  prefs,
  onChange,
}: {
  prefs: NotificationPrefs;
  onChange: (prefs: NotificationPrefs) => void;
}) {
  const rows: { key: keyof NotificationPrefs; title: string; body: string }[] = [
    {
      key: "listingEnquiries",
      title: "New enquiries on my listings",
      body: "When someone messages about a piece you've listed",
    },
    {
      key: "orderUpdates",
      title: "Order status updates",
      body: "Confirmations, handover reminders, and completions",
    },
    {
      key: "editorial",
      title: "Editorial & new arrivals",
      body: "Curated picks and occasional magazine features",
    },
  ];

  return (
    <div className={cardClass}>
      <h2 className="font-display text-[22px] font-medium text-ink">Notifications</h2>
      <div className="mt-4">
        {rows.map((row, index) => (
          <div
            key={row.key}
            className={`flex items-center justify-between gap-4 py-4 ${
              index < rows.length - 1 ? "border-b-[0.8px] border-[rgba(107,90,74,0.1)]" : ""
            }`}
          >
            <div>
              <p className="text-[14px] font-medium text-ink">{row.title}</p>
              <p className="text-[12px] text-muted">{row.body}</p>
            </div>
            <Toggle
              checked={prefs[row.key]}
              onChange={(checked) => onChange({ ...prefs, [row.key]: checked })}
              label={row.title}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const id = useId();
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-wine" : "bg-[rgba(107,90,74,0.25)]"
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "left-[26px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
