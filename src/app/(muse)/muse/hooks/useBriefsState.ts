"use client";
import { useState } from "react";

/**
 * Brief/Colab-scoped state, extracted from page.tsx. Owns the collab brief
 * composer, saved/applied brief ids, and the user's posted briefs.
 */
export function useBriefsState() {
  const [savedBriefs, setSavedBriefs] = useState<number[]>([]);
  const [appliedBriefs, setAppliedBriefs] = useState<number[]>([]);
  const [showPostBrief, setShowPostBrief] = useState(false);
  const [briefTitle, setBriefTitle] = useState("");
  const [briefDesc, setBriefDesc] = useState("");
  const [briefBudget, setBriefBudget] = useState("");
  const [briefCat, setBriefCat] = useState<"tfp" | "paid" | "opencall" | "concept">("concept");
  const [userBriefs, setUserBriefs] = useState<{ id: number; title: string; desc: string; budget: string; tags: string[]; cat: string }[]>([]);

  return {
    savedBriefs, setSavedBriefs,
    appliedBriefs, setAppliedBriefs,
    showPostBrief, setShowPostBrief,
    briefTitle, setBriefTitle,
    briefDesc, setBriefDesc,
    briefBudget, setBriefBudget,
    briefCat, setBriefCat,
    userBriefs, setUserBriefs,
  };
}
