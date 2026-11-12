import type { OrderDto } from "@/lib/api";
import { paymentMethodLabel } from "@/lib/order-display";

export default function SellerPayoutDetails({
  order,
  heading = "Pay the seller directly",
}: {
  order: OrderDto;
  heading?: string;
}) {
  const payout = order.payout;
  if (!payout) return null;

  const pickup = payout.pickup_address || order.pickup_address || null;
  const hasHandle = Boolean(payout.handle);
  const hasBank = Boolean(payout.iban);
  const empty = !hasHandle && !hasBank;

  return (
    <div className="mt-5 rounded-[4px] border-[0.8px] border-[rgba(107,90,74,0.15)] bg-[#faf7f2] px-4 py-3 text-left">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">{heading}</p>
      {hasHandle ? (
        <p className="pt-1 text-[15px] font-medium text-ink">{payout.handle}</p>
      ) : null}
      {hasBank ? (
        <div className="pt-2 text-[13px] leading-[20px] text-ink">
          {payout.bank_holder ? <p>{payout.bank_holder}</p> : null}
          {payout.bank_name ? <p>{payout.bank_name}</p> : null}
          <p className="font-medium">{payout.iban}</p>
        </div>
      ) : null}
      {empty ? (
        <p className="pt-1 text-[13px] text-muted">
          The seller has not added transfer details yet. Use the phone number on the
          order to arrange payment.
        </p>
      ) : (
        <p className="pt-1 text-[12px] text-muted">
          {paymentMethodLabel(payout.method || order.payment_method)}
        </p>
      )}
      {pickup ? (
        <p className="pt-2 text-[13px] leading-[20px] text-ink">
          Pickup: {pickup}
        </p>
      ) : null}
    </div>
  );
}
