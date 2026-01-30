'use client'

import { Doc } from '@/types/document'
import { DocumentTile, DocumentTileSkeleton } from './DocumentTile'
import { FileText } from 'lucide-react'
import { useLingui } from '@lingui/react'
import { msg } from '@lingui/macro'

interface DocumentGridProps {
  documents: Doc[]
  locale: string
  isLoading?: boolean
}

export function DocumentGrid({ documents, locale, isLoading }: DocumentGridProps) {
  const { _ } = useLingui()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <DocumentTileSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-6">
          <FileText className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium">
          {_(msg`No documents yet`)}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {_(msg`Upload a document above to get started`)}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {documents.map((doc) => (
        <DocumentTile key={doc.id} document={doc} locale={locale} />
      ))}
    </div>
  )
}
