-- Only notify on key order milestones, not every status change.
-- Key statuses: pending (order placed), delivering (out for delivery),
-- completed (delivered), cancelled.
-- Minor intermediate statuses (confirmed, preparing) no longer generate
-- in-app notifications to avoid spamming the user.

CREATE OR REPLACE FUNCTION public.handle_order_status_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_title text;
    notification_body text;
BEGIN
    -- Only act on actual status changes (or new order insert)
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR (TG_OP = 'INSERT') THEN

        -- Only generate notifications for key milestones
        IF NEW.status IN ('pending', 'delivering', 'completed', 'cancelled') THEN

            CASE NEW.status
                WHEN 'pending' THEN
                    notification_title := 'Захиалга хүлээн авлаа';
                    notification_body := 'Таны ' || COALESCE(NEW.order_ref, 'захиалга') || ' дугаартай захиалгыг хүлээн авлаа. Бид удахгүй баталгаажуулах болно.';
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
                    notification_title := NULL;
                    notification_body := NULL;
            END CASE;

            IF notification_title IS NOT NULL AND NEW.user_id IS NOT NULL THEN
                INSERT INTO public.in_app_notifications (user_id, title, message, kind, metadata)
                VALUES (
                    NEW.user_id,
                    notification_title,
                    notification_body,
                    'order_status',
                    jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
    AFTER INSERT OR UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_notification();