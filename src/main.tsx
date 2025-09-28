import "./boot/verify-backend";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
import { add } from "@shared/utils/math";
import type { HiveUser } from "@shared/types/hive";

console.log("Shared add(2,3) =", add(2, 3));

const testUser: HiveUser = { id: "1", name: "Papa Joe" };
console.log("Shared type test:", testUser);



