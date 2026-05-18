import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Copy, Eye, Search, X, Link as LinkIcon, Package, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  fetchCollections, createCollection, deleteCollection,
  buildCollectionUrl, type ProductCollection,
} from "@/lib/collections";

interface ProductLite {
  id: string;
  name: string;
  price: number;
  thumbnail_url?: string | null;
  image_url?: string | null;
  category?: string;
}

interface Props {
  products: ProductLite[];
}

const formatPrice = (n: number) => new Intl.NumberFormat("mn-MN").format(n) + "₮";

const CollectionsManager = ({ products }: Props) => {
  const [collections, setCollections] = useState<ProductCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setCollections(await fetchCollections());
    } catch (e: any) {
      toast.error(e.message || "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const productsById = useMemo(() => {
    const m = new Map<string, ProductLite>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setCustomCode(""); setSelected([]); setSearch("");
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) return toast.error("Гарчиг оруулна уу");
    if (selected.length === 0) return toast.error("Дор хаяж 1 бараа сонгоно уу");
    setSubmitting(true);
    try {
      const c = await createCollection({
        title: title.trim(),
        description: description.trim(),
        product_ids: selected,
        short_code: customCode.trim() || undefined,
      });
      toast.success("Багц үүсгэгдлээ");
      resetForm();
      await load();
      // auto-copy
      const url = buildCollectionUrl(c.short_code);
      navigator.clipboard?.writeText(url).catch(() => {});
      toast.success("Линк хуулагдлаа", { description: url });
    } catch (e: any) {
      toast.error(e.message || "Үүсгэж чадсангүй");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCollection(deleteId);
      toast.success("Устгагдлаа");
      setDeleteId(null);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Устгаж чадсангүй");
    }
  };

  const copyLink = (code: string) => {
    const url = buildCollectionUrl(code);
    navigator.clipboard?.writeText(url);
    toast.success("Линк хуулагдлаа", { description: url });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      {!showForm && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Олон төрлийн бараа сонгож, нэг линкээр хэрэглэгчрүү илгээх боломжтой.
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus size={16} /> Шинэ багц
          </Button>
        </div>
      )}

      {showForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Шинэ багц үүсгэх</h3>
            <Button variant="ghost" size="icon" onClick={resetForm}><X size={18} /></Button>
          </div>

          <div className="grid gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Гарчиг *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Жнь: Зуны цуглуулга" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Тайлбар (заавал биш)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Хүссэн URL (заавал биш)</label>
              <div className="flex items-stretch rounded-md border overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                <span className="px-3 flex items-center text-xs text-muted-foreground bg-muted border-r whitespace-nowrap">
                  {typeof window !== "undefined" ? window.location.origin : "https://easyshop.mn"}/c/
                </span>
                <input
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.replace(/\s+/g, ""))}
                  placeholder="зуны-цуглуулга эсвэл хоосон үлдээвэл автоматаар"
                  className="flex-1 px-3 py-2 text-sm bg-background outline-none"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                3-32 тэмдэгт. Зөвхөн үсэг, тоо, - _ зөвшөөрнө. Хоосон үлдээвэл системээс автоматаар үүсгэнэ.
              </p>
            </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Бараа сонгох ({selected.length} сонгосон)</label>
              {selected.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Цэвэрлэх</Button>
              )}
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Нэрээр хайх..." className="pl-9" />
            </div>

            <div className="border rounded-md max-h-80 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">Бараа олдсонгүй</p>
              ) : (
                <div className="divide-y">
                  {filteredProducts.map((p) => {
                    const isSel = selected.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleSelect(p.id)}
                        className={`w-full flex items-center gap-3 p-2 text-left hover:bg-muted/50 ${isSel ? "bg-primary/10" : ""}`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${isSel ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                          {isSel && <Check size={14} className="text-primary-foreground" />}
                        </div>
                        <img
                          src={p.thumbnail_url || p.image_url || "/placeholder.svg"}
                          alt={p.name}
                          loading="lazy"
                          className="w-10 h-10 rounded object-cover bg-muted flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(p.price)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={resetForm}>Болих</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Үүсгэж байна..." : "Үүсгэх ба линк хуулах"}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Ачаалж байна...</p>
        ) : collections.length === 0 ? (
          <div className="text-center py-12 border rounded-lg border-dashed">
            <Package className="mx-auto mb-3 text-muted-foreground" size={40} />
            <p className="text-muted-foreground">Багц байхгүй байна</p>
          </div>
        ) : (
          collections.map((c) => {
            const url = buildCollectionUrl(c.short_code);
            const items = (c.product_ids || []).map((id) => productsById.get(id)).filter(Boolean) as ProductLite[];
            return (
              <div key={c.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold truncate">{c.title}</h4>
                    {c.description && <p className="text-sm text-muted-foreground line-clamp-1">{c.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Package size={12} /> {c.product_ids?.length || 0} бараа</span>
                      <span className="flex items-center gap-1"><Eye size={12} /> {c.view_count} үзсэн</span>
                      <span>{new Date(c.created_at).toLocaleDateString("mn-MN")}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => copyLink(c.short_code)} className="gap-1">
                      <Copy size={14} /> Линк
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => window.open(`/c/${c.short_code}`, "_blank")} title="Урьдчилан харах">
                      <LinkIcon size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)} title="Устгах">
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {items.slice(0, 8).map((p) => (
                      <img
                        key={p.id}
                        src={p.thumbnail_url || p.image_url || "/placeholder.svg"}
                        alt={p.name}
                        loading="lazy"
                        title={p.name}
                        className="w-12 h-12 rounded object-cover bg-muted flex-shrink-0"
                      />
                    ))}
                    {items.length > 8 && (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                        +{items.length - 8}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Багц устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>Линк ажиллахаа болино. Үйлдлийг буцаах боломжгүй.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Болих</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Устгах</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CollectionsManager;
