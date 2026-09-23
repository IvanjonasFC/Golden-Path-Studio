"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BackButton() {
  const pathname = usePathname();
  
  if (pathname === "/") return null;
  
  return (
    <Link 
      href="/" 
      title="Volver" 
      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-bold text-white transition-all hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 hover:shadow-lg"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
      <span>Volver</span>
    </Link>
  );
}
