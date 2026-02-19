import { Suspense } from "react";
import HomeClient from "./CardapioClient";

export default function Page() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        background: "#0b0f14",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18
      }}>
        Carregando cardápio...
      </div>
    }>
      <HomeClient />
    </Suspense>
  );
}
