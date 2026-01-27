import { memo, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'

export type PaginationState = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type PaginationControlsProps = {
  pagination: PaginationState
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100] as const

function PaginationControlsComponent({
  pagination,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const { page, pageSize, totalPages } = pagination

  // Calculate visible page numbers with ellipses
  const visiblePages = useMemo(() => {
    const pages: number[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
      return pages
    }

    // Always show first page
    pages.push(1)

    // Calculate range around current page
    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)

    if (start > 2) {
      pages.push(-1) // Ellipsis marker
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (end < totalPages - 1) {
      pages.push(-2) // Ellipsis marker
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }, [page, totalPages])

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onPageSizeChange(Number(e.target.value))
    },
    [onPageSizeChange]
  )

  // Don't render if single page with default page size
  if (totalPages <= 1 && pageSize === 100) {
    return null
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      <div className="flex items-center gap-2">
        <label htmlFor="pagination-page-size" className="text-sm text-muted-foreground">
          Na stronie:
        </label>
        <select
          id="pagination-page-size"
          value={pageSize}
          onChange={handlePageSizeChange}
          className="h-9 rounded-md border bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Liczba elementów na stronie"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Nawigacja stron">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Poprzednia strona"
          >
            ←
          </Button>

          {visiblePages.map((pageNum, index) => {
            if (pageNum < 0) {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-muted-foreground"
                  aria-hidden="true"
                >
                  ...
                </span>
              )
            }

            return (
              <Button
                key={pageNum}
                variant={pageNum === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                aria-label={`Strona ${pageNum}`}
                aria-current={pageNum === page ? 'page' : undefined}
              >
                {pageNum}
              </Button>
            )
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Następna strona"
          >
            →
          </Button>
        </nav>
      )}
    </div>
  )
}

export const PaginationControls = memo(PaginationControlsComponent)
