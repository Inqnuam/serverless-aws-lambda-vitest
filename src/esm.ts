import { fileURLToPath } from "url";
export const actualDirName = fileURLToPath(new URL(".", import.meta.url));
