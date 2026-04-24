ALTER TABLE public.chatbot_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatbot_settings;