import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'big-display';

export interface ScreenDimensions {
  width: number;
  height: number;
  deviceType: DeviceType;
  isSmallMobile: boolean; // < 380px (iPhone SE, smaller Androids)
  isMobile: boolean;      // < 640px (smartphones)
  isTablet: boolean;      // 640px - 1023px (iPads, tablets)
  isLaptop: boolean;      // 1024px - 1439px (MacBook, laptops)
  isDesktop: boolean;     // 1440px - 1919px (desktop monitors)
  isBigDisplay: boolean;  // >= 1920px (TVs, 4K displays, stadium screens)
  isTouch: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
}

const getDimensions = (): ScreenDimensions => {
  if (typeof window === 'undefined') {
    return {
      width: 1200,
      height: 800,
      deviceType: 'laptop',
      isSmallMobile: false,
      isMobile: false,
      isTablet: false,
      isLaptop: true,
      isDesktop: false,
      isBigDisplay: false,
      isTouch: false,
      isPortrait: false,
      isLandscape: true,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isPortrait = height > width;
  const isLandscape = !isPortrait;

  const isSmallMobile = width < 380;
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const isLaptop = width >= 1024 && width < 1440;
  const isDesktop = width >= 1440 && width < 1920;
  const isBigDisplay = width >= 1920;

  let deviceType: DeviceType = 'desktop';
  if (isMobile) deviceType = 'mobile';
  else if (isTablet) deviceType = 'tablet';
  else if (isLaptop) deviceType = 'laptop';
  else if (isDesktop) deviceType = 'desktop';
  else if (isBigDisplay) deviceType = 'big-display';

  const isTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches;

  return {
    width,
    height,
    deviceType,
    isSmallMobile,
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isBigDisplay,
    isTouch,
    isPortrait,
    isLandscape,
  };
};

export const useDevice = (): ScreenDimensions => {
  const [dimensions, setDimensions] = useState<ScreenDimensions>(getDimensions);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDimensions(getDimensions());
      }, 50);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return dimensions;
};
