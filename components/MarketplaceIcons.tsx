
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
        case Platform.SHEIN:
            return (
                <div className={`${className} flex items-center justify-center bg-black text-white font-black tracking-widest text-xs px-2 py-1 rounded-md shadow-sm select-none border border-neutral-700`}>
                    <span className="font-black tracking-widest text-xs">SHEIN</span>
                </div>
            );
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
