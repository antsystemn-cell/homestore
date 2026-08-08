-- Enable automated notifications on order status change
CREATE OR REPLACE FUNCTION public.handle_order_status_notification()
RETURNS TRIGGER AS $$
DECLARE
    user_email text;
    notification_title text;
    notification_body text;
BEGIN
    -- Only notify on status changes
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR (TG_OP = 'INSERT') THEN
        
        -- Get user email if available
        IF NEW.user_id IS NOT NULL THEN
            SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
        END IF;

        -- Define message based on status
        CASE NEW.status
            WHEN 'pending' THEN
                notification_title := 'Захиалга хүлээн авлаа';
                notification_body := 'Таны ' || NEW.order_ref || ' дугаартай захиалгыг хүлээн авлаа. Бид удахгүй баталгаажуулах болно.';
            WHEN 'confirmed' THEN
                notification_title := 'Захиалга баталгаажлаа';
                notification_body := 'Таны ' || NEW.order_ref || ' дугаартай захиалга баталгаажлаа.';
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
                notification_body := 'Таны ' || NEW.order_ref || ' дугаартай захиалга цуцлагдлаа.';
            ELSE
                notification_title := 'Захиалгын төлөв өөрчлөгдлөө';
                notification_body := 'Таны захиалгын төлөв ' || NEW.status || ' болж өөрчлөгдлөө.';
        END CASE;

        -- Insert into in_app_notifications
        IF NEW.user_id IS NOT NULL THEN
            INSERT INTO public.in_app_notifications (user_id, title, message, type, related_id)
            VALUES (NEW.user_id, notification_title, notification_body, 'order_status', NEW.id);
        END IF;

        -- Here you would typically trigger an Edge Function for Email/SMS/Push
        -- perform net.http_post(...) if using pg_net
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
    AFTER INSERT OR UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_notification();

-- Grant permissions (assuming in_app_notifications exists based on logs)
GRANT ALL ON public.in_app_notifications TO authenticated;
GRANT ALL ON public.in_app_notifications TO service_role;
