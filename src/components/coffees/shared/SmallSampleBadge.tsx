import { memo } from 'react'
import { Info } from 'lucide-react'

type SmallSampleBadgeProps = {
  className?: string
}

function SmallSampleBadgeComponent({ className = '' }: SmallSampleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800 dark:bg-orange-900 dark:text-orange-200 ${className}`}
      title="Ocena oparta na mniej niż 3 opiniach"
    >
      <Info className="h-3 w-3" aria-hidden="true" />
      Mała próba
    </span>
  )
}

export const SmallSampleBadge = memo(SmallSampleBadgeComponent)
