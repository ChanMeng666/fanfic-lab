import "server-only";
import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    home: "/",
    signIn: "/handler/sign-in",
    signUp: "/handler/sign-up",
    afterSignIn: "/",
    afterSignUp: "/create",
    afterSignOut: "/",
    signOut: "/handler/sign-out",
    emailVerification: "/handler/email-verification",
    passwordReset: "/handler/password-reset",
    forgotPassword: "/handler/forgot-password",
    magicLinkCallback: "/handler/magic-link-callback",
    oauthCallback: "/handler/oauth-callback",
    handler: "/handler",
    accountSettings: "/handler/account-settings",
  },
});
