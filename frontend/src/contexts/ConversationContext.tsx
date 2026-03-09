import { createContext, useContext, useState, type ReactNode } from "react";

interface ConversationContextValue {
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  isCallActive: boolean;
  setIsCallActive: (active: boolean) => void;
  wasTransferred: boolean;
  setWasTransferred: (transferred: boolean) => void;
  transferReason: string | null;
  setTransferReason: (reason: string | null) => void;
}

const ConversationContext = createContext<ConversationContextValue>({
  conversationId: null,
  setConversationId: () => {},
  isCallActive: false,
  setIsCallActive: () => {},
  wasTransferred: false,
  setWasTransferred: () => {},
  transferReason: null,
  setTransferReason: () => {},
});

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [wasTransferred, setWasTransferred] = useState(false);
  const [transferReason, setTransferReason] = useState<string | null>(null);

  return (
    <ConversationContext.Provider
      value={{
        conversationId, setConversationId,
        isCallActive, setIsCallActive,
        wasTransferred, setWasTransferred,
        transferReason, setTransferReason,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversationContext() {
  return useContext(ConversationContext);
}
