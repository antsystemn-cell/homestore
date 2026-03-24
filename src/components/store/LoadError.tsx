import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  message?: string;
  onRetry: () => void;
  retrying?: boolean;
}

const LoadError = ({ message = "Сүлжээний алдаа гарлаа", onRetry, retrying }: Props) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
      <WifiOff className="h-8 w-8 text-destructive" />
    </div>
    <p className="text-lg font-semibold text-foreground mb-1">{message}</p>
    <p className="text-sm text-muted-foreground mb-6">
      Интернэт холболтоо шалгаад дахин оролдоно уу
    </p>
    <Button
      variant="outline"
      onClick={onRetry}
      disabled={retrying}
      className="gap-2 rounded-xl"
    >
      <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
      {retrying ? "Ачаалж байна..." : "Дахин оролдох"}
    </Button>
  </div>
);

export default LoadError;