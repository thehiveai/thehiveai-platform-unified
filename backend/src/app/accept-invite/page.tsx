import { Suspense } from "react";
import AcceptInviteClient from "./AcceptInviteClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense>
      <AcceptInviteClient />
    </Suspense>
  );
}
