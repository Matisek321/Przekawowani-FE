import { memo } from 'react'

type RatingBadgeProps = {
  value: number | null
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-xs',
  lg: 'px-2.5 py-1.5 text-sm',
}

function RatingBadgeComponent({ value, size = 'md' }: RatingBadgeProps) {
  const sizeClass = sizeClasses[size]

  if (value === null) {
    return (
      <span
        className={`inline-flex items-center rounded-md bg-muted font-medium text-muted-foreground ${sizeClass}`}
      >
        Brak ocen
      </span>
    )
  }

  // Color based on rating value
  let colorClasses = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  if (value >= 4.5) {
    colorClasses = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  } else if (value >= 3.5) {
    colorClasses = 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200'
  } else if (value < 2.5) {
    colorClasses = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  return (
    <span className={`inline-flex items-center rounded-md font-medium ${colorClasses} ${sizeClass}`}>
      {value.toFixed(1)}
    </span>
  )
}

export const RatingBadge = memo(RatingBadgeComponent)
