import { createContext, useContext, useState, type ReactNode } from "react";

interface ConversationContextValue {
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  isCallActive: boolean;
  setIsCallActive: (active: boolean) => void;
}

const ConversationContext = createContext<ConversationContextValue>({
  conversationId: null,
  setConversationId: () => {},
  isCallActive: false,
  setIsCallActive: () => {},
});

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);

  return (
    <ConversationContext.Provider
      value={{ conversationId, setConversationId, isCallActive, setIsCallActive }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversationContext() {
  return useContext(ConversationContext);
}
