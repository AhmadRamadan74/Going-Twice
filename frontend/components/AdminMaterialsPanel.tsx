"use client";

import { useEffect, useState } from "react";
import { materialsService, ApiError, type MaterialDto } from "@/lib/api";

export default function AdminMaterialsPanel() {
  const [items, setItems] = useState<MaterialDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await materialsService.listForAdmin();
      setItems(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load materials.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      await materialsService.create({ name: name.trim() });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create material.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(item: MaterialDto) {
    setBusyId(item.id);
    setError("");
    try {
      await materialsService.update(item.id, { is_active: !item.is_active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update material.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit(id: number) {
    setBusyId(id);
    setError("");
    try {
      await materialsService.update(id, { name: editingName.trim() });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update material.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: MaterialDto) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    setBusyId(item.id);
    setError("");
    try {
      await materialsService.remove(item.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete material.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="pt-6">
      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white p-4"
      >
        <label className="flex-1 min-w-[180px]">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Material name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Walnut Wood"
            className="mt-1.5 w-full rounded-[6px] border-[0.8px] border-line bg-[#fafaf9] px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="rounded-[2px] bg-wine px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-60"
        >
          {creating ? "Adding…" : "Add material"}
        </button>
      </form>

      {error && <p className="pt-4 text-[13px] text-wine">{error}</p>}

      {loading ? (
        <p className="pt-10 text-center text-[14px] text-muted">Loading materials…</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white px-6 py-14 text-center">
          <p className="font-display text-[24px] text-ink">No materials yet</p>
          <p className="pt-2 text-[14px] text-muted">Add your first material above.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            const isEditing = editingId === item.id;
            const busy = busyId === item.id;
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border-[0.8px] border-[rgba(107,90,74,0.1)] bg-white px-4 py-3"
              >
                {isEditing ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="min-w-[160px] flex-1 rounded-[4px] border-[0.8px] border-line px-2.5 py-1.5 text-[14px] text-ink outline-none focus:border-ink"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveEdit(item.id)}
                      className="rounded-[2px] bg-wine px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-[2px] border-[0.8px] border-line px-3 py-1.5 text-[12px] font-medium text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-ink">
                        {item.name}
                        {!item.is_active && (
                          <span className="ml-2 rounded-[2px] border-[0.8px] border-[rgba(107,61,75,0.2)] bg-[rgba(107,61,75,0.08)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-wine">
                            Inactive
                          </span>
                        )}
                      </p>
                      <p className="text-[12px] text-muted">{item.slug}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(item.id);
                          setEditingName(item.name);
                        }}
                        className="rounded-[2px] border-[0.8px] border-line px-3 py-1.5 text-[12px] font-medium text-ink disabled:opacity-60"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggleActive(item)}
                        className="rounded-[2px] border-[0.8px] border-line px-3 py-1.5 text-[12px] font-medium text-ink disabled:opacity-60"
                      >
                        {item.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(item)}
                        className="rounded-[2px] border-[0.8px] border-wine px-3 py-1.5 text-[12px] font-medium text-wine disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
