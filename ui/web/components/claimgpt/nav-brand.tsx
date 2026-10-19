"use client";

export default function NavBrand({ children }: { children: React.ReactNode }) {
  return (
    <a
      className="lp-brand"
      href="#top"
      onClick={(e) => {
        e.preventDefault();
        document.querySelector(".lp")?.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      {children}
    </a>
  );
}
