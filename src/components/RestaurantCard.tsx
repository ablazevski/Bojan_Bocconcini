import React from 'react';
import { Store } from 'lucide-react';

export interface Restaurant {
  id: number;
  name: string;
  is_at_capacity?: boolean;
  is_open?: boolean;
  delivery_delay?: number;
  average_prep_time?: number;
  [key: string]: any;
}

interface Props {
  restaurant: Restaurant;
  selected?: boolean;
  onClick: () => void;
  category: string;
}

export const RestaurantCard = React.memo(({ restaurant, selected, onClick, category }: Props) => {
  return (
    <div 
      onClick={onClick}
      className={`flex-shrink-0 w-32 h-24 p-3 rounded-2xl flex flex-col justify-between cursor-pointer transition-all border-2 
        ${selected 
          ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' 
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
        }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${restaurant.is_at_capacity ? 'bg-orange-400 animate-pulse' : (restaurant.is_open ? 'bg-emerald-400' : 'bg-red-400')}`} />
          {restaurant.is_at_capacity && (
            <span className={`text-[7px] font-black uppercase px-1 rounded-sm ${selected ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'}`}>ЗАФАТЕНО</span>
          )}
        </div>
        {( (restaurant.delivery_delay || 0) > 0 || restaurant.average_prep_time) && (
          <span className={`text-[9px] font-black ${selected ? 'text-white' : 'text-orange-500'}`}>
            ~{(restaurant.average_prep_time || 30) + (restaurant.delivery_delay || 0)} мин.
          </span>
        )}
      </div>
      <div className="mt-2">
        <p className={`text-[11px] font-black leading-none truncate ${selected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{restaurant.name}</p>
        <p className={`text-[8px] font-bold uppercase tracking-tighter mt-1 truncate ${selected ? 'text-orange-100' : 'text-slate-400'}`}>
          {category}
        </p>
      </div>
    </div>
  );
});

RestaurantCard.displayName = 'RestaurantCard';
