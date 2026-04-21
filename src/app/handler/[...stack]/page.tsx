import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/lib/stack";
import { AuthShell } from "@/components/auth/AuthShell";

interface HandlerProps {
  params: Promise<{ stack: string[] }>;
  searchParams: Promise<Record<string, string>>;
}

const SHELL_COPY: Record<string, { title: string; subtitle: string }> = {
  "sign-in": {
    title: "欢迎回来",
    subtitle: "登录后继续与 AI 共创你的同人世界。",
  },
  "sign-up": {
    title: "开始你的同人创作",
    subtitle: "注册一个账号，让 AI 帮你写出心里的剧情。",
  },
};

export default async function Handler(props: HandlerProps) {
  const { stack } = await props.params;
  const route = stack?.[0] ?? "";
  const copy = SHELL_COPY[route];

  if (copy) {
    return (
      <AuthShell title={copy.title} subtitle={copy.subtitle}>
        <StackHandler
          app={stackServerApp}
          routeProps={props}
          fullPage={false}
        />
      </AuthShell>
    );
  }

  return (
    <StackHandler app={stackServerApp} routeProps={props} fullPage={true} />
  );
}
