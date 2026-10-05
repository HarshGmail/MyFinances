import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../client';
import {
  CardSenderSuggestion,
  CardSyncJobStatus,
  CardTransactionAlert,
  CreditCard,
  CreditCardStatement,
  CreditCardTransaction,
} from '../../types';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const SYNC_POLL_INTERVAL_MS = 5000;

function cardIdQuery(cardId?: string) {
  return cardId ? `?cardId=${encodeURIComponent(cardId)}` : '';
}

export function useCreditCardsQuery() {
  return useQuery<CreditCard[]>({
    queryKey: ['credit-cards'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/credit-cards', method: 'GET' });
      return response.data;
    },
    staleTime: FIVE_MINUTES_MS,
  });
}

export function useCreditCardStatementsQuery(cardId?: string) {
  return useQuery<CreditCardStatement[]>({
    queryKey: ['credit-card-statements', cardId ?? 'all'],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/credit-cards/statements${cardIdQuery(cardId)}`,
        method: 'GET',
      });
      return response.data;
    },
    staleTime: FIVE_MINUTES_MS,
  });
}

export function useCreditCardTransactionsQuery(cardId?: string) {
  return useQuery<CreditCardTransaction[]>({
    queryKey: ['credit-card-transactions', cardId ?? 'all'],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/credit-cards/transactions${cardIdQuery(cardId)}`,
        method: 'GET',
      });
      return response.data;
    },
    staleTime: FIVE_MINUTES_MS,
  });
}

export function useCreditCardAlertsQuery(cardId?: string) {
  return useQuery<CardTransactionAlert[]>({
    queryKey: ['credit-card-alerts', cardId ?? 'all'],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/credit-cards/alerts${cardIdQuery(cardId)}`,
        method: 'GET',
      });
      return response.data;
    },
    staleTime: FIVE_MINUTES_MS,
  });
}

export function useCardSenderSuggestionsQuery(enabled: boolean) {
  return useQuery<CardSenderSuggestion[]>({
    queryKey: ['credit-card-sender-suggestions'],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: '/credit-cards/sender-suggestions',
        method: 'GET',
      });
      return response.data;
    },
    enabled,
    staleTime: FIVE_MINUTES_MS,
  });
}

export function useCardSyncJobStatusQuery(jobId: string | null) {
  return useQuery<CardSyncJobStatus>({
    queryKey: ['credit-card-sync-status', jobId],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/email-integration/sync-status/${jobId}`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: !!jobId,
    refetchInterval: (query) =>
      query.state.data?.status === 'processing' || !query.state.data
        ? SYNC_POLL_INTERVAL_MS
        : false,
  });
}
