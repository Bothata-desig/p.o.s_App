
import React from 'react';

const BaseIcon = ({ children, size = 20 }: { children?: React.ReactNode; size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const IconPlus = () => <BaseIcon><path d="M5 12h14"/><path d="M12 5v14"/></BaseIcon>;
export const IconMinus = () => <BaseIcon><path d="M5 12h14"/></BaseIcon>;
export const IconTrash = () => <BaseIcon size={18}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></BaseIcon>;
export const IconShoppingBag = () => <BaseIcon><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></BaseIcon>;
export const IconInventory = () => <BaseIcon><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></BaseIcon>;
export const IconChart = () => <BaseIcon><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></BaseIcon>;
export const IconZap = () => <BaseIcon><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></BaseIcon>;
export const IconSearch = () => <BaseIcon><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></BaseIcon>;export const IconSettings = () => <BaseIcon><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6"/><path d="M4.22 4.22l4.24 4.24m5.08 0l4.24-4.24M1 12h6m6 0h6"/><path d="M4.22 19.78l4.24-4.24m5.08 0l4.24 4.24"/></BaseIcon>;
export const IconX = () => <BaseIcon><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></BaseIcon>;