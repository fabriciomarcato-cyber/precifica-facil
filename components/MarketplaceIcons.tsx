
import React from 'react';
import { Platform } from '../types';

const MercadoLivreIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10.6 18.4L4.2 12l6.4-6.4"/>
    <path d="M13.4 5.6l6.4 6.4-6.4 6.4"/>
  </svg>
);

const ShopeeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

const TikTokIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8.1V16c0 2.2-1.8 4-4 4s-4-1.8-4-4V4.5A3.5 3.5 0 1 1 11.5 8"/>
  </svg>
);

const InstagramIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const iconMap = {
    [Platform.ML_CLASSICO]: <MercadoLivreIcon className="w-6 h-6 text-yellow-500" />,
    [Platform.ML_PREMIUM]: <MercadoLivreIcon className="w-6 h-6 text-yellow-500" />,
    [Platform.SHOPEE]: <ShopeeIcon className="w-6 h-6 text-orange-500" />,
    [Platform.TIKTOK_SHOP]: <TikTokIcon className="w-6 h-6 text-gray-800" />,
    [Platform.INSTAGRAM]: <InstagramIcon className="w-6 h-6 text-indigo-500" />,
};

export const getMarketplaceIcon = (platform: Platform) => {
    return iconMap[platform] || null;
};
