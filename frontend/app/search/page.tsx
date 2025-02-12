import { Layout } from "@/components/layout";
import { Search } from "@/components/search";

export default function SearchPage() {
  return (
    <Layout>
      <div className="container py-6">
        <Search />
      </div>
    </Layout>
  );
}
