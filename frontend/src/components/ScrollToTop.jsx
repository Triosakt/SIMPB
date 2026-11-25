import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      return;
    }
    let first, second;
    first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        let target = null;
        try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { /* invalid hash */ }
        if (target) target.scrollIntoView({ block: "start" });
        else window.scrollTo(0, 0);
      });
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [pathname, hash]);
  return null;
}
