import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip } from 'recharts'
import { CarAnalysis } from '@/types/car'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
import { SaveSearchButton } from '@/components/SaveSearchButton'
import type { CarItem } from '@/types/form'

interface PriceAnalysisProps {
  analysis: CarAnalysis
  onYearChange?: (year: number) => void
  /** 'all' | 'YYYY' from the search form */
  searchedYear?: string | null
  searchParams?: CarItem
}

interface PricePoint {
  price: number
  kilometers: number
  name?: string
  url?: string
  year?: string
  isTarget?: boolean
  image_url?: string
  /** raw km from listing; used to compute percent accurately */
  kmRaw?: number | null
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: PricePoint }>
  isHovering: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  formatPrice: (price: number) => string
  // pooled model consistency props
  pooledCoef: CoefJson | null
  calcPriceFromCoef: (coef: CoefJson, year: number, km: number) => number
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
  pooledCoef,
  calcPriceFromCoef,
}: CustomTooltipProps) => {
  // Show if actively hovering OR if the tooltip itself is being hovered
  if ((!active && !isHovering) || !payload || payload.length === 0) return null

  // Get all items from payload and filter out invalid ones
  const allItems = payload
    .map(p => p.payload)
    .filter(data => data && data.price && data.kilometers)
  
  if (allItems.length === 0) return null

  // Group items by coordinates to show count of overlapping dots
  const coordKey = (data: PricePoint) => 
    `${Math.round(data.price / 100000)}-${Math.round(data.kilometers / 1000)}`
  
  const grouped = allItems.reduce((acc, item) => {
    const key = coordKey(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, PricePoint[]>)

  // Get unique items at this position
  const itemsToShow = Object.values(grouped).flat()
    .filter((item, index, self) => 
      index === self.findIndex(t => t.name === item.name && t.price === item.price)
    )

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative transition-opacity duration-150 ease-out"
      style={{ zIndex: 80 }}
    >
      {/* Invisible bridge area to prevent tooltip from disappearing when moving mouse */}
      <div
        className="absolute"
        style={{
          left: -20,
          right: -20,
          top: -20,
          bottom: -20,
          pointerEvents: 'auto',
        }}
      />
      
      <div
        className="relative bg-white p-2 sm:p-3 border rounded shadow-lg text-sm max-w-xs sm:max-w-sm"
        style={{ pointerEvents: 'auto' }}
      >
        {itemsToShow.length > 1 && (
          <p className="text-xs font-semibold text-gray-600 mb-2 pb-2 border-b">
            {itemsToShow.length} cars at this position
          </p>
        )}
        
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {itemsToShow.map((data, idx) => {
            const hasValidKm = typeof data.kmRaw === 'number' && Number.isFinite(data.kmRaw) && data.kmRaw > 0
            const listingYear = data.year ? parseInt(data.year) : undefined

            const expectedPrice =
              pooledCoef && !data.isTarget && listingYear && hasValidKm
                ? calcPriceFromCoef(pooledCoef, listingYear, data.kmRaw!)
                : null

            const pct =
              expectedPrice && expectedPrice > 0
                ? ((expectedPrice - data.price) / expectedPrice) * 100
                : null

            return (
              <div key={`${idx}-${data.name || 'car'}`} className={idx > 0 ? 'pt-3 border-t' : ''}>
                {data.image_url && (
                  <div className="mb-2 w-full h-32 sm:h-40 bg-gray-100 rounded overflow-hidden">
                    <img
                      src={data.image_url}
                      alt={data.name || 'Car'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {data.name && (
                  <p className="font-medium text-sm mb-1">
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
                
                <div className="space-y-0.5">
                  <p className="text-xs sm:text-sm">{`Driven: ${Math.round(data.kilometers).toLocaleString()} km`}</p>
                  <p className="text-xs sm:text-sm">{`Price: ${formatPrice(Math.round(data.price))}`}</p>
                  {data.year && <p className="text-xs sm:text-sm">{`Year: ${data.year}`}</p>}
                  {pct !== null && (
                    <p className="mt-1 text-xs sm:text-sm">
                      <span className={pct > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {Math.abs(pct).toFixed(1)}% {pct > 0 ? 'below' : 'above'} estimate
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Non-interactive red ring marker so underlying grey dot stays hover/clickable */
type ScatterShapeProps = { cx?: number; cy?: number }
const TargetRing = ({ cx, cy }: ScatterShapeProps) => {
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

export function PriceAnalysis({ analysis, onYearChange, searchedYear, searchParams }: PriceAnalysisProps) {
  const { targetCar, similarListings, priceCurves, estimatedPrice, priceRange, priceModel } =
    analysis
  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null)
  const [hoveredPoints, setHoveredPoints] = useState<PricePoint[]>([])
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; showOnLeft?: boolean } | null>(null)
  const [isTooltipHovered, setIsTooltipHovered] = useState(false)
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [showFullGraph, setShowFullGraph] = useState(false)
  const [noYearData, setNoYearData] = useState(false)
  const [yearModelNSamples, setYearModelNSamples] = useState<Record<number, number | null>>({})

  // Helper to close tooltip
  const closeTooltip = useCallback(() => {
    setHoveredPoint(null)
    setHoveredPoints([])
    setTooltipPosition(null)
    setIsTooltipHovered(false)
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
      tooltipTimeoutRef.current = null
    }
  }, [])

  // Preload all listing images when component mounts
  useEffect(() => {
    const imagesToPreload = similarListings
      .filter(listing => listing.image_url)
      .map(listing => listing.image_url!)
    
    // Preload images by creating Image objects
    imagesToPreload.forEach(url => {
      const img = new Image()
      img.src = url
    })
  }, [similarListings])

  // Per-year curve overrides (null = checked and not found; array = found curve)
  const [yearCurveOverride, setYearCurveOverride] = useState<Record<number, PricePoint[] | null>>(
    {}
  )

  // Canonical estimator used across the app (same as other components)
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

  // Parse pooled coef from analysis.priceModel (matches other components)
  const pooledCoef: CoefJson | null = useMemo(() => {
    const raw = analysis.priceModel?.coef_json
    if (!raw) return null
    try {
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        intercept: Number(obj.intercept ?? 0),
        beta_age: Number(obj.beta_age ?? 0),
        beta_logkm: Number(obj.beta_logkm ?? 0),
        beta_age_logkm: Number(obj.beta_age_logkm ?? 0),
      }
    } catch {
      return null
    }
  }, [analysis.priceModel?.coef_json])

  // Build curve points from a coef_json (for the blue curve only)
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

  // Try to fetch a per-year model for the selected year (for drawing the blue curve only)
  useEffect(() => {
    const pm = priceModel as PriceModelLike
    if (!selectedYear || !pm?.make_norm || !pm?.model_base) return
    if (Object.prototype.hasOwnProperty.call(yearCurveOverride, selectedYear)) return

    type PriceModelYearRow = {
      coef_json: string | CoefJson | null
      n_samples: number | string | null
    }

    let cancelled = false
    ;(async () => {
      const resp = await supabase
        .from('price_models')
        .select('coef_json, n_samples')
        .eq('tier', 'model_year')
        .eq('make_norm', pm.make_norm!)
        .eq('model_base', pm.model_base!)
        .eq('year', selectedYear)
        .maybeSingle()

      if (cancelled) return

      const data = (resp?.data ?? null) as PriceModelYearRow | null
      const error = resp?.error ?? null

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

      // Safely coerce n_samples without using `any`
      let nSamples: number | null = null
      if (data && typeof data.n_samples !== 'undefined' && data.n_samples !== null) {
        const parsed =
          typeof data.n_samples === 'string' ? parseFloat(data.n_samples) : data.n_samples
        nSamples = Number.isFinite(parsed) ? parsed : null
      }
      setYearModelNSamples((prev) => ({
        ...prev,
        [selectedYear]: nSamples,
      }))
    })()

    return () => {
      cancelled = true
    }
  }, [selectedYear, priceModel, yearCurveOverride, buildCurveFromCoef])

  // Close tooltip on escape key or when clicking outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeTooltip()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      // If not hovering the tooltip and clicking outside, close it
      if (!isTooltipHovered) {
        const target = e.target as HTMLElement
        // Check if click is outside the chart and tooltip
        if (!target.closest('#analysis-graph') && !target.closest('.fixed.z-\\[90\\]')) {
          closeTooltip()
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('click', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isTooltipHovered, closeTooltip])

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

  // Which tier powers the curve right now (badge)
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
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[curveTier]}`}
        title={
          curveTier === 'model_year'
            ? 'Per-year model found for this make/model/year (visual curve only). Percent below/above uses pooled model for consistency.'
            : 'Pooled model'
        }
      >
        {labels[curveTier]}
      </span>
    )
  }, [curveTier, selectedYear])

  // Pick the current curve to draw (may be per-year)
  const currentCurve: PricePoint[] | undefined = useMemo(() => {
    if (!selectedYear) return undefined
    const overr = yearCurveOverride[selectedYear]
    if (Array.isArray(overr) && overr.length > 0) return overr
    return (priceCurves as Record<string, PricePoint[]>)[String(selectedYear)]
  }, [selectedYear, yearCurveOverride, priceCurves])

  const displayedNSamples = useMemo(() => {
    // If we actually loaded a per-year curve for this year, prefer its n_samples
    if (selectedYear && Array.isArray(yearCurveOverride[selectedYear])) {
      const n = yearModelNSamples[selectedYear]
      if (typeof n === 'number') return n
    }
    // Fall back to the pooled model used in analysis
    return analysis.priceModel.n_samples
  }, [selectedYear, yearCurveOverride, yearModelNSamples, analysis.priceModel.n_samples])

  // Chart
  const ChartBlock = (heightClass: string) => {
    // Calculate X-axis domain based on actual data points only (not the curve)
    const xDomain = useMemo(() => {
      const filteredData = similarListings
        .filter((listing) => {
          if (listing.isTarget) return true
          const listingYear = listing.year ? parseInt(listing.year) : null
          return selectedYear ? listingYear === selectedYear : false
        })
        .filter(listing => !listing.isCurve) // Exclude curve points

      if (filteredData.length === 0) return [0, 300000]

      const maxKm = Math.max(...filteredData.map(d => d.kilometers || 0))
      const minKm = Math.min(...filteredData.map(d => d.kilometers || 0))
      
      // Add 5% padding on both sides
      const range = maxKm - minKm
      const padding = Math.max(range * 0.05, 5000) // At least 5k padding
      
      // Upper bound always cuts off at max + padding
      const upper = Math.ceil((maxKm + padding) / 5000) * 5000
      
      // Lower bound: full view starts at 0, optimized view starts near data
      let lower = 0
      if (!showFullGraph) {
        lower = minKm < 20000 ? 0 : Math.floor((minKm - padding) / 5000) * 5000
      }
      
      return [Math.max(0, lower), upper]
    }, [similarListings, selectedYear, showFullGraph])

    // Calculate Y-axis domain based on actual data
    const yDomain = useMemo(() => {
      const filteredData = similarListings
        .filter((listing) => {
          if (listing.isTarget) return true
          const listingYear = listing.year ? parseInt(listing.year) : null
          return selectedYear ? listingYear === selectedYear : false
        })
        .filter(listing => !listing.isCurve) // Exclude curve points

      if (filteredData.length === 0) return [0, 10000000]

      const maxPrice = Math.max(...filteredData.map(d => d.price || 0))
      const minPrice = Math.min(...filteredData.map(d => d.price || 0))
      
      // Add 5% padding on top, 5% on bottom for better visualization
      const range = maxPrice - minPrice
      const padding = Math.max(range * 0.05, 200000) // At least 200k padding
      
      // Upper bound always cuts off just above data
      const upper = Math.ceil((maxPrice + padding) / 500000) * 500000
      
      // Lower bound: full view starts at 0, optimized view starts near data
      const lower = showFullGraph ? 0 : Math.max(0, Math.floor((minPrice - padding) / 500000) * 500000)
      
      return [lower, upper]
    }, [similarListings, selectedYear, showFullGraph])

    // Custom dot component that handles hover
    const CustomDot = (props: any) => {
      const { cx, cy, payload } = props
      if (!cx || !cy || !payload) return null

      const isHovered = hoveredPoints.some(p => 
        p.price === payload.price && p.kilometers === payload.kilometers
      )

      return (
        <circle
          cx={cx}
          cy={cy}
          r={isHovered ? 6 : 4}
          fill={payload.isTarget ? '#ef4444' : '#94a3b8'}
          stroke={isHovered ? '#1e40af' : 'none'}
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onMouseEnter={(e) => {
            // Find all points at similar coordinates
            const tolerance = 0.02 // 2% tolerance
            const nearby = similarListings
              .filter(l => l.year ? parseInt(l.year) === selectedYear : false)
              .filter(p => {
                const priceDiff = Math.abs(p.price - payload.price) / payload.price
                const kmDiff = Math.abs(p.kilometers - payload.kilometers) / (payload.kilometers || 1)
                return priceDiff < tolerance && kmDiff < tolerance
              })
            
            setHoveredPoints(nearby.length > 0 ? nearby : [payload])
            setHoveredPoint(payload)
            
            // Get tooltip position relative to viewport
            const rect = e.currentTarget.getBoundingClientRect()
            const windowWidth = window.innerWidth
            
            // Show tooltip on left if point is on right half of screen
            const showOnLeft = rect.left > windowWidth / 2
            
            setTooltipPosition({ 
              x: rect.left, 
              y: rect.top,
              showOnLeft 
            })
          }}
          onMouseLeave={() => {
            // Clear any existing timeout
            if (tooltipTimeoutRef.current) {
              clearTimeout(tooltipTimeoutRef.current)
            }
            
            // Set timeout to close tooltip if not hovering over it
            tooltipTimeoutRef.current = setTimeout(() => {
              if (!isTooltipHovered) {
                closeTooltip()
              }
            }, 150)
          }}
        />
      )
    }

    return (
      <div 
        className={`${heightClass} outline-none [&_*]:outline-none`}
        onClick={(e) => {
          // Close tooltip if clicking on empty space (not on a dot)
          if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
            closeTooltip()
          }
        }}
        style={{ outline: 'none' }}
      >
        <style jsx>{`
          svg:focus {
            outline: none !important;
          }
          svg *:focus {
            outline: none !important;
          }
        `}</style>
        <ResponsiveContainer width="100%" height="100%">
        <ScatterChart 
          margin={{ top: 10, right: 10, bottom: 40, left: 10 }} 
          className="sm:ml-4 sm:mb-0 outline-none focus:outline-none [&_*]:outline-none"
          onClick={() => {
            // Close tooltip when clicking anywhere in the chart
            if (!isTooltipHovered) {
              closeTooltip()
            }
          }}
        >
          <XAxis
            type="number"
            dataKey="kilometers"
            name="Kilometers"
            unit=" km"
            domain={xDomain as [number, number]}
            allowDataOverflow={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            label={{ value: 'Kilometers Driven', position: 'insideBottom', offset: -10, className: 'text-xs sm:text-sm' }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="price"
            name="Price"
            domain={yDomain as [number, number]}
            allowDataOverflow={false}
            tickFormatter={(value) => `${(value / 1_000_000).toFixed(1)}M`}
            label={{ value: 'Price (ISK)', angle: -90, position: 'insideLeft', offset: 5, className: 'text-xs sm:text-sm' }}
            tick={{ fontSize: 12 }}
          />

          {/* Similar listings (filter to selectedYear) */}
          <Scatter
            name="Similar Cars"
            data={similarListings
              .filter((listing) => {
                if (listing.isTarget) return true
                const listingYear = listing.year ? parseInt(listing.year) : null
                return selectedYear ? listingYear === selectedYear : false
              })
              .map((listing) => ({
                ...listing,
                // keep the raw value for calculation, even if it's null/undefined
                kmRaw: typeof listing.kilometers === 'number' ? listing.kilometers : null,
                // recharts still needs a number to plot; fall back to 0 just for plotting
                kilometers: typeof listing.kilometers === 'number' ? listing.kilometers : 0,
              }))}
            fill="#94a3b8"
            opacity={0.6}
            shape={<CustomDot />}
            onClick={(point: PricePoint) => {
              if (point?.url) window.open(point.url, '_blank', 'noopener,noreferrer')
            }}
          />

          {/* Price curve — only for selectedYear (may be per-year) */}
          {selectedYear && currentCurve && (
            <Scatter
              key={selectedYear}
              name={`Price Curve ${selectedYear}`}
              data={currentCurve.filter(point => 
                point.kilometers >= xDomain[0] && 
                point.kilometers <= xDomain[1] &&
                point.price <= yDomain[1] // Only clip upper bound, allow lower values
              )}
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
  }

  // Inner card content
  const CardInner = () => {
    return (
      <>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2">
          <div className="flex items-center flex-wrap gap-2">
            <CardTitle className="text-lg sm:text-xl">Price Analysis</CardTitle>
            {tierBadge}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {searchParams && (
              <SaveSearchButton
                searchParams={{
                  make: searchParams.make,
                  model: searchParams.model,
                  year: searchParams.year && searchParams.year !== 'all' ? parseInt(searchParams.year) : undefined,
                  search_type: 'price_analysis',
                }}
                variant="outline"
                size="sm"
                className="cursor-pointer"
              />
            )}

            <Select
              value={selectedYear?.toString()}
              onValueChange={(value) => {
                const newYear = parseInt(value)
                setSelectedYear(newYear)
                onYearChange?.(newYear)
                setNoYearData(false)
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
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

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFullGraph(!showFullGraph)}
              aria-label={showFullGraph ? "Show optimized view" : "Show full graph"}
              title={showFullGraph ? "Show optimized view" : "Show full graph"}
              className="cursor-pointer"
            >
              {showFullGraph ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {noYearData && (
              <p className="text-xs text-amber-600">
                No cars for selected year found — Showing most populated year.
              </p>
            )}

            {ChartBlock('h-[280px] sm:h-[400px]')}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {targetCar.price && targetCar.kilometers ? (
                <>
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium">Estimated Fair Price</h3>
                    <p className="text-xl sm:text-2xl font-bold">{formatPrice(estimatedPrice)}</p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Range: {formatPrice(priceRange.low)} - {formatPrice(priceRange.high)}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-medium">Assessment</h3>
                    <p className={`text-xl sm:text-2xl font-bold ${getPriceAssessment().color}`}>
                      {getPriceAssessment().text}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Based on {displayedNSamples.toLocaleString()} similar cars
                    </p>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2">
                  <p className="text-xs sm:text-sm text-gray-500">
                    Price and mileage required for value assessment
                  </p>
                </div>
              )}

              <div className="col-span-2">
                <h3 className="text-xs sm:text-sm font-medium">Model Quality</h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  <span className="block sm:inline">Algorithm Accuracy: {(analysis.priceModel.r2 * 100).toFixed(1)}%</span>
                  <span className="hidden sm:inline"> • </span>
                  <span className="block sm:inline">Average Error: ±{formatPrice(analysis.priceModel.rmse)}</span>
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
      <Card id="analysis-graph" className="h-fit relative">{CardInner()}</Card>

      {/* Custom Tooltip Overlay */}
      {hoveredPoints.length > 0 && tooltipPosition && (
        <div
          className="fixed z-[90] pointer-events-none"
          style={{
            left: tooltipPosition.showOnLeft 
              ? 'auto'
              : tooltipPosition.x + 30,
            right: tooltipPosition.showOnLeft
              ? window.innerWidth - tooltipPosition.x
              : 'auto',
            top: tooltipPosition.y - 20,
          }}
        >
          <div
            className="bg-white p-2 sm:p-3 border rounded shadow-lg text-sm max-w-xs sm:max-w-sm pointer-events-auto"
            onMouseEnter={() => {
              setIsTooltipHovered(true)
              // Clear any pending close timeout
              if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current)
                tooltipTimeoutRef.current = null
              }
            }}
            onMouseLeave={() => {
              setIsTooltipHovered(false)
              closeTooltip()
            }}
          >
            {hoveredPoints.length > 1 && (
              <p className="text-xs font-semibold text-gray-600 mb-2 pb-2 border-b">
                {hoveredPoints.length} cars at this position
              </p>
            )}

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {hoveredPoints.map((data, idx) => {
                const hasValidKm =
                  typeof data.kmRaw === 'number' && Number.isFinite(data.kmRaw) && data.kmRaw > 0
                const listingYear = data.year ? parseInt(data.year) : undefined

                const expectedPrice =
                  pooledCoef && !data.isTarget && listingYear && hasValidKm
                    ? calcPriceFromCoef(pooledCoef, listingYear, data.kmRaw!)
                    : null

                const pct =
                  expectedPrice && expectedPrice > 0
                    ? ((expectedPrice - data.price) / expectedPrice) * 100
                    : null

                return (
                  <div key={`${idx}-${data.name || 'car'}`} className={idx > 0 ? 'pt-3 border-t' : ''}>
                    {data.image_url && (
                      <div className="mb-2 w-full h-32 sm:h-40 bg-gray-100 rounded overflow-hidden">
                        <img
                          src={data.image_url}
                          alt={data.name || 'Car'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {data.name && (
                      <p className="font-medium text-sm mb-1">
                        {data.url ? (
                          <a
                            href={data.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {data.name}
                          </a>
                        ) : (
                          data.name
                        )}
                      </p>
                    )}

                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm">{`Driven: ${Math.round(
                        data.kilometers
                      ).toLocaleString()} km`}</p>
                      <p className="text-xs sm:text-sm">{`Price: ${formatPrice(Math.round(data.price))}`}</p>
                      {data.year && <p className="text-xs sm:text-sm">{`Year: ${data.year}`}</p>}
                      {pct !== null && (
                        <p className="mt-1 text-xs sm:text-sm">
                          <span
                            className={
                              pct > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
                            }
                          >
                            {Math.abs(pct).toFixed(1)}% {pct > 0 ? 'below' : 'above'} estimate
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
