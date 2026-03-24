import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roles: string[];
      currentMode: "employee" | "admin";
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    roles: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: string[];
    currentMode: "employee" | "admin";
  }
}
