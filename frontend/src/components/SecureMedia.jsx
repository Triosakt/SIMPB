
import { useEffect, useState } from "react";
import { fetchSecureMedia } from "../api/client.js";

export default function SecureMedia({
  src,
  alt = "",
  className = "",
  loading = "lazy",
}) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!src) {
      setUrl("");
      return;
    }

    const controller = new AbortController();
    let objectUrl = "";

    setUrl("");

    fetchSecureMedia(src, controller.signal)
      .then(blob => {
        if (controller.signal.aborted) return;

        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          console.error("Gagal memuat media terlindungi:", error);
          setUrl("");
        }
      });

    return () => {
      controller.abort();

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (!url) return null;

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading={loading}
    />
  );
}
