"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SearchIcon } from "./icons";

function SearchFormInner({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") || "").trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  }

  if (compact) {
    return (
      <form role="search" onSubmit={onSubmit} className="container-page flex gap-2 pb-3 md:hidden">
        <div className="flex h-10 flex-1 items-center overflow-hidden rounded-[2px] border-[0.8px] border-line bg-parchment">
          <span className="flex h-full items-center bg-parchment pl-3 pr-1 text-muted">
            <SearchIcon className="size-[15px]" />
          </span>
          <input
            name="q"
            type="search"
            defaultValue={searchParams.get("q") || ""}
            autoFocus
            placeholder="Search vintage pieces…"
            className="h-full min-w-0 flex-1 bg-white px-2.5 text-[13px] text-ink outline-none placeholder:text-muted/50"
          />
        </div>
        <button
          type="submit"
          className="h-10 shrink-0 cursor-pointer rounded-[2px] bg-ink px-4 text-[12px] font-medium text-white"
        >
          Search
        </button>
      </form>
    );
  }

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className="hidden h-[41px] flex-1 items-center overflow-hidden rounded-[2px] border-[0.8px] border-line bg-parchment md:flex"
    >
      <span className="flex h-full items-center bg-parchment pl-2 pr-2 text-muted">
        <SearchIcon className="size-[15px]" />
      </span>
      <input
        name="q"
        type="search"
        defaultValue={searchParams.get("q") || ""}
        placeholder="Search for vintage chairs, tables, lighting…"
        className="h-[39px] min-w-0 flex-1 bg-white px-3 text-[13px] text-ink outline-none placeholder:text-muted/50"
      />
      <button
        type="submit"
        className="h-full cursor-pointer bg-ink px-5 text-[12px] font-medium leading-[18px] text-white transition-opacity hover:opacity-90"
      >
        Search
      </button>
    </form>
  );
}

export default function SearchForm({ compact = false }: { compact?: boolean }) {
  return (
    <Suspense fallback={null}>
      <SearchFormInner compact={compact} />
    </Suspense>
  );
}
