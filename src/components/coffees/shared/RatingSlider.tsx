import { useCallback, useId } from 'react'
import { Label } from '@/components/ui/label'
import type { RatingScore } from '@/types'

const RATING_VALUES: RatingScore[] = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
const TICK_MARKS = [1, 2, 3, 4, 5]

type RatingSliderProps = {
  label: string
  name: string
  value: RatingScore
  onChange: (value: RatingScore) => void
  disabled?: boolean
  error?: string
  description?: string
}

/**
 * Validates if a number is a valid RatingScore.
 */
function isValidRatingScore(value: number): value is RatingScore {
  return RATING_VALUES.includes(value as RatingScore)
}

/**
 * Clamps and rounds a number to the nearest valid RatingScore.
 */
function toRatingScore(value: number): RatingScore {
  const clamped = Math.max(1, Math.min(5, value))
  const rounded = Math.round(clamped * 2) / 2
  return isValidRatingScore(rounded) ? rounded : 3
}

/**
 * Rating slider component supporting values 1-5 with 0.5 step increments.
 * Uses native input range with visual presentation of current value.
 */
export function RatingSlider({
  label,
  name,
  value,
  onChange,
  disabled = false,
  error,
  description,
}: RatingSliderProps) {
  const componentId = useId()
  const inputId = `${componentId}-${name}`
  const errorId = `${componentId}-${name}-error`
  const descriptionId = `${componentId}-${name}-description`

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const numValue = parseFloat(e.target.value)
      const ratingScore = toRatingScore(numValue)
      onChange(ratingScore)
    },
    [onChange]
  )

  const handleTickClick = useCallback(
    (tickValue: number) => {
      if (disabled) return
      const ratingScore = toRatingScore(tickValue)
      onChange(ratingScore)
    },
    [disabled, onChange]
  )

  // Build aria-describedby based on available elements
  const ariaDescribedBy = [
    description ? descriptionId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className="space-y-2">
      {/* Label with required indicator */}
      <div className="flex items-center justify-between">
        <Label htmlFor={inputId} className="text-sm font-medium">
          {label} <span className="text-destructive">*</span>
        </Label>
        <span
          className="text-lg font-semibold tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {value.toFixed(1)}
        </span>
      </div>

      {/* Description text */}
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {/* Slider container */}
      <div className="relative pt-1 pb-6">
        {/* Range input */}
        <input
          id={inputId}
          name={name}
          type="range"
          min={1}
          max={5}
          step={0.5}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={value}
          aria-valuetext={`${value} z 5`}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 accent-primary"
        />

        {/* Tick marks container */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
          {TICK_MARKS.map((tick) => (
            <button
              key={tick}
              type="button"
              onClick={() => handleTickClick(tick)}
              disabled={disabled}
              className="flex flex-col items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded disabled:cursor-not-allowed"
              tabIndex={-1}
              aria-hidden="true"
            >
              <span
                className={`w-0.5 h-2 ${
                  tick <= value ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
              <span
                className={`text-xs ${
                  tick <= value
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {tick}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
