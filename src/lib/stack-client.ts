"use client";

import { StackClientApp } from "@stackframe/stack";

export const stackClientApp = new StackClientApp({
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
  tokenStore: "cookie",
  urls: {
    home: "/",
    signIn: "/handler/sign-in",
    signUp: "/handler/sign-up",
    afterSignIn: "/",
    afterSignUp: "/wizard",
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
