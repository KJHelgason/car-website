'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CarItem } from '@/types/form';
import { supabase } from '@/lib/supabase';

// ⬇️ Tips system + CSS (adjust import path if your file lives elsewhere)
//import { TipsSystem } from '@/components/ui/tips';
//import '@/app/tips.css';

interface MakeOption {
  make_norm: string;
  display_make: string;
}

interface CarSearchFormProps {
  onSearch: (data: CarItem) => void;
  makes: MakeOption[];
}

export function CarSearchForm({ onSearch, makes }: CarSearchFormProps) {
  const [models, setModels] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CarItem>({
    defaultValues: {
      make: '',
      model: '',
      year: 'all',
      kilometers: 0,     // optional semantically; 0 means “not specified”
      price: undefined,  // truly optional
    },
  });

  const selectedMake = watch('make');

  useEffect(() => {
    if (selectedMake) {
      void fetchModels(selectedMake);
    } else {
      setModels([]);
      setValue('model', '');
    }
  }, [selectedMake, setValue]);

  const fetchModels = async (make: string) => {
    // Prefer curated models from price_models
    const { data: modelData, error: modelError } = await supabase
      .from('price_models')
      .select('model_base, display_name')
      .eq('make_norm', make.toLowerCase())
      .not('model_base', 'is', null)
      .order('display_name', { ascending: true });

    if (modelError) {
      console.log('Error fetching models from price_models:', modelError);
      return;
    }

    if (modelData && modelData.length > 0) {
      const formattedModels = [
        ...new Set(
          modelData.map((item) => (item.display_name || item.model_base) as string)
        ),
      ];
      setModels(formattedModels);
      return;
    }

    // Fallback to car_listings if nothing in price_models
    const { data: listingModels, error: listingError } = await supabase
      .from('car_listings')
      .select('model')
      .eq('make', make)
      .order('model', { ascending: true });

    if (!listingError && listingModels) {
      const uniqueModels = [...new Set(listingModels.map((item) => item.model as string))];
      setModels(uniqueModels);
    }
  };

  const onSubmit = (data: CarItem) => {
    onSearch(data);
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      {/* First-time user guide */}
      {/* <TipsSystem /> */}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div id="make">
            <Label htmlFor="make-select" className="mb-2">
              Car Make
            </Label>
            {/* shadcn Select is controlled via value/onValueChange; RHF gets the value via hidden input below */}
            <Select
              value={watch('make')}
              onValueChange={(value) => {
                setValue('make', value, { shouldValidate: true, shouldDirty: true });
                setValue('model', '', { shouldDirty: true, shouldValidate: true });
              }}
            >
              <SelectTrigger id="make-select" className="w-full">
                <SelectValue placeholder="Select Make" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {makes.map((make) => (
                    <SelectItem key={make.make_norm} value={make.make_norm}>
                      {make.display_make}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {/* Hidden input so RHF can validate 'make' as required */}
            <input type="hidden" {...register('make', { required: true })} value={watch('make') || ''} />
            {errors.make && <span className="text-red-500">This field is required</span>}
          </div>

          <div id="model">
            <Label htmlFor="model-select" className="mb-2">
              Car Model
            </Label>
            <Select
              disabled={!selectedMake}
              value={watch('model')}
              onValueChange={(value: string) =>
                setValue('model', value, { shouldValidate: true, shouldDirty: true })
              }
            >
              <SelectTrigger id="model-select" className="w-full">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {/* Hidden input so RHF can validate 'model' as required */}
            <input type="hidden" {...register('model', { required: true })} value={watch('model') || ''} />
            {errors.model && <span className="text-red-500">This field is required</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div id="year">
            <Label htmlFor="year-select" className="mb-2">
              Year <span className="text-xs text-slate-500 font-normal">(optional)</span>
            </Label>
            <Select
              value={watch('year')}
              onValueChange={(value) => setValue('year', value, { shouldDirty: true })}
            >
              <SelectTrigger id="year-select" className="w-full">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Years</SelectItem>
                  {Array.from({ length: 26 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {/* Hidden input keeps 'year' in the RHF form state */}
            <input type="hidden" {...register('year')} value={watch('year') || 'all'} />
          </div>

          <div id="kilometers">
            <Label htmlFor="kilometers" className="mb-2">
              Kilometers <span className="text-xs text-slate-500 font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <Input
                id="kilometers"
                type="text"
                inputMode="numeric"
                placeholder="e.g., 125 000"
                aria-describedby="km-help"
                {...register('kilometers', {
                  // optional: allow empty; when empty we submit 0
                  validate: (value) => {
                    const raw = String(value ?? '').trim();
                    if (raw === '' || raw === '0') return true;
                    const n = parseInt(raw.replace(/[.,\s]/g, ''), 10);
                    return !isNaN(n) && n >= 0;
                  },
                  onChange: (e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value) {
                      const num = parseInt(value, 10);
                      if (!isNaN(num)) e.target.value = num.toLocaleString('is-IS');
                    } else {
                      e.target.value = '';
                    }
                  },
                  setValueAs: (value) => {
                    const raw = value?.toString().replace(/[.,\s]/g, '');
                    if (!raw) return 0;
                    const n = parseInt(raw, 10);
                    return isNaN(n) ? 0 : n;
                  },
                })}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">km</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div id="price">
            <Label htmlFor="price-input" className="mb-2">
              Price <span className="text-xs text-slate-500 font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <Input
                id="price-input"
                type="text"
                inputMode="numeric"
                placeholder="e.g., 3 450 000"
                aria-describedby="price-help"
                {...register('price', {
                  min: 0,
                  validate: (value) => {
                    if (value === undefined || value === null) return true; // optional
                    const n = parseInt(String(value).replace(/[.,\s]/g, ''), 10);
                    return !isNaN(n) && n >= 0;
                  },
                  onChange: (e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    if (raw) {
                      const num = parseInt(raw, 10);
                      if (!isNaN(num)) e.target.value = num.toLocaleString('is-IS');
                    } else {
                      e.target.value = '';
                    }
                  },
                  setValueAs: (value) => {
                    const raw = value?.toString().replace(/[.,\s]/g, '');
                    if (!raw) return undefined;
                    const n = parseInt(raw, 10);
                    return isNaN(n) ? undefined : n;
                  },
                })}
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">ISK</span>
            </div>
            {errors.price && <span className="text-red-500">Please enter a valid price</span>}
          </div>

          <div id="submit">
            <Label htmlFor="submit-btn" className="mb-2">
              Submit
            </Label>
            <div className="flex items-center gap-2">
              <Button type="submit" className="w-full" id="submit-btn">
                Analyze Price
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
