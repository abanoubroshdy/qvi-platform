import { LoginView } from "@/components/auth/LoginView";
import { postAuthPath } from "@/lib/qv1-download";
import { buildPageMetadata } from "@/lib/seo";

const pageTitle = "Sign in";
const pageDescription = "Sign in or create your QVI account to download QV1 Evaluation and manage your waitlist spot.";

export const metadata = {
  ...buildPageMetadata({
    title: pageTitle,
    description: pageDescription,
    path: "/login",
  }),
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams?: { mode?: string; next?: string };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const initialMode = searchParams?.mode === "signup" ? "signup" : "signin";
  return <LoginView initialMode={initialMode} nextPath={postAuthPath(searchParams?.next)} />;
}
