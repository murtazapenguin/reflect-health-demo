import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "/api/v1";

export type PipelineStage =
  | "idle"
  | "connected"
  | "npi_verifying"
  | "npi_done"
  | "zip_verifying"
  | "zip_done"
  | "member_verifying"
  | "member_done"
  | "data_retrieving"
  | "data_done"
  | "complete";

export interface CallEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface VerificationStatus {
  npi: { done: boolean; valid?: boolean; providerName?: string; practiceName?: string; npi?: string };
  zip: { done: boolean; verified?: boolean; zipCode?: string; providerName?: string };
  member: {
    done: boolean;
    verified?: boolean;
    memberId?: string;
    patientName?: string;
    planName?: string;
    status?: string;
    callerType?: string;
    message?: string;
  };
}

export interface DataResult {
  type: "eligibility" | "claims" | null;
  data: Record<string, unknown>;
}

export function useCallEvents(conversationId: string | null) {
  const [events, setEvents] = useState<CallEvent[]>([]);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("idle");
  const [verification, setVerification] = useState<VerificationStatus>({
    npi: { done: false },
    zip: { done: false },
    member: { done: false },
  });
  const [dataResult, setDataResult] = useState<DataResult>({ type: null, data: {} });
  const [isTransfer, setIsTransfer] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    setEvents([]);
    setPipelineStage("idle");
    setVerification({ npi: { done: false }, zip: { done: false }, member: { done: false } });
    setDataResult({ type: null, data: {} });
    setIsTransfer(false);
  }, []);

  useEffect(() => {
    if (!conversationId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    reset();
    setPipelineStage("connected");

    const es = new EventSource(
      `${API_BASE}/voice/events/stream?conversation_id=${encodeURIComponent(conversationId)}`
    );
    eventSourceRef.current = es;

    const handleEvent = (e: MessageEvent) => {
      try {
        const event: CallEvent = JSON.parse(e.data);
        setEvents((prev) => [...prev, event]);

        switch (event.type) {
          case "npi_verified":
            setVerification((v) => ({
              ...v,
              npi: {
                done: true,
                valid: event.data.valid as boolean,
                providerName: event.data.provider_name as string,
                practiceName: event.data.practice_name as string,
                npi: event.data.npi as string,
              },
            }));
            setPipelineStage("npi_done");
            break;

          case "zip_verified":
            setVerification((v) => ({
              ...v,
              zip: {
                done: true,
                verified: event.data.verified as boolean,
                zipCode: event.data.zip_code as string,
                providerName: event.data.provider_name as string,
              },
            }));
            setPipelineStage("zip_done");
            break;

          case "member_verified":
            setVerification((v) => ({
              ...v,
              member: {
                done: true,
                verified: event.data.verified as boolean,
                memberId: event.data.member_id as string,
                patientName: event.data.patient_name as string,
                planName: event.data.plan_name as string,
                status: event.data.status as string,
                callerType: event.data.caller_type as string,
                message: event.data.message as string,
              },
            }));
            setPipelineStage("member_done");
            break;

          case "eligibility_retrieved":
            setDataResult({ type: "eligibility", data: event.data });
            setPipelineStage("data_done");
            break;

          case "claim_retrieved":
            setDataResult({ type: "claims", data: event.data });
            setPipelineStage("data_done");
            break;

          case "session_ended":
            setPipelineStage("complete");
            break;
        }
      } catch {
        // ignore parse errors
      }
    };

    es.addEventListener("session_started", handleEvent);
    es.addEventListener("npi_verified", handleEvent);
    es.addEventListener("zip_verified", handleEvent);
    es.addEventListener("member_verified", handleEvent);
    es.addEventListener("eligibility_retrieved", handleEvent);
    es.addEventListener("claim_retrieved", handleEvent);
    es.addEventListener("session_ended", handleEvent);

    es.onerror = () => {
      // EventSource will auto-reconnect; no action needed
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [conversationId, reset]);

  return {
    events,
    pipelineStage,
    verification,
    dataResult,
    isTransfer,
    setIsTransfer,
    reset,
  };
}
