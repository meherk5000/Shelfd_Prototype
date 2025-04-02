import { Layout } from "@/components/layout";

export default function ClubsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
