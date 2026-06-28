-- Enable Supabase Realtime for the room tables (instant chat/state/selection sync).
ALTER PUBLICATION supabase_realtime ADD TABLE muendlich_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE muendlich_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE muendlich_selections;
ALTER PUBLICATION supabase_realtime ADD TABLE muendlich_chat;
