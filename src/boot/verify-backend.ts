import { getHealthz } from "../integrations/api";

getHealthz()
  .then((data) => console.log("frontend->backend OK:", data))
  .catch((e) => console.error("frontend->backend ERR:", e));
