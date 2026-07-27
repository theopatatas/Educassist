import type { AuthenticatedUser } from "./auth";
import type { ActiveTakeoverContext } from "../modules/leave/takeover-context";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      takeoverContext?: ActiveTakeoverContext;
    }
  }
}

export {};
