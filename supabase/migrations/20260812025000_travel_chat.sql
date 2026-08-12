CREATE TABLE IF NOT EXISTS travel_chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_email TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New travel chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS travel_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES travel_chat_conversations(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  structured JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_chat_conversations_owner
  ON travel_chat_conversations(owner_email, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_travel_chat_messages_conversation
  ON travel_chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_travel_chat_messages_owner
  ON travel_chat_messages(owner_email, created_at DESC);
