"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

/**
 * Boost-expiry ticker, extracted verbatim from page.tsx. Same early-return,
 * 5s interval and [boostActive, boostEnd, setBoostActive] deps.
 */
export type UseBoostExpiryArgs = {
  boostActive: boolean;
  boostEnd: number;
  setBoostActive: Dispatch<SetStateAction<boolean>>;
  safeRemoveItem: (key: string) => void;
};

export function useBoostExpiry({ boostActive, boostEnd, setBoostActive, safeRemoveItem }: UseBoostExpiryArgs) {
  useEffect(() => { if(!boostActive||!boostEnd)return;const iv=setInterval(()=>{if(Date.now()>=boostEnd){setBoostActive(false);try{safeRemoveItem("muse_boost");}catch{console.debug("[muse] expired boost state could not be cleared");}}},5000);return()=>clearInterval(iv); }, [boostActive,boostEnd,setBoostActive]);
}
