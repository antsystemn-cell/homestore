-- Enable automated notifications on order status change
CREATE OR REPLACE FUNCTION public.handle_order_status_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_title text;
    notification_body text;
BEGIN
    -- Only notify on status changes
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR (TG_OP = 'INSERT') THEN
        
        -- Define message based on status
        CASE NEW.status
            WHEN 'pending' THEN
                notification_title := 'Захиалга хүлээн авлаа';
                notification_body := 'Таны ' || COALESCE(NEW.order_ref, 'захиалга') || ' дугаартай захиалгыг хүлээн авлаа. Бид удахгүй баталгаажуулах болно.';
            WHEN 'confirmed' THEN
                notification_title := 'Захиалга баталгаажлаа';
                notification_body := 'Таны ' || COALESCE(NEW.order_ref, 'захиалга') || ' дугаартай захиалга баталгаажлаа.';
            WHEN 'preparing' THEN
                notification_title := 'Баглаж байна';
                notification_body := 'Таны захиалгыг хүргэлтэнд бэлтгэж байна.';
            WHEN 'delivering' THEN
                notification_title := 'Хүргэлтэнд гарлаа';
                notification_body := 'Таны захиалга хүргэлтэнд гарлаа. Удахгүй таны гар дээр очих болно.';
            WHEN 'completed' THEN
                notification_title := 'Хүргэгдсэн';
                notification_body := 'Таны захиалга амжилттай хүргэгдлээ. Биднийг сонгосонд баярлалаа!';
            WHEN 'cancelled' THEN
                notification_title := 'Цуцлагдлаа';
                notification_body := 'Таны ' || COALESCE(NEW.order_ref, 'захиалга') || ' дугаартай захиалга цуцлагдлаа.';
            ELSE
                notification_title := 'Захиалгын төлөв өөрчлөгдлөө';
                notification_body := 'Таны захиалгын төлөв ' || NEW.status || ' болж өөрчлөгдлөө.';
        END CASE;

        -- Insert into in_app_notifications
        IF NEW.user_id IS NOT NULL THEN
            INSERT INTO public.in_app_notifications (user_id, title, message, kind, metadata)
            VALUES (NEW.user_id, notification_title, notification_body, 'order_status', jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
    AFTER INSERT OR UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_notification();
