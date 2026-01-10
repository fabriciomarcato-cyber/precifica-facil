
import React from 'react';
import { Platform } from '../types';

const MercadoLivreIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M11.63 15.63a1.43 1.43 0 0 1-2.03 0l-1.1-1.1a1.44 1.44 0 0 1 0-2.03l4.5-4.5a1.44 1.44 0 0 1 2.03 0l1.1 1.1a1.44 1.44 0 0 1 0 2.03l-4.5 4.5Z" />
    <path d="M19.13 8.33a1.44 1.44 0 0 0-2.03 0l-1.1 1.1a1.44 1.44 0 0 0 0 2.03l4.5 4.5a1.44 1.44 0 0 0 2.03 0l1.1-1.1a1.44 1.44 0 0 0 0-2.03l-4.5-4.5Z" />
    <path d="M4.88 15.63a1.44 1.44 0 0 1-2.03 0l-1.1-1.1a1.44 1.44 0 0 1 0-2.03l4.5-4.5a1.44 1.44 0 0 1 2.03 0l1.1 1.1a1.44 1.44 0 0 1 0 2.03l-4.5 4.5Z" />
  </svg>
);

const ShopeeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.5,9.5H18V6.3a.8.8,0,0,0-.8-.8H6.8a.8.8,0,0,0-.8.8V9.5H3.5a.8.8,0,0,0-.8.8v8.4a.8.8,0,0,0,.8.8h17a.8.8,0,0,0,.8-.8V10.3A.8.8,0,0,0,20.5,9.5ZM8,7.5h8v2H8Zm7,6.2a3,3,0,0,1-6,0,1,1,0,0,1,2,0,1,1,0,1,0,2,0,1,1,0,0,1,2,0Z" />
  </svg>
);

const TikTokIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.1.04-4.15-.91-5.69-2.56-1.54-1.65-2.4-3.84-2.26-5.93.07-1.1.31-2.19.72-3.22.41-1 .99-1.93 1.73-2.71 1.52-1.61 3.54-2.57 5.69-2.66.03 2.73-.02 5.46.02 8.19.03 1.48-.35 2.96-1.2 4.13-1.07 1.46-2.82 2.34-4.64 2.34-1.37 0-2.73-.43-3.84-1.24-.81-.6-1.46-1.4-1.92-2.31-.47-.9-.7-1.92-.7-2.96.01-1.21.23-2.41.65-3.53.43-1.14 1.05-2.19 1.86-3.08 1.65-1.8 3.9-2.89 6.27-3.11.02-2.87.01-5.74.02-8.61Z"/>
  </svg>
);

const InstagramIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
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
