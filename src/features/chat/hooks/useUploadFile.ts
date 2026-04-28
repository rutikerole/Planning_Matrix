// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #68 — useUploadFile mutation
//
// Wraps uploadProjectFile + drives the chatStore's pendingAttachments
// slice. The component layer (AttachmentPicker / drag-drop) calls
// `mutate({ file, category })` and the hook handles:
//
//   1. Add a queued chip to the store immediately (with object-URL
//      preview if it's an image).
//   2. Update chip status to `uploading` while the request is in
//      flight.
//   3. On success, swap chip status to `uploaded` and stash the
//      project_files row id so chat-turn can link it.
//   4. On failure, mark chip `failed` with the error message so the
//      retry-X path in AttachmentChip can surface it.
//
// Document linkage (Q9 locked: auto-set on b_plan / plot_plan /
// building_plan upload) runs after the row insert, before chat-turn.
// ───────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadProjectFile, UploadError } from '@/lib/uploadApi'
import { useChatStore } from '@/stores/chatStore'
import type { FileCategory, PendingAttachment } from '@/types/chatInput'
import { applyDocumentLinkage, shouldAutoLink } from '../lib/documentLinkage'

interface MutateArgs {
  projectId: string
  file: File
  category: FileCategory
}

export function useUploadFile() {
  const queryClient = useQueryClient()
  const addAttachment = useChatStore((s) => s.addAttachment)
  const updateAttachment = useChatStore((s) => s.updateAttachment)

  return useMutation({
    mutationKey: ['uploadFile'],
    retry: 0,

    mutationFn: async (args: MutateArgs) => {
      const id = crypto.randomUUID()
      const previewUrl = args.file.type.startsWith('image/')
        ? URL.createObjectURL(args.file)
        : null
      const seed: PendingAttachment = {
        id,
        file: args.file,
        previewUrl,
        status: 'queued',
        storagePath: null,
        fileRowId: null,
        category: args.category,
        errorMessage: null,
      }
      addAttachment(seed)

      // Flip to uploading immediately so the chip's spinner shows.
      updateAttachment(id, { status: 'uploading' })

      try {
        const { row } = await uploadProjectFile({
          projectId: args.projectId,
          file: args.file,
          category: args.category,
        })

        updateAttachment(id, {
          status: 'uploaded',
          storagePath: row.storage_path,
          fileRowId: row.id,
        })

        // Q9 locked — auto-link b_plan / plot_plan / building_plan into
        // the document checklist if the model has emitted a matching
        // entry. We mutate the cached project state via the document
        // linkage helper; chat-turn isn't called here.
        if (shouldAutoLink(args.category)) {
          await applyDocumentLinkage({
            queryClient,
            projectId: args.projectId,
            fileRowId: row.id,
            category: args.category,
          })
        }

        return { localId: id, row }
      } catch (err) {
        const message =
          err instanceof UploadError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Hochladen fehlgeschlagen.'
        updateAttachment(id, { status: 'failed', errorMessage: message })
        throw err
      }
    },
  })
}

