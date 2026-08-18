import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function PageTransition() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [key, setKey] = useState(0);
  const [show, setShow] = useState(false);
  const [first, setFirst] = useState(true);

  useEffect(() => {
    if (first) { setFirst(false); return; }
    setKey((k) => k + 1);
    setShow(true);
    const t = setTimeout(() => setShow(false), 560);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!show) return null;
  return (
    <div key={key} className="page-transition" aria-hidden>
      <div className="page-transition-ring" />
      <div className="page-transition-logo">
        <Logo size={64} />
      </div>
    </div>
  );
}
