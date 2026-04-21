import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "xlsx" | "png";
}

export function NiimbotInstructionsModal({ open, onOpenChange, mode }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "xlsx" ? "Niimbot Excel импортлох заавар" : "Niimbot руу хэвлэх заавар"}
          </DialogTitle>
          <DialogDescription>
            {mode === "xlsx"
              ? "Татсан Excel файлаа Niimbot аппын Import Data Source функцэд оруулна."
              : "Татсан зургаа Niimbot аппаар нээж хэвлэнэ."}
          </DialogDescription>
        </DialogHeader>

        {mode === "xlsx" ? (
          <ol className="space-y-3 text-sm text-foreground list-decimal list-inside">
            <li>Niimbot аппаа нээгээд шошгоны загвараа сонгоно.</li>
            <li>
              <span className="font-semibold">Import Data Source</span> товчийг дарж, татсан Excel
              файлаа сонгоно.
            </li>
            <li>
              Текст талбар бүрд <span className="font-semibold">Insert variable</span> →
              баганаа сонгоно (order_no, customer_name, phone, address г.м).
            </li>
            <li>Бүх захиалгыг бөөнөөр <span className="font-semibold">Print</span> дарж хэвлэнэ.</li>
          </ol>
        ) : (
          <div className="space-y-4 text-sm text-foreground">
            <div>
              <p className="font-semibold mb-1">Android</p>
              <p className="text-muted-foreground">
                Татсан зургаа Niimbot апп дотор <span className="font-medium">Image Print</span>{" "}
                хэсгээр нээгээд хэвлэнэ үү.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">iOS</p>
              <p className="text-muted-foreground">
                Files → Niimbot руу Share хийж нээнэ үү.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Desktop</p>
              <p className="text-muted-foreground">
                Зургийг утсан дээр шилжүүлж Niimbot апп-аар нээнэ үү.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
