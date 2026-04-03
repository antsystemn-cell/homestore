import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GuestCheckoutModalProps {
  open: boolean;
  onContinueAsGuest: () => void;
}

const GuestCheckoutModal = ({ open, onContinueAsGuest }: GuestCheckoutModalProps) => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    // Save return URL so user comes back to checkout after auth
    sessionStorage.setItem("returnAfterAuth", "/checkout");
    navigate("/auth");
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        // Hide default close button
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-center">Анхааруулга</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed mt-2">
            Та сайтад бүртгүүлж, нэвтрээгүй үедээ зочин хэрэглэгчээр захиалга хийсэн тохиолдолд
            захиалгын түүхээ харах, захиалгын явцаа хянах боломжгүйг анхаарна уу.
            Хэрэв сайтад нэвтрээд захиалгаа хийвэл бүх захиалгын түүх хадгалагдаж, мөн
            захиалгынхаа явцыг хянах боломж болон олон бусад давуу талыг эдлэх боломжтой.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={handleSignIn} className="w-full h-11 rounded-xl">
            Бүртгүүлэх / Нэвтрэх
          </Button>
          <Button
            variant="outline"
            onClick={onContinueAsGuest}
            className="w-full h-11 rounded-xl"
          >
            Зочноор үргэлжлүүлэх
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestCheckoutModal;
