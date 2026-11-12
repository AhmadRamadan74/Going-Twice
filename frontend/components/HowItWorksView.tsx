"use client";

import { useState } from "react";
import { howItWorksBuyer, howItWorksSeller } from "@/lib/data";

type Tab = "buyers" | "sellers";

type Step = {
  step: string;
  title: string;
  body: string;
};

function ProcessTimeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="mx-auto max-w-[852px] pt-10 sm:pt-16">
      {steps.map((item, index) => {
        const isLast = index === steps.length - 1;

        return (
          <li key={item.step} className="flex gap-8 sm:gap-10">
            <div className="flex shrink-0 flex-col items-center">
              <div className="grid size-12 place-items-center rounded-full border-[0.8px] border-line bg-white">
                <span className="font-display text-[15px] text-muted">
                  {item.step}
                </span>
              </div>
              {!isLast && <div className="my-3 h-[63px] w-px bg-line" />}
            </div>

            <div className="min-w-0 pt-2">
              <h3 className="font-display text-[22px] font-medium leading-[1.2] text-ink sm:text-[24px]">
                {item.title}
              </h3>
              <p className="pt-3 text-[14px] leading-[22px] text-muted sm:text-[15px] sm:leading-[24px]">
                {item.body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function HowItWorksView() {
  const [tab, setTab] = useState<Tab>("buyers");
  const steps = tab === "buyers" ? howItWorksBuyer : howItWorksSeller;

  return (
    <section className="container-page pb-16 pt-10 sm:pb-20 sm:pt-14">
      <div className="mx-auto max-w-[852px] text-center">
        <h1 className="font-display text-[40px] font-medium leading-[1.08] tracking-[-0.02em] text-ink sm:text-[52px] lg:text-[56px]">
          How It Works
        </h1>
        <div className="mx-auto mt-2 h-px w-16 bg-line" />

        <div className="mt-12 inline-flex overflow-hidden rounded-[2px] border-[0.8px] border-line">
          <button
            type="button"
            onClick={() => setTab("buyers")}
            className={`min-w-[152px] px-10 py-3.5 text-[14px] font-medium transition-colors ${
              tab === "buyers"
                ? "bg-wine text-white"
                : "bg-white text-muted hover:text-ink"
            }`}
          >
            For Buyers
          </button>
          <button
            type="button"
            onClick={() => setTab("sellers")}
            className={`min-w-[152px] border-l-[0.8px] border-line px-10 py-3.5 text-[14px] font-medium transition-colors ${
              tab === "sellers"
                ? "bg-wine text-white"
                : "bg-white text-muted hover:text-ink"
            }`}
          >
            For Sellers
          </button>
        </div>
      </div>

      <ProcessTimeline steps={steps} />
    </section>
  );
}
