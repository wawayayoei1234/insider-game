"use client";

import dynamic from "next/dynamic";

const InsiderGamePage = dynamic(
  () => import("../components/insider/InsiderGamePage"),
  { ssr: false }
);

export default function Page() {
  return <InsiderGamePage />;
}
