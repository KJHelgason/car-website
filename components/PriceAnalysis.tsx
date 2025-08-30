import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip } from 'recharts'
import { CarAnalysis } from '@/types/car'
import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { supabase } from '@/lib/supabase'

interface PriceAnalysisProps {
  analysis: CarAnalysis
  onYearChange?: (year: number) => void
  /** 'all' | 'YYYY' from the search form */
  searchedYear?: string | null
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

type CoefJson = {
  intercept: number
  beta_age: number
  beta_logkm: number
  beta_age_logkm: number
}

type PriceModelLike = CarAnalysis['priceModel'] & {
  make_norm?: string
  model_base?: string
  tier?: 'model_year' | 'model' | 'make' | 'global'
  year?: number
}

const CustomTooltip = ({
  active,
  payload,
  isHovering,
  onMouseEnter,
  onMouseLeave,
  formatPrice,
  selectedYear,
  currentCurve,
}: CustomTooltipProps & {
  selectedYear: number | null
  currentCurve: PricePoint[] | undefined
}) => {
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
        {selectedYear && currentCurve && !data.isTarget && (
          <p className="mt-1 text-sm text-gray-600">
            {(() => {
              const expectedPrice = currentCurve.find(
                point => Math.abs(point.kilometers - data.kilometers) < 5000
              )?.price
              if (!expectedPrice) return null
              const diff = ((expectedPrice - data.price) / expectedPrice) * 100
              return (
                <span className={diff > 0 ? "text-green-600" : "text-red-600"}>
                  {Math.abs(diff).toFixed(1)}% {diff > 0 ? 'below' : 'above'} estimate
                </span>
              )
            })()}
          </p>
        )}
      </div>
    </div>
  )
}

/** Non-interactive red ring marker so underlying grey dot stays hover/clickable */
type ScatterShapeProps = { cx?: number; cy?: number }
const TargetRing: React.FC<ScatterShapeProps> = ({ cx, cy }) => {
  if (cx == null || cy == null) return null
  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={cx} cy={cy} r={5} fill="none" stroke="#ef4444" strokeWidth={2} />
    </g>
  )
}

// Type guard to avoid `any` when reading priceModel.tier
function isTier(x: unknown): x is 'model_year' | 'model' | 'make' | 'global' {
  return x === 'model_year' || x === 'model' || x === 'make' || x === 'global'
}

