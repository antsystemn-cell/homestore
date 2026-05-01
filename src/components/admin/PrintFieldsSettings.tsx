import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_PRINT_FIELDS,
  loadPrintFields,
  savePrintFields,
  type PrintFieldConfig,
} from "@/lib/printOrdersTable";

interface Props {
  /** Optional callback whenever fields change & saved */
  onChange?: (fields: PrintFieldConfig[]) => void;
}

export function PrintFieldsSettings({ onChange }: Props) {
  const [fields, setFields] = useState<PrintFieldConfig[]>(DEFAULT_PRINT_FIELDS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setFields(loadPrintFields());
  }, []);

  const toggle = (key: string) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f)));
    setDirty(true);
  };

  const move = (idx: number, dir: -1 | 1) => {
    setFields((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
    setDirty(true);
  };

  const save = () => {
    savePrintFields(fields);
    setDirty(false);
    onChange?.(fields);
    toast.success("Хэвлэх тохиргоо хадгалагдлаа");
  };

  const reset = () => {
    setFields(DEFAULT_PRINT_FIELDS);
    savePrintFields(DEFAULT_PRINT_FIELDS);
    setDirty(false);
    onChange?.(DEFAULT_PRINT_FIELDS);
    toast.success("Анхны төлөвт буцаалаа");
  };

  return (
    <div className="bg-card rounded-xl border border-border p-3 md:p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold">🖨️ Хэвлэх тохиргоо</h3>
          <p className="text-[11px] text-muted-foreground">Аль баганыг хэвлэх, ямар дараалалтай байх</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={reset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Анхны
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Хадгалах
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        {fields.map((f, idx) => (
          <div
            key={f.key}
            className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30 border border-border"
          >
            <div className="flex flex-col">
              <button
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="p-0.5 hover:bg-background rounded disabled:opacity-30"
                aria-label="Дээш"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => move(idx, 1)}
                disabled={idx === fields.length - 1}
                className="p-0.5 hover:bg-background rounded disabled:opacity-30"
                aria-label="Доош"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <Checkbox checked={f.enabled} onCheckedChange={() => toggle(f.key)} id={`pf-${f.key}`} />
            <label htmlFor={`pf-${f.key}`} className="text-sm font-medium cursor-pointer flex-1">
              {f.label}
            </label>
            <span className="text-[10px] text-muted-foreground font-mono">{f.key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
