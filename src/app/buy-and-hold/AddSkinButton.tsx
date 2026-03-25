"use client";

import { useState } from "react";
import AddSkinModal from "@/components/AddSkinModal";
import SyncSupplyModal from "@/components/SyncSupplyModal";
import { useRouter } from "next/navigation";

export default function AddSkinButton() {
  const [skinOpen, setSkinOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => router.refresh();

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSyncOpen(true)}
          className="flex items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-300 hover:text-cyan-200 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sync Data
        </button>
        <button
          onClick={() => setSkinOpen(true)}
          className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-300 hover:text-emerald-200 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Dodaj Skina
        </button>
      </div>

      {skinOpen && <AddSkinModal onClose={() => setSkinOpen(false)} onSuccess={handleSuccess} />}
      {syncOpen && <SyncSupplyModal onClose={() => setSyncOpen(false)} />}
    </>
  );
}
