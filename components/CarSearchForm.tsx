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

interface CarSearchFormProps {
  onSearch: (data: CarItem) => void;
  makes: string[];
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
      year: new Date().getFullYear().toString(),
      kilometers: 0,
      price: undefined
    }
  });

  const selectedMake = watch('make');

  useEffect(() => {
    if (selectedMake) {
      fetchModels(selectedMake);
    } else {
      setModels([]);
    }
  }, [selectedMake]);

  const fetchModels = async (make: string) => {
    // Get models from price_models first
    const { data: modelData, error: modelError } = await supabase
      .from('price_models')
      .select('model_base')
      .eq('make_norm', make.toLowerCase())
      .not('model_base', 'is', null)
      .order('model_base', { ascending: true });

    if (modelError) {
      console.log('Error fetching models from price_models:', modelError);
      return;
    }

    if (modelData && modelData.length > 0) {
      // Capitalize first letter of each model
      const formattedModels = [...new Set(modelData.map(item => {
        const model = item.model_base;
        return model.charAt(0).toUpperCase() + model.slice(1);
      }))];
      setModels(formattedModels);
    } else {
      // Fallback to car_listings if no models found in price_models
      const { data: listingModels, error: listingError } = await supabase
        .from('car_listings')
        .select('model')
        .eq('make', make)
        .order('model', { ascending: true });
      
      if (!listingError && listingModels) {
        const uniqueModels = [...new Set(listingModels.map(item => item.model))];
        setModels(uniqueModels);
      }
    }
  };

  const onSubmit = (data: CarItem) => {
    onSearch(data);
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="make" className="mb-2">Car Make</Label>
            <Select
              {...register('make', { required: true })}
              value={watch('make')}
              onValueChange={(value) => {
                setValue('make', value);
                setValue('model', ''); // Reset model when make changes
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Make" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {makes.map((make) => (
                    <SelectItem key={make} value={make}>
                      {make}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.make && <span className="text-red-500">This field is required</span>}
          </div>

          <div>
            <Label htmlFor="model" className="mb-2">Car Model</Label>
            <Select
              disabled={!selectedMake}
              value={watch('model')}
              onValueChange={(value: string) => setValue('model', value)}
            >
              <SelectTrigger className="w-full">
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
            {errors.model && <span className="text-red-500">This field is required</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="year" className="mb-2">Year</Label>
            <Input
              type="number"
              {...register('year', {
                required: true,
                min: 1900,
                max: new Date().getFullYear() + 1,
              })}
            />
            {errors.year && <span className="text-red-500">Please enter a valid year</span>}
          </div>

          <div>
            <Label htmlFor="kilometers" className="mb-2">Kilometers</Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                {...register('kilometers', {
                  required: true,
                  validate: (value) => !isNaN(parseInt(value?.toString().replace(/[.,]/g, ''))) && parseInt(value?.toString().replace(/[.,]/g, '')) >= 0,
                  onChange: (e) => {
                    // Remove any non-digit characters
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    // Format with dots for thousands
                    if (value) {
                      const num = parseInt(value);
                      if (!isNaN(num)) {
                        e.target.value = num.toLocaleString('is-IS');
                      }
                    }
                  },
                  setValueAs: (value) => {
                    // Convert the formatted string back to a number, handling both dots and commas
                    return parseInt(value?.toString().replace(/[.,]/g, '') || '0');
                  }
                })}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                km
              </span>
            </div>
            {errors.kilometers && (
              <span className="text-red-500">Please enter a valid mileage!</span>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="price" className="mb-2">Price (Optional)</Label>
          <Input
            type="number"
            {...register('price', {
              min: 0,
            })}
          />
          {errors.price && (
            <span className="text-red-500">Please enter a valid price</span>
          )}
        </div>

        <Button type="submit" className="w-full">
          Analyze Price
        </Button>
      </form>
    </div>
  );
}
