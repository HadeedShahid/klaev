"use client";

// Scrolls to a section on this page and leaves the address alone: a #section in it would come back
// with the page and fight Next's scroll restoration. The href only serves a tap before hydration.
// scrollIntoView follows the page's own scroll behaviour and padding, so it glides like a normal anchor.
export function ScrollLink({ to, className, children }: { to: string; className?: string; children: React.ReactNode }) {
  function scrollToSection(event: React.MouseEvent<HTMLAnchorElement>) {
    const section = document.getElementById(to);
    if (!section) return;
    event.preventDefault();
    section.scrollIntoView();
    section.focus({ preventScroll: true });
  }

  return (
    <a href={`#${to}`} onClick={scrollToSection} className={className}>
      {children}
    </a>
  );
}
