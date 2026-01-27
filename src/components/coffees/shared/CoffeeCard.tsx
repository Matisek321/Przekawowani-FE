import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RatingBadge } from './RatingBadge'
import { SmallSampleBadge } from './SmallSampleBadge'

export type CoffeeListItemVM = {
  id: string
  name: string
  roasteryId: string
  avgMain: number | null
  ratingsCount: number
  smallSample: boolean
  href: string
}

type CoffeeCardProps = {
  item: CoffeeListItemVM
}

function formatRatingsCount(count: number): string {
  if (count === 1) {
    return '1 ocena'
  }
  if (count >= 2 && count <= 4) {
    return `${count} oceny`
  }
  return `${count} ocen`
}

function CoffeeCardComponent({ item }: CoffeeCardProps) {
  return (
    <a
      href={item.href}
      className="block transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
    >
      <Card className="h-full cursor-pointer hover:border-primary/50 hover:shadow-md transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg line-clamp-2">{item.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <RatingBadge value={item.avgMain} />
            {item.smallSample && <SmallSampleBadge />}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatRatingsCount(item.ratingsCount)}
          </p>
        </CardContent>
      </Card>
    </a>
  )
}

export const CoffeeCard = memo(CoffeeCardComponent)
