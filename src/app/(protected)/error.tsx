"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ProtectedError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <h2 className="text-xl font-semibold text-red-600">Ocurrio un error al cargar la pagina</h2>
      <p className="text-sm text-slate-500">
        Hubo un problema al obtener los datos. Por favor, intenta de nuevo.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
