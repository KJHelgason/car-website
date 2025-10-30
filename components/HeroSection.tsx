'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Search, Zap, BarChart3 } from 'lucide-react';

export function HeroSection() {
  return (
    <div className="mb-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white rounded-xl p-8 md:p-12 mb-6 shadow-lg">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Find Your Perfect Car Deal
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8">
            Get accurate price estimates, discover the best deals, and make informed decisions with our AI-powered analysis
          </p>
          
          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">ML Price Estimates</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Daily Deals</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="text-sm font-medium">10,000+ Listings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">10K+</div>
                <div className="text-xs text-slate-500">Active Listings</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">90%</div>
                <div className="text-xs text-slate-500">Coverage</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Zap className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">50+</div>
                <div className="text-xs text-slate-500">Car Makes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Search className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">Daily</div>
                <div className="text-xs text-slate-500">Updates</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
