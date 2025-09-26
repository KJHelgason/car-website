'use client';

import { Button } from '@/components/ui/button';

export type SearchMode = 'analysis' | 'range';

interface SearchToggleProps {
    mode: SearchMode;
    onModeChange: (mode: SearchMode) => void;
}

export function SearchToggle({ mode, onModeChange }: SearchToggleProps) {
    return (
        <div className="flex-grow">
            <div className="bg-gray-100 p-1 rounded-lg flex w-full">
                <Button
                    variant="ghost"
                    onClick={() => onModeChange('analysis')}
                    className={`flex-1 px-4 py-2 rounded-md transition ${
                        mode === 'analysis'
                            ? 'bg-white shadow text-black hover:bg-white'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Price Analysis Search
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => onModeChange('range')}
                    className={`flex-1 px-4 py-2 rounded-md transition ${
                        mode === 'range'
                            ? 'bg-white shadow text-black hover:bg-white'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Range Search
                </Button>
            </div>
        </div>
    );
}