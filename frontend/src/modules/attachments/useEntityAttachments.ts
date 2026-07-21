import { useCallback, useEffect, useState } from "react";

import { listAttachments } from "./attachments.service";
import type {
  AttachmentEntityType,
  AttachmentView,
  AttachmentsApiContext,
  AttachmentsSource,
} from "./attachments.types";

// PR-01 Ω4C — hook da aba "Arquivos": carrega os anexos de uma entidade (context de auth+tenant) e
// expõe {items, loading, forbidden, source, refresh}. O service já é honesto (D-007): mock/erro/403
// devolvem lista vazia; aqui só refletimos o estado para a UI. `refresh` é reusado após upload/exclusão.

export type UseEntityAttachments = {
  readonly items: readonly AttachmentView[];
  readonly loading: boolean;
  readonly forbidden: boolean;
  readonly source: AttachmentsSource;
  readonly refresh: () => Promise<void>;
};

export function useEntityAttachments(
  context: AttachmentsApiContext,
  entityType: AttachmentEntityType,
  entityId: string,
): UseEntityAttachments {
  const [items, setItems] = useState<readonly AttachmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [source, setSource] = useState<AttachmentsSource>("api");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAttachments(context, entityType, entityId);
      setItems(data.items);
      setForbidden(data.forbidden);
      setSource(data.source);
    } finally {
      setLoading(false);
    }
  }, [context, entityType, entityId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, forbidden, source, refresh };
}
