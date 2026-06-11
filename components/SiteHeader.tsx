import Link from "next/link";
import { BrandMark, Wordmark } from "./Brand";

/** Header global: marca centralizada, borda inferior dourada, sticky. */
export default function SiteHeader({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 grid h-16 grid-cols-[1fr_auto_1fr] items-center border-b-2 border-cs-gold bg-[#0c1016] px-4 sm:px-6">
      <div className="flex items-center justify-start gap-3 text-cs-txt">{left}</div>
      <Link href="/" className="flex items-center gap-2.5">
        <BrandMark size={32} />
        <Wordmark size={26} />
      </Link>
      <div className="flex items-center justify-end gap-2 text-cs-txt">{right}</div>
    </header>
  );
}

export function IconButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-cs-txt transition hover:bg-white/5 hover:text-cs-gold"
    >
      {children}
    </button>
  );
}
