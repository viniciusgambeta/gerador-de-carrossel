"use client";

import dynamic from "next/dynamic";

// Settings and the last carousel live in localStorage: render on the client only
const App = dynamic(() => import("@/components/App"), { ssr: false });

export default function Page() {
  return <App />;
}
