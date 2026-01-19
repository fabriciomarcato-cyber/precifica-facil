
import React from 'react';
import { Store } from 'lucide-react';
import { Platform } from '../types';

export const getMarketplaceIcon = (platform: Platform) => {
    // Returns a single, neutral, and consistent icon for all marketplace platforms
    // to maintain a premium and tool-focused identity, rather than a brand-focused one.
    return <Store className="w-6 h-6 text-blue-600" />;
};
