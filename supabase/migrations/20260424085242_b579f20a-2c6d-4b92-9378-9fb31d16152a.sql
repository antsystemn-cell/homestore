CREATE TABLE public.chatbot_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  bot_name TEXT NOT NULL DEFAULT 'Эйси',
  greeting_message TEXT NOT NULL DEFAULT 'Сайн байна уу! Би easyshop.mn-ийн туслах. Танд юугаар туслах вэ?',
  system_prompt TEXT NOT NULL DEFAULT 'Та easyshop.mn онлайн дэлгүүрийн туслах ажилтан. Монгол хэлээр товч, найрсаг хариу өгнө. Бүтээгдэхүүний мэдээлэл, захиалга, хүргэлт, төлбөрийн талаар тусална. QPay болон бэлэн мөнгөөр төлбөр хийх боломжтой гэдгийг мэдэгдэнэ. Захиалгын дэлгэрэнгүй мэдээлэл авахад Facebook Messenger эсвэл утасны дугаар руу холбогдохыг зөвлөнө.',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chatbot_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chatbot settings viewable by everyone"
ON public.chatbot_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can insert chatbot settings"
ON public.chatbot_settings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update chatbot settings"
ON public.chatbot_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_chatbot_settings_updated_at
BEFORE UPDATE ON public.chatbot_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.chatbot_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;