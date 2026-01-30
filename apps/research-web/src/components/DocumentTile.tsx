'use client'

import { Doc, DocStatus } from '@/types/document'
import { FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLingui } from '@lingui/react'
import { msg } from '@lingui/macro'

interface DocumentTileProps {
  document: Doc
  locale: string
}

export function DocumentTile({ document, locale }: DocumentTileProps) {
  const router = useRouter()
  const { _ } = useLingui()

  const handleClick = () => {
    router.push(`/${locale}/research/${document.id}`)
  }

  const getStatusInfo = (status: DocStatus) => {
    switch (status) {
      case 'processing':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
          text: _(msg`Processing`),
          color: 'text-blue-600',
        }
      case 'done':
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          text: _(msg`Done`),
          color: 'text-green-600',
        }
      case 'error':
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          text: _(msg`Error`),
          color: 'text-red-600',
        }
      default:
        return {
          icon: <FileText className="h-5 w-5 text-gray-500" />,
          text: _(msg`Unknown`),
          color: 'text-gray-600',
        }
    }
  }

  const statusInfo = getStatusInfo(document.status)
  const formattedDate = new Date(document.createdAt).toLocaleDateString(
    locale === 'ru' ? 'ru-RU' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  )

  // Use title if available, otherwise fallback to document name (filename)
  const displayTitle = document.title || document.name
  const showFileName = !!document.title // Only show filename if we have a custom title

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="truncate text-base font-semibold group-hover:text-primary">
            {displayTitle}
          </h3>
          {showFileName && (
            <p className="truncate text-xs text-muted-foreground mt-0.5">
              {document.name}
            </p>
          )}
          <div className="mt-1 flex items-center gap-2">
            {statusInfo.icon}
            <span className={`text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{formattedDate}</p>
        </div>
      </div>
    </div>
  )
}

export function DocumentTileSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
