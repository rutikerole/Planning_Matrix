// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #68 — useDeleteFile mutation
//
// Removes a pending attachment chip BEFORE send: storage object first,
// then project_files row. The chatStore's pendingAttachments slice is
// the source of truth for chip rendering, so we drop the attachment
// from there in onSettled (whether success or error — the chip should
// always disappear from the input bar after a remove click).
// ───────────────────────────────────────────────────────────────────────

import { useMutation } from '@tanstack/react-query'
import { deletePendingFile } from '@/lib/uploadApi'
import { useChatStore } from '@/stores/chatStore'

interface MutateArgs {
  /** Local id from the chatStore's pendingAttachments. */
  localId: string
  /** project_files.id — null when the upload never completed. */
  fileRowId: string | null
}

export function useDeleteFile() {
  const removeAttachment = useChatStore((s) => s.removeAttachment)

  return useMutation({
    mutationKey: ['deleteFile'],
    retry: 0,
    mutationFn: async (args: MutateArgs) => {
      if (args.fileRowId) {
        await deletePendingFile(args.fileRowId)
      }
    },
    onSettled: (_data, _err, args) => {
      // Drop the chip from the store regardless of network outcome —
      // the user clicked remove and expects it gone. If the storage
      // object was orphaned, the cleanup cron handles it (Phase 4).
      removeAttachment(args.localId)
    },
  })
}
