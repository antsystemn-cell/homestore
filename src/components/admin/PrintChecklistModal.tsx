import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

const CHECKLIST = [
  { id: "paper", label: "A4 цаас portrait чиглэлээр тохируулсан" },
  { id: "margin", label: "Хэвлэгчийн маржин \"None\" эсвэл \"Minimum\" сонгосон" },
  { id: "scale", label: "Scale → 100% (\"Actual size\" эсвэл \"Default\")" },
  { id: "headers", label: "Headers/Footers унтраасан (URL, огноо хэвлэгдэхгүй)" },
  { id: "bg", label: "Background graphics / өнгө хэвлэх ON" },
  { id: "slips", label: "Preview дээр 8 slip нэг хуудсанд бүтэн харагдаж байгаа" },
  { id: "cut", label: "Текст таслагдаагүй, хүснэгт бүрэн багтсан" },
  { id: "gap", label: "Тасархай шугам (dashed border) slip хооронд харагдаж байгаа" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  count: number;
}

export function PrintChecklistModal({ open, onOpenChange, onConfirm, count }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allChecked = checked.size === CHECKLIST.length;
  const pages = Math.ceil(count / 8);

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) setChecked(new Set()); onOpenChange(v); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            🖨️ Хэвлэхийн өмнө шалгах
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1 text-sm">
              <p>{count} захиалга → {pages} A4 хуудас (хуудас бүрт 8 slip)</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          {CHECKLIST.map((item) => (
            <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
              <Checkbox
                checked={checked.has(item.id)}
                onCheckedChange={() => toggle(item.id)}
                id={item.id}
                className="mt-0.5"
              />
              <span className="text-sm leading-snug group-hover:text-foreground text-muted-foreground">
                {item.label}
              </span>
            </label>
          ))}
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">💡 Chrome/Edge тохиргоо:</p>
          <p>Print → More settings → Margins: None, Scale: 100%, Headers/footers: Off, Background graphics: On</p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setChecked(new Set())}>Болих</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { setChecked(new Set()); onConfirm(); }}
            disabled={!allChecked}
            className="disabled:opacity-50"
          >
            Бүгдийг шалгасан — Хэвлэх ({count})
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
