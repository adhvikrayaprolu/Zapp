import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Landing route after backend completes Spotify OAuth redirect.
 * Query params are convention-based; align with your Django redirect URL.
 */
export function SpotifyCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const err = searchParams.get("error");
    const errDesc = searchParams.get("error_description");
    const success = searchParams.get("success");
    const connected = searchParams.get("connected");

    if (err) {
      const msg = errDesc ? decodeURIComponent(errDesc.replace(/\+/g, " ")) : decodeURIComponent(err);
      toast.error(msg || "Spotify connection failed.");
      navigate("/subscriptions", { replace: true });
      return;
    }

    if (success === "1" || success === "true" || connected === "1" || connected === "true") {
      toast.success("Spotify connected.");
      navigate("/subscriptions?spotify=connected", { replace: true });
      return;
    }

    toast.message("Checking your Spotify connection…");
    navigate("/subscriptions?spotify=connected", { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6">
      <Loader2 className="h-10 w-10 animate-spin text-[#1DB954]" />
      <p className="text-center text-sm font-bold uppercase tracking-widest text-gray-500">Finishing Spotify…</p>
    </div>
  );
}
