"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import {
  categoriesService,
  sellService,
  ApiError,
  type CategoryDto,
} from "@/lib/api";
import { departments } from "@/lib/data";
import { mediaUrl } from "@/lib/media";

type EditState = {
  id: number;
  name: string;
  department: string;
  is_active: boolean;
  parent_id: string;
  image_url: string;
};

function buildTree(items: CategoryDto[]) {
  const parents = items
    .filter((c) => !c.parent_id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const children = (parentId: number) =>
    items
      .filter((c) => c.parent_id === parentId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return parents.map((parent) => ({ parent, subcategories: children(parent.id) }));
}

function ImagePicker({
  url,
  onChange,
  size = 40,
}: {
  url: string;
  onChange: (url: string) => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const [uploaded] = await sellService.uploadImages([file]);
      if (uploaded) onChange(uploaded);
    } catch {
      // Best-effort — the admin can just try again.
    } finally {
      setUploading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      title={url ? "Change image" : "Upload image"}
      className="relative shrink-0 overflow-hidden rounded-[4px] border-[0.8px] border-line bg-cream disabled:opacity-60"
      style={{ width: size, height: size }}
    >
      {url ? (
        <Image src={mediaUrl(url)} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span className="grid size-full place-items-center text-[10px] text-muted">
          {uploading ? "…" : "+"}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </button>
  );
}

export default function AdminCategoriesPanel() {
  const [items, setItems] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [department, setDepartment] = useState<string>(departments[0]?.slug ?? "");
  const [parentId, setParentId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState<EditState | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await categoriesService.listForAdmin();
      setItems(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const topLevel = items.filter((c) => !c.parent_id);
  const tree = buildTree(items);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      await categoriesService.create({
        name: name.trim(),
        department: department || undefined,
        parent_id: parentId ? Number(parentId) : undefined,
        image_url: imageUrl || undefined,
      });
      setName("");
      setParentId("");
      setImageUrl("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create category.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(cat: CategoryDto) {
    setBusyId(cat.id);
    setError("");
    try {
      await categoriesService.update(cat.id, { is_active: !cat.is_active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update category.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusyId(editing.id);
    setError("");
    try {
      await categoriesService.update(editing.id, {
        name: editing.name.trim(),
        department: editing.department || undefined,
        is_active: editing.is_active,
        image_url: editing.image_url || undefined,
        ...(editing.parent_id
          ? { parent_id: Number(editing.parent_id) }
          : { clear_parent: true }),
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update category.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(cat: CategoryDto) {
    if (!confirm(`Delete "${cat.name}"?`)) return;
    setBusyId(cat.id);
    setError("");
    try {
      await categoriesService.remove(cat.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete category.");
    } finally {
      setBusyId(null);
    }
  }

  function renderRow(cat: CategoryDto, indent: boolean) {
    const isEditing = editing?.id === cat.id;
    const busy = busyId === cat.id;
    return (
      <li
        key={cat.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white px-4 py-3"
      >
        {isEditing ? (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <ImagePicker
              url={editing.image_url}
              onChange={(url) => setEditing({ ...editing, image_url: url })}
            />
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="min-w-[160px] flex-1 rounded-[4px] border-[0.8px] border-line px-2.5 py-1.5 text-[14px] text-ink outline-none focus:border-ink"
            />
            {!indent && (
              <select
                value={editing.department}
                onChange={(e) => setEditing({ ...editing, department: e.target.value })}
                className="rounded-[4px] border-[0.8px] border-line px-2 py-1.5 text-[13px] text-ink outline-none focus:border-ink"
              >
                {departments.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={editing.parent_id}
              onChange={(e) => setEditing({ ...editing, parent_id: e.target.value })}
              className="rounded-[4px] border-[0.8px] border-line px-2 py-1.5 text-[13px] text-ink outline-none focus:border-ink"
            >
              <option value="">— Main category —</option>
              {topLevel
                .filter((c) => c.id !== cat.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    Subcategory of {c.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveEdit()}
              className="rounded-[2px] bg-wine px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-[2px] border-[0.8px] border-line px-3 py-1.5 text-[12px] font-medium text-ink"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative size-10 shrink-0 overflow-hidden rounded-[4px] border-[0.8px] border-line bg-cream">
                {cat.image_url && (
                  <Image
                    src={mediaUrl(cat.image_url)}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-ink">
                  {indent && <span className="pr-1 text-muted">&#8627;</span>}
                  {cat.name}
                  {!cat.is_active && (
                    <span className="ml-2 rounded-[2px] border-[0.8px] border-[rgba(107,61,75,0.2)] bg-[rgba(107,61,75,0.08)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-wine">
                      Inactive
                    </span>
                  )}
                </p>
                <p className="text-[12px] text-muted">
                  {cat.slug}
                  {cat.department ? ` · ${cat.department}` : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setEditing({
                    id: cat.id,
                    name: cat.name,
                    department: cat.department || departments[0]?.slug || "",
                    is_active: cat.is_active ?? true,
                    parent_id: cat.parent_id ? String(cat.parent_id) : "",
                    image_url: cat.image_url || "",
                  })
                }
                className="rounded-[2px] border-[0.8px] border-line px-3 py-1.5 text-[12px] font-medium text-ink disabled:opacity-60"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggleActive(cat)}
                className="rounded-[2px] border-[0.8px] border-line px-3 py-1.5 text-[12px] font-medium text-ink disabled:opacity-60"
              >
                {cat.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(cat)}
                className="rounded-[2px] border-[0.8px] border-wine px-3 py-1.5 text-[12px] font-medium text-wine disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </li>
    );
  }

  return (
    <div className="pt-6">
      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white p-4"
      >
        <div className="flex flex-col items-start gap-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Image
          </span>
          <ImagePicker url={imageUrl} onChange={setImageUrl} size={42} />
        </div>
        <label className="flex-1 min-w-[180px]">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Armchairs"
            className="mt-1.5 w-full rounded-[6px] border-[0.8px] border-line bg-[#fafaf9] px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>
        <label>
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Department
          </span>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="mt-1.5 rounded-[6px] border-[0.8px] border-line bg-[#fafaf9] px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          >
            {departments.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Subcategory of
          </span>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="mt-1.5 rounded-[6px] border-[0.8px] border-line bg-[#fafaf9] px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          >
            <option value="">— Main category —</option>
            {topLevel.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="rounded-[2px] bg-wine px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-60"
        >
          {creating ? "Adding…" : "Add category"}
        </button>
      </form>

      {error && <p className="pt-4 text-[13px] text-wine">{error}</p>}

      {loading ? (
        <p className="pt-10 text-center text-[14px] text-muted">Loading categories…</p>
      ) : tree.length === 0 ? (
        <div className="mt-6 rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white px-6 py-14 text-center">
          <p className="font-display text-[24px] text-ink">No categories yet</p>
          <p className="pt-2 text-[14px] text-muted">Add your first main category above.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {tree.map(({ parent, subcategories }) => (
            <li key={parent.id} className="space-y-2">
              <ul>{renderRow(parent, false)}</ul>
              {subcategories.length > 0 && (
                <ul className="space-y-2 pt-2">
                  {subcategories.map((sub) => renderRow(sub, true))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
