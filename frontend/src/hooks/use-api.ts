import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, QAReviewInput } from "@/lib/api";

export function useKPIs() {
  return useQuery({
    queryKey: ["kpis"],
    queryFn: () => api.getKPIs(),
    refetchInterval: 30_000,
  });
}

export function useKPITrend(days = 30) {
  return useQuery({
    queryKey: ["kpiTrend", days],
    queryFn: () => api.getKPITrend(days),
  });
}

export function useCalls(params: Record<string, string | number | null | undefined> = {}) {
  return useQuery({
    queryKey: ["calls", params],
    queryFn: () => api.getCalls(params),
  });
}

export function useCallDetail(callId: string | undefined) {
  return useQuery({
    queryKey: ["call", callId],
    queryFn: () => api.getCallDetail(callId!),
    enabled: !!callId,
  });
}

export function useUpdateTags(callId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tags: string[]) => api.updateCallTags(callId, tags),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["call", callId] });
      qc.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}

export function useUpdateFlag(callId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (flagged: boolean) => api.updateCallFlag(callId, flagged),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["call", callId] });
      qc.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}

export function useCallReviews(callId: string | undefined) {
  return useQuery({
    queryKey: ["callReviews", callId],
    queryFn: () => api.getCallReviews(callId!),
    enabled: !!callId,
  });
}

export function useSubmitReview(callId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: QAReviewInput) => api.submitQAReview(callId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["callReviews", callId] });
      qc.invalidateQueries({ queryKey: ["accuracyKPIs"] });
    },
  });
}

export function useAccuracyKPIs() {
  return useQuery({
    queryKey: ["accuracyKPIs"],
    queryFn: () => api.getAccuracyKPIs(),
    refetchInterval: 60_000,
  });
}

export function useCallerContext(memberId: string | undefined) {
  return useQuery({
    queryKey: ["callerContext", memberId],
    queryFn: () => api.getCallerContext(memberId!),
    enabled: !!memberId,
  });
}