export function PriceAnalysis({ analysis, onYearChange, searchedYear }: PriceAnalysisProps) {
  const { targetCar, similarListings, priceCurves, estimatedPrice, priceRange, priceModel } =
    analysis
  const [isTooltipHovering, setIsTooltipHovering] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [noYearData, setNoYearData] = useState(false)
  const [isZooming, setIsZooming] = useState(false)
  const [xDomain, setXDomain] = useState<[number, number] | null>(null)
  const [zoomDomain, setZoomDomain] = useState<{ start: number | null; end: number | null }>({ start: null, end: null })

  // Per-year curve overrides (null = checked and not found; array = found curve)
  const [yearCurveOverride, setYearCurveOverride] = useState<Record<number, PricePoint[] | null>>({})

  // Helper to compute price from coefficients (stable ref for hooks)
  const calcPriceFromCoef = useCallback((coef: CoefJson, year: number, km: number) => {
    const currentYear = new Date().getFullYear()
    const age = currentYear - year
    const logkm = Math.log(1 + Math.max(0, km))
    return (
      coef.intercept +
      coef.beta_age * age +
      coef.beta_logkm * logkm +
      coef.beta_age_logkm * (age * logkm)
    )
  }, [])

  // Build curve points from a coef_json (stable ref for hooks)
  const buildCurveFromCoef = useCallback(
    (coef: CoefJson, year: number): PricePoint[] => {
      const [minKm, maxKm] = [0, 300_000]
      const points = 50
      const step = (maxKm - minKm) / (points - 1)
      const data: PricePoint[] = []
      for (let i = 0; i < points; i++) {
        const km = minKm + i * step
        data.push({
          kilometers: km,
          price: calcPriceFromCoef(coef, year, km),
          year: String(year),
        })
      }
      return data
    },
    [calcPriceFromCoef]
  )

  // Try to fetch a per-year model for the selected year and override the curve
  useEffect(() => {
    const pm = priceModel as PriceModelLike
    if (!selectedYear || !pm?.make_norm || !pm?.model_base) return

    // Only fetch once per year
    if (Object.prototype.hasOwnProperty.call(yearCurveOverride, selectedYear)) return

    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('price_models')
        .select('coef_json')
        .eq('tier', 'model_year')
        .eq('make_norm', pm.make_norm!)
        .eq('model_base', pm.model_base!)
        .eq('year', selectedYear)
        .maybeSingle()

      if (cancelled) return

      if (error || !data || !data.coef_json) {
        setYearCurveOverride((prev) => ({ ...prev, [selectedYear]: null }))
        return
      }

      const raw = typeof data.coef_json === 'string' ? JSON.parse(data.coef_json) : data.coef_json
      const coef: CoefJson = {
        intercept: Number(raw.intercept ?? 0),
        beta_age: Number(raw.beta_age ?? 0),
        beta_logkm: Number(raw.beta_logkm ?? 0),
        beta_age_logkm: Number(raw.beta_age_logkm ?? 0),
      }

      const curve = buildCurveFromCoef(coef, selectedYear)
      setYearCurveOverride((prev) => ({ ...prev, [selectedYear]: curve }))
    })()

    return () => {
      cancelled = true
    }
    // ✅ include buildCurveFromCoef to satisfy exhaustive-deps
  }, [selectedYear, priceModel, yearCurveOverride, buildCurveFromCoef])

  // Build year options & choose a single default year
  useEffect(() => {
    const yearCounts = similarListings.reduce((acc, listing) => {
      if (listing.year) {
        const y = parseInt(listing.year)
        acc[y] = (acc[y] || 0) + 1
      }
      return acc
    }, {} as Record<number, number>)

    const years = Object.keys(yearCounts)
      .map((y) => parseInt(y))
      .sort((a, b) => b - a)

    setAvailableYears(years)

    if (years.length === 0) {
      setSelectedYear(null)
      setNoYearData(false)
      return
    }

    const yearWithMostResults = years.reduce(
      (maxY, y) => (yearCounts[y] > yearCounts[maxY] ? y : maxY),
      years[0]
    )

    const hasSearched =
      searchedYear && searchedYear !== 'all' && !Number.isNaN(parseInt(searchedYear))
    if (hasSearched) {
      const y = parseInt(searchedYear as string)
      if (yearCounts[y] && yearCounts[y] > 0) {
        setSelectedYear(y)
        setNoYearData(false)
        return
      }
      setSelectedYear(yearWithMostResults)
      setNoYearData(true)
      return
    }

    setSelectedYear(yearWithMostResults)
    setNoYearData(false)
  }, [similarListings, searchedYear])

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
    const priceDiff = ((analysis.targetCar.price - estimatedPrice) / estimatedPrice) * 100
    if (priceDiff <= -10) return { text: 'Good Deal', color: 'text-green-600' }
    if (priceDiff >= 10) return { text: 'Expensive', color: 'text-red-600' }
    return { text: 'Fair Price', color: 'text-yellow-600' }
  }
  const assessment = getPriceAssessment()

  // Which tier powers the curve right now (badge) — no `any` needed
  const curveTier: 'model_year' | 'model' | 'make' | 'global' = useMemo(() => {
    if (selectedYear && Array.isArray(yearCurveOverride[selectedYear])) return 'model_year'
    const pm = priceModel as PriceModelLike
    const t = pm?.tier
    return isTier(t) ? t : 'model'
  }, [selectedYear, yearCurveOverride, priceModel])

  const tierBadge = useMemo(() => {
    const styles: Record<typeof curveTier, string> = {
      model_year: 'bg-blue-50 text-blue-700 border-blue-200',
      model: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      make: 'bg-amber-50 text-amber-700 border-amber-200',
      global: 'bg-slate-50 text-slate-700 border-slate-200',
    }
    const labels: Record<typeof curveTier, string> = {
      model_year: selectedYear ? `${selectedYear} Model` : 'Using: Year-specific',
      model: 'Using: Model',
      make: 'Using: Make',
      global: 'Using: Global',
    }
    return (
      <span
        className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[curveTier]}`}
        title={
          curveTier === 'model_year'
            ? 'Per-year model found for this make/model/year'
            : 'Falling back to pooled model'
        }
      >
        {labels[curveTier]}
      </span>
    )
  }, [curveTier, selectedYear])

  // Pick the current curve
  const currentCurve: PricePoint[] | undefined = useMemo(() => {
    if (!selectedYear) return undefined
    const overr = yearCurveOverride[selectedYear]
    if (Array.isArray(overr) && overr.length > 0) return overr
    return (priceCurves as Record<string, PricePoint[]>)[String(selectedYear)]
  }, [selectedYear, yearCurveOverride, priceCurves])

  // Chart
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
            label={{ value: 'Kilometers Driven', position: 'insideBottom', offset: -15 }}
          />
          <YAxis
            type="number"
            dataKey="price"
            name="Price"
            tickFormatter={(value) => `${(value / 1_000_000).toFixed(1)}M`}
            label={{ value: 'Price (ISK)', angle: -90, position: 'insideLeft', offset: -15 }}
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
                  selectedYear={selectedYear}
                  currentCurve={currentCurve}
                />
              </div>
            )}
            wrapperStyle={{ zIndex: 80 }}
          />

          {/* Similar listings (filter to selectedYear) */}
          <Scatter
            name="Similar Cars"
            data={similarListings.filter((listing) => {
              if (listing.isTarget) return true
              const listingYear = listing.year ? parseInt(listing.year) : null
              return selectedYear ? listingYear === selectedYear : false
            }).map(listing => ({
              ...listing,
              kilometers: listing.kilometers || 0
            }))}
            fill="#94a3b8"
            opacity={0.6}
            onClick={(point: PricePoint) => {
              if (point?.url) window.open(point.url, '_blank', 'noopener,noreferrer')
            }}
            style={{ cursor: 'pointer' }}
            onMouseOver={(state) => {
              const target = state?.currentTarget as SVGCircleElement | null;
              if (target) {
                target.style.fill = '#64748b';
                target.style.opacity = '1';
              }
            }}
            onMouseOut={(state) => {
              const target = state?.currentTarget as SVGCircleElement | null;
              if (target) {
                target.style.fill = '#94a3b8';
                target.style.opacity = '0.6';
              }
            }}
          />

          {/* Price curve — only for selectedYear */}
          {selectedYear && currentCurve && (
            <Scatter
              key={selectedYear}
              name={`Price Curve ${selectedYear}`}
              data={currentCurve}
              fill="none"
              line={{ stroke: '#2563eb', strokeWidth: 2, strokeOpacity: 1 }}
              lineType="joint"
            />
          )}

          {/* Target car as non-interactive ring so underlying grey stays clickable */}
          {targetCar.price && targetCar.kilometers && (
            <Scatter
              name="Your Car"
              data={[targetCar as PricePoint]}
              shape={<TargetRing />}
              isAnimationActive={false}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )

  // Inner card content
  const CardInner = (isInOverlay: boolean) => {
    const modelQualitySpan = isInOverlay ? '' : 'col-span-2'

    return (
      <>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center">
            <CardTitle>Price Analysis</CardTitle>
            {tierBadge}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedYear?.toString()}
              onValueChange={(value) => {
                const newYear = parseInt(value)
                setSelectedYear(newYear)
                onYearChange?.(newYear)
                setNoYearData(false)
              }}
            >
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
            {noYearData && (
              <p className="text-xs text-amber-600">
                No cars for selected year found — Showing most populated year.
              </p>
            )}

            {ChartBlock(isInOverlay ? 'h-[75vh]' : 'h-[400px]')}
            {isInOverlay && (
              <div className="mt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setXDomain(null)}
                  className={xDomain ? 'opacity-100' : 'opacity-0'}
                >
                  Reset Zoom
                </Button>
              </div>
            )}

            <div
              className={`grid ${
                isInOverlay ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2'
              } gap-4`}
            >
              {targetCar.price && targetCar.kilometers ? (
                <>
                  <div>
                    <h3 className="text-sm font-medium">Estimated Fair Price</h3>
                    <p className="text-2xl font-bold">{formatPrice(estimatedPrice)}</p>
                    <p className="text-sm text-gray-500">
                      Range: {formatPrice(priceRange.low)} - {formatPrice(priceRange.high)}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium">Assessment</h3>
                    <p className={`text-2xl font-bold ${assessment.color}`}>{assessment.text}</p>
                    <p className="text-sm text-gray-500">
                      Based on {analysis.priceModel.n_samples} similar cars
                    </p>
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">
                    Price and mileage required for value assessment
                  </p>
                </div>
              )}

              <div className={modelQualitySpan}>
                <h3 className="text-sm font-medium">Model Quality</h3>
                <p className="text-sm text-gray-500">
                  R² Score: {(analysis.priceModel.r2 * 100).toFixed(1)}% • Average Error: ±
                  {formatPrice(analysis.priceModel.rmse)}
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
      <Card className="h-fit">{CardInner(false)}</Card>

      {isExpanded && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          onClick={() => setIsExpanded(false)}
        >
          <div className="absolute inset-0 bg-black/70" />
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