import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip } from 'recharts'
import { CarAnalysis } from '@/types/car'
import { useState, useEffect, useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Maximize2, X } from 'lucide-react'

interface PriceAnalysisProps {
  analysis: CarAnalysis
  onYearChange?: (year: number) => void
}

interface PricePoint {
  price: number
  kilometers: number
  name?: string
  url?: string
  year?: string
  isTarget?: boolean
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: PricePoint }>
  isHovering: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  formatPrice: (price: number) => string
}

const CustomTooltip = ({
  active,
  payload,
  isHovering,
  onMouseEnter,
  onMouseLeave,
  formatPrice,
}: CustomTooltipProps) => {
  if (!active && !isHovering) return null
  if (!payload || payload.length === 0) return null

  const data = payload[0].payload

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative transition-opacity duration-150 ease-out"
      style={{ zIndex: 80 }}
    >
      {/* Transparent bridge to maintain hover */}
      <div
        className="absolute left-0 right-0"
        style={{
          top: -10,
          height: '100%',
          pointerEvents: 'auto',
        }}
      />
      <div
        className="relative bg-white p-3 border rounded shadow-sm"
        style={{ pointerEvents: 'auto' }}
      >
        {data.name && (
          <p className="font-medium">
            {data.url ? (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {data.name} →
              </a>
            ) : (
              data.name
            )}
          </p>
        )}
        <p>{`Driven: ${Math.round(data.kilometers).toLocaleString()} km`}</p>
        <p>{`Price: ${formatPrice(Math.round(data.price))}`}</p>
        {data.year && <p>{`Year: ${data.year}`}</p>}
      </div>
    </div>
  )
}

export function PriceAnalysis({ analysis, onYearChange }: PriceAnalysisProps) {
  const { targetCar, similarListings, priceCurves, estimatedPrice, priceRange, priceModel } =
    analysis
  const [isTooltipHovering, setIsTooltipHovering] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  // Build year options & default to the year with the most listings
  useEffect(() => {
    const yearCounts = similarListings.reduce((acc, listing) => {
      if (listing.year) {
        const year = parseInt(listing.year)
        acc[year] = (acc[year] || 0) + 1
      }
      return acc
    }, {} as Record<number, number>)

    const years = Object.keys(yearCounts)
      .map((y) => parseInt(y))
      .sort((a, b) => b - a)

    setAvailableYears(years)

    if (years.length > 0) {
      const yearWithMostResults = years.reduce(
        (maxYear, y) => (yearCounts[y] > yearCounts[maxYear] ? y : maxYear),
        years[0]
      )
      setSelectedYear(yearWithMostResults)
    }
  }, [similarListings])

  // Prevent background scroll while expanded
  useEffect(() => {
    if (isExpanded) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = original
      }
    }
  }, [isExpanded])

  // Close on Esc
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsExpanded(false)
  }, [])
  useEffect(() => {
    if (!isExpanded) return
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isExpanded, onKeyDown])

  const formatPrice = (price: number) => {
    if (!price || isNaN(price)) return 'N/A'
    return new Intl.NumberFormat('is-IS', {
      style: 'currency',
      currency: 'ISK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getPriceAssessment = () => {
    const priceDiff = ((targetCar.price - estimatedPrice) / estimatedPrice) * 100
    if (priceDiff <= -10) return { text: 'Good Deal', color: 'text-green-600' }
    if (priceDiff >= 10) return { text: 'Expensive', color: 'text-red-600' }
    return { text: 'Fair Price', color: 'text-yellow-600' }
  }
  const assessment = getPriceAssessment()

  // Shared chart block (height is controlled by parent)
  const ChartBlock = (heightClass: string) => (
    <div className={heightClass}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
          <XAxis
            type="number"
            dataKey="kilometers"
            name="Kilometers"
            unit=" km"
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="number"
            dataKey="price"
            name="Price"
            tickFormatter={(value) => `${(value / 1_000_000).toFixed(1)}M`}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            isAnimationActive={false}
            content={(props) => (
              <div className="transition-opacity duration-150 ease-out">
                <CustomTooltip
                  {...props}
                  isHovering={isTooltipHovering}
                  onMouseEnter={() => setIsTooltipHovering(true)}
                  onMouseLeave={() => setIsTooltipHovering(false)}
                  formatPrice={formatPrice}
                />
              </div>
            )}
            wrapperStyle={{ zIndex: 80 }}
          />

          {/* Similar listings */}
          <Scatter
            name="Similar Cars"
            data={similarListings.filter((listing) => {
              if (listing.isTarget) return true
              const listingYear = listing.year ? parseInt(listing.year) : null
              return selectedYear ? listingYear === selectedYear : true
            })}
            fill="#94a3b8"
            opacity={0.6}
            onClick={(point: PricePoint) => {
              if (point?.url) {
                window.open(point.url, '_blank', 'noopener,noreferrer')
              }
            }}
            style={{ cursor: 'pointer' }}
          />
          {/* Price curves */}
          {Object.entries(priceCurves).map(([year, curve]) => {
            if (selectedYear && parseInt(year) !== selectedYear) return null

            const yearNum = parseInt(year)
            const maxYear = Math.max(...availableYears)
            const minYear = Math.min(...availableYears)
            const denom = Math.max(1, maxYear - minYear)
            const opacity = selectedYear ? 1 : 0.4 + 0.6 * ((yearNum - minYear) / denom)

            return (
              <Scatter
                key={year}
                name={`Price Curve ${year}`}
                data={curve as PricePoint[]}
                fill="none"
                line={{ stroke: '#2563eb', strokeWidth: 2, strokeOpacity: opacity }}
                lineType="joint"
              />
            )
          })}
          {/* Target car */}
          <Scatter name="Your Car" data={[targetCar as PricePoint]} fill="#ef4444" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )

  // Inner card content (reused in both normal and expanded modes)
  const CardInner = (isInOverlay: boolean) => {
    const modelQualitySpan = isInOverlay ? '' : 'col-span-2'

    return (
      <>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Price Analysis</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={selectedYear?.toString()}
              onValueChange={(value) => {
                const newYear = parseInt(value)
                setSelectedYear(newYear)
                onYearChange?.(newYear)
              }}
            >
              {/* NOTE: SelectContent portals to <body>. We bump z-index so it appears above the overlay. */}
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                <SelectGroup>
                  {availableYears.map((year) => {
                    const count = similarListings.filter(
                      (listing) => parseInt(listing.year ?? '0') === year
                    ).length
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year} <span className="font-bold">({count})</span>
                      </SelectItem>
                    )
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>

            {!isInOverlay ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(true)}
                aria-label="Expand"
                title="Expand"
                className="cursor-pointer"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(false)}
                aria-label="Close"
                title="Close"
                className="cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {ChartBlock(isInOverlay ? 'h-[75vh]' : 'h-[400px]')}

            {/* Metrics grid: 2 cols normally, 3 cols in overlay so Model Quality can sit beside Assessment */}
            <div className={`grid ${isInOverlay ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2'} gap-4`}>
              <div>
                <h3 className="text-sm font-medium">Estimated Fair Price</h3>
                <p className="text-2xl font-bold">{formatPrice(estimatedPrice)}</p>
                <p className="text-sm text-gray-500">
                  Range: {formatPrice(priceRange.low)} - {formatPrice(priceRange.high)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium">Assessment</h3>
                <p className={`text-2xl font-bold ${assessment.color}`}>
                  {assessment.text}
                </p>
                <p className="text-sm text-gray-500">Based on {priceModel.n_samples} similar cars</p>
              </div>

              <div className={modelQualitySpan}>
                <h3 className="text-sm font-medium">Model Quality</h3>
                <p className="text-sm text-gray-500">
                  R² Score: {(priceModel.r2 * 100).toFixed(1)}% • Average Error: ±
                  {formatPrice(priceModel.rmse)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </>
    )
  }

  return (
    <>
      {/* Normal inline card */}
      <Card>{CardInner(false)}</Card>

      {/* Expanded overlay */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          // Backdrop click closes
          onClick={() => setIsExpanded(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" />

          {/* Modal container (clicks here should NOT close) */}
          <div
            className="relative w-[95%] h-[90%] bg-white rounded-xl shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="border-none shadow-none flex-1 overflow-hidden">
              {CardInner(true)}
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
