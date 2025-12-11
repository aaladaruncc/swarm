import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-12 border-t border-neutral-100 bg-white text-sm font-light">
      <div className="container mx-auto px-6 max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6">
        
        <div className="text-neutral-400">
          © {new Date().getFullYear()} Vantage
        </div>

        <nav className="flex gap-8 text-neutral-600">
          <Link href="#" className="hover:text-black transition-colors">Features</Link>
          <Link href="#" className="hover:text-black transition-colors">Blog</Link>
          <Link href="#" className="hover:text-black transition-colors">Privacy Policy</Link>
        </nav>

      </div>
    </footer>
  );
}
