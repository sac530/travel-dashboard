export type ChatRole = "user" | "assistant" | "system";

export type TravelResultCard = {
  type: "hotel" | "flight" | "deal" | "restaurant" | "attraction" | "weather" | "itinerary";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  price?: string;
  rating?: string;
  details?: string;
  provider?: string;
  url?: string;
  actionLabel?: string;
};

export type TravelChatMessage = {
  id: string;
  conversation_id: string;
  owner_email: string;
  role: ChatRole;
  content: string;
  structured: {
    cards?: TravelResultCard[];
    summary?: string;
    source?: string;
  } | null;
  created_at: string;
};

export type TravelChatConversation = {
  id: string;
  owner_email: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type TravelAgentResponse = {
  answer: string;
  cards: TravelResultCard[];
  source: "openclaw" | "local-main" | "offline";
};
