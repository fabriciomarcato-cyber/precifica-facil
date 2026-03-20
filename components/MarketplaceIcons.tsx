
import React from 'react';
import { Store } from 'lucide-react';
import { Platform } from '../types';

export const getMarketplaceIcon = (platform: Platform, className: string = "w-[58px] h-[58px]") => {
    let src = '';
    switch (platform) {
        case Platform.ML_CLASSICO:
        case Platform.ML_PREMIUM:
            src = 'https://i.postimg.cc/RZpfX1wT/Mercado_Livre.png';
            break;
        case Platform.SHOPEE:
            src = 'https://i.postimg.cc/mgpM837m/Logo_Shopee_(1).png';
            break;
        case Platform.TIKTOK_SHOP:
            src = 'https://i.postimg.cc/4x2tBvp8/tiktokshop.png';
            break;
        case Platform.INSTAGRAM:
            src = 'https://i.postimg.cc/6pbRYVCz/Instagram.png';
            break;
        default:
            return <Store className={`${className} text-blue-600`} />;
    }

    return (
        <img 
            src={src} 
            alt={`${platform} logo`} 
            className={`${className} object-contain`} 
            referrerPolicy="no-referrer"
        />
    );
};
