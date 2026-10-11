import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFieldApi } from '@/lib/api/customField.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCustomFieldDefinitions = (projectId?: string | null) => {
  return useQuery({
    queryKey: QUERY_KEYS.customFields.definitions(projectId || ''),
    queryFn: () => customFieldApi.listDefinitions(projectId!),
    enabled: !!projectId,
  });
};

export const useCreateCustomFieldDefinition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      project_id: string;
      name: string;
      field_type: string;
      options?: string[];
      position?: number;
    }) => customFieldApi.createDefinition(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.customFields.definitions(variables.project_id),
      });
    },
  });
};

export const useDeleteCustomFieldDefinition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      customFieldApi.deleteDefinition(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.customFields.definitions(variables.projectId),
      });
    },
  });
};

export const useCustomFieldValues = (cardId?: string | null) => {
  return useQuery({
    queryKey: QUERY_KEYS.customFields.values(cardId || ''),
    queryFn: () => customFieldApi.listValues(cardId!),
    enabled: !!cardId,
  });
};

export const useSetCustomFieldValue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      card_id: string;
      field_id: string;
      value_text?: string | null;
      value_number?: number | null;
    }) => customFieldApi.setValue(data),
    onSuccess: (updatedValues, variables) => {
      queryClient.setQueryData(QUERY_KEYS.customFields.values(variables.card_id), updatedValues);
    },
  });
};
