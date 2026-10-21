"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Shield,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  MousePointerClick,
  Globe,
  UserCheck,
  LayoutGrid,
} from "lucide-react";
import {
  ACCESS_OPTIONS,
  PAGES,
  blankConfig,
  normalizeConfig,
  type PageAccess,
  type PageKey,
  type Privilege,
  type PrivilegeConfig,
} from "@/lib/privileges";
import { invalidatePrivilegesCache } from "@/lib/use-privileges";

const ACCESS_ICON: Record<PageAccess, typeof Eye> = {
  full: MousePointerClick,
  readonly: Eye,
  disabled: EyeOff,
  hidden: Lock,
};

function resumoAcesso(p: Privilege): string {
  const cfg = normalizeConfig(p.config);
  const full = PAGES.filter((pg) => cfg.pages[pg.key].access === "full").length;
  const ro = PAGES.filter((pg) => cfg.pages[pg.key].access === "readonly").length;
  if (full === PAGES.length) return "Acesso total a todas as páginas";
  if (full === 0 && ro === 0) return "Sem páginas liberadas";
  const parts = [];
  if (full > 0) parts.push(`${full} com acesso total`);
  if (ro > 0) parts.push(`${ro} somente visualização`);
  return parts.join(" · ");
}

export function PrivilegesManager({
  onFeedback,
}: {
  onFeedback: (kind: "error" | "success", msg: string) => void;
}) {
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Privilege | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState<PrivilegeConfig>(blankConfig());
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPrivileges = useCallback(async () => {
    try {
      const res = await fetch("/api/privileges");
      const data = await res.json();
      if (!res.ok) {
        onFeedback("error", `Erro ao carregar privilégios: ${data.error || "Erro desconhecido"}`);
      } else {
        setPrivileges(data.privileges ?? []);
      }
    } catch {
      onFeedback("error", "Erro de conexão ao buscar privilégios.");
    } finally {
      setLoading(false);
    }
  }, [onFeedback]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchPrivileges();
    });
  }, [fetchPrivileges]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setConfig(blankConfig());
    setModalOpen(true);
  }

  function openEdit(p: Privilege) {
    setEditing(p);
    setName(p.name);
    setDescription(p.description ?? "");
    setConfig(normalizeConfig(p.config));
    setModalOpen(true);
  }

  function setPageAccess(page: PageKey, access: PageAccess) {
    setConfig((prev) => ({
      pages: {
        ...prev.pages,
        [page]: { ...prev.pages[page], access },
      },
    }));
  }

  function setPageScope(page: PageKey, scope: "all" | "own") {
    setConfig((prev) => ({
      pages: {
        ...prev.pages,
        [page]: { ...prev.pages[page], scope },
      },
    }));
  }

  function toggleFeature(page: PageKey, feature: string) {
    setConfig((prev) => ({
      pages: {
        ...prev.pages,
        [page]: {
          ...prev.pages[page],
          features: {
            ...prev.pages[page].features,
            [feature]: !prev.pages[page].features[feature],
          },
        },
      },
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      onFeedback("error", "Informe um nome para o privilégio.");
      return;
    }
    setSaving(true);
    onFeedback("success", "");
    try {
      const isEdit = !!editing;
      const res = await fetch(
        isEdit ? `/api/privileges/${editing!.id}` : "/api/privileges",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description, config }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        onFeedback("error", data.error || "Erro ao salvar privilégio.");
      } else {
        invalidatePrivilegesCache();
        onFeedback(
          "success",
          isEdit
            ? `Privilégio "${name.trim()}" atualizado.`
            : `Privilégio "${name.trim()}" criado. Atribua-o na lista de usuários.`
        );
        setModalOpen(false);
        await fetchPrivileges();
      }
    } catch {
      onFeedback("error", "Erro de conexão ao salvar privilégio.");
    }
    setSaving(false);
  }

  async function handleDelete(p: Privilege) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/privileges/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        onFeedback("error", data.error || "Erro ao excluir privilégio.");
      } else {
        invalidatePrivilegesCache();
        onFeedback("success", `Privilégio "${p.name}" excluído. Usuários com esse privilégio voltam ao padrão "Usuário" até nova atribuição.`);
        await fetchPrivileges();
      }
    } catch {
      onFeedback("error", "Erro de conexão ao excluir privilégio.");
    }
    setDeleting(false);
    setDeleteConfirm(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--muted)" }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {privileges.length} privilégio{privileges.length !== 1 ? "s" : ""} cadastrado{privileges.length !== 1 ? "s" : ""}. Atribua-os aos usuários na aba Usuários.
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 cursor-pointer"
          style={{ color: "#ffffff", background: `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))` }}
        >
          <Plus size={14} />
          Novo Privilégio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {privileges.map((p) => (
          <div
            key={p.id}
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: `linear-gradient(135deg, var(--card-bg), var(--background))`, border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--nav-active-bg)", border: "1px solid var(--nav-active-border)" }}
                >
                  {p.is_system ? (
                    <ShieldCheck size={14} style={{ color: "var(--accent-text)" }} />
                  ) : (
                    <Shield size={14} style={{ color: "var(--accent-text)" }} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{p.name}</span>
                    {p.slug === "admin" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent-text)" }}>
                        acesso pleno
                      </span>
                    )}
                    {p.slug === "usuario" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: "var(--input-bg)", color: "var(--muted)", border: "1px solid var(--input-border)" }}>
                        padrão
                      </span>
                    )}
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--muted)" }}>{resumoAcesso(p)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {p.slug !== "admin" && (
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--input-bg)] hover:text-[var(--foreground)]"
                    style={{ color: "var(--muted)" }}
                    title="Editar privilégio"
                  >
                    <Pencil size={13} />
                  </button>
                )}
                {!p.is_system && (
                  deleteConfirm === p.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={deleting}
                        className="text-[10px] px-2 py-1 rounded transition-colors cursor-pointer"
                        style={{ color: "var(--danger)" }}
                      >
                        {deleting ? "..." : "Sim"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-[10px] px-2 py-1 rounded transition-colors cursor-pointer"
                        style={{ color: "var(--muted)" }}
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(p.id)}
                      className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--input-bg)] hover:text-[var(--danger)]"
                      style={{ color: "var(--muted)" }}
                      title="Excluir privilégio"
                    >
                      <Trash2 size={13} />
                    </button>
                  )
                )}
              </div>
            </div>
            {p.description && (
              <p className="text-[11px] leading-snug" style={{ color: "var(--muted)" }}>{p.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* Modal criar/editar privilégio */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--table-border)" }}>
              <div className="flex items-center gap-2">
                <Shield size={16} style={{ color: "var(--accent-text)" }} />
                <h2 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                  {editing ? `Editar Privilégio — ${editing.name}` : "Criar Novo Privilégio"}
                </h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="transition-colors cursor-pointer" style={{ color: "var(--muted)" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col min-h-0">
              <div className="overflow-y-auto p-6 space-y-5 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Nome do privilégio</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: CS Viewer, Farming Editor"
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Descrição (opcional)</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Para quem é este privilégio?"
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <LayoutGrid size={12} style={{ color: "var(--accent-text)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Páginas e funções</span>
                  </div>
                  <p className="text-[10px] mb-3" style={{ color: "var(--muted)" }}>
                    Para cada página: escolha se fica oculta, visível porém bloqueada (cinza na sidebar), somente visualização ou acesso total — e o escopo dos dados.
                  </p>

                  <div className="space-y-3">
                    {PAGES.map((page) => {
                      const rule = config.pages[page.key];
                      const aberto = rule.access === "full" || rule.access === "readonly";
                      return (
                        <div
                          key={page.key}
                          className="rounded-xl p-3.5"
                          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{page.label}</span>
                                <span className="text-[9px]" style={{ color: "var(--muted)" }}>{page.href}</span>
                              </div>
                              <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{page.description}</p>
                            </div>
                            {/* Segmented: nível de acesso */}
                            <div className="flex items-center rounded-lg overflow-hidden flex-shrink-0" style={{ border: "1px solid var(--input-border)" }}>
                              {ACCESS_OPTIONS.map((opt, idx) => {
                                const Icon = ACCESS_ICON[opt.value];
                                const active = rule.access === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setPageAccess(page.key, opt.value)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium transition-all cursor-pointer ${active ? "hover:opacity-90" : "hover:bg-[var(--nav-active-bg)] hover:text-[var(--foreground)]"}`}
                                    title={opt.label}
                                    aria-pressed={active}
                                    style={{
                                      background: active
                                        ? `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))`
                                        : "transparent",
                                      color: active ? "#ffffff" : "var(--muted)",
                                      borderRight: idx < ACCESS_OPTIONS.length - 1 ? "1px solid var(--input-border)" : undefined,
                                      boxShadow: active ? "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)" : undefined,
                                    }}
                                  >
                                    <Icon size={11} />
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {aberto && (
                            <div className="mt-3 pt-3 space-y-2.5" style={{ borderTop: "1px solid var(--input-border)" }}>
                              {/* Escopo de dados */}
                              <div className="flex items-center gap-4 flex-wrap">
                                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Dados</span>
                                <label className="flex items-center gap-1.5 cursor-pointer rounded-lg px-1.5 py-1 transition-all hover:bg-[var(--input-bg)]">
                                  <input
                                    type="radio"
                                    name={`scope-${page.key}`}
                                    checked={rule.scope === "all"}
                                    onChange={() => setPageScope(page.key, "all")}
                                    style={{ accentColor: "var(--accent)" }}
                                  />
                                  <Globe size={11} style={{ color: "var(--muted)" }} />
                                  <span className="text-[11px] font-medium" style={{ color: rule.scope === "all" ? "var(--accent-text)" : "var(--foreground)" }}>Ver tudo (geral)</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer rounded-lg px-1.5 py-1 transition-all hover:bg-[var(--input-bg)]">
                                  <input
                                    type="radio"
                                    name={`scope-${page.key}`}
                                    checked={rule.scope === "own"}
                                    onChange={() => setPageScope(page.key, "own")}
                                    style={{ accentColor: "var(--accent)" }}
                                  />
                                  <UserCheck size={11} style={{ color: "var(--muted)" }} />
                                  <span className="text-[11px] font-medium" style={{ color: rule.scope === "own" ? "var(--accent-text)" : "var(--foreground)" }}>Somente dados atribuídos</span>
                                </label>
                              </div>

                              {/* Funções granulares da página */}
                              {page.features.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {page.features.map((f) => {
                                    const on = rule.features[f.key] !== false;
                                    return (
                                      <label
                                        key={f.key}
                                        className={`flex items-start gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-all ${on ? "hover:opacity-90" : "hover:bg-[var(--input-bg)] hover:border-[var(--nav-active-border)]"}`}
                                        style={{
                                          background: on ? "var(--nav-active-bg)" : "transparent",
                                          border: `1px solid ${on ? "var(--nav-active-border)" : "var(--input-border)"}`,
                                        }}
                                        title={f.description}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={on}
                                          onChange={() => toggleFeature(page.key, f.key)}
                                          className="mt-0.5"
                                          style={{ accentColor: "var(--accent)" }}
                                        />
                                        <span className="min-w-0">
                                          <span className="block text-[11px] font-medium leading-tight" style={{ color: on ? "var(--accent-text)" : "var(--foreground)" }}>{f.label}</span>
                                          <span className="block text-[9px] leading-tight mt-0.5" style={{ color: "var(--muted)" }}>{f.description}</span>
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] mt-3 flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                    <Lock size={10} />
                    Gerenciamento de Usuários e Privilégios permanece exclusivo do Admin.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--table-border)" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{ color: "#ffffff", background: `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))` }}
                >
                  <Save size={14} />
                  {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar Privilégio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
