import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Film, Newspaper, Star, Users, Library } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6" />
            <span className="text-xl font-bold">shelfd</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Features
            </Link>
            <Link
              href="#discover"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Discover
            </Link>
            <Link
              href="#community"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Community
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="/auth/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 py-20 md:py-32 bg-gradient-to-b from-muted/50 to-background">
          <div className="container flex flex-col items-center text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Your digital shelf for all media
            </h1>
            <p className="text-xl text-muted-foreground max-w-[600px]">
              Track, rate, and discover your next favorite books, movies, TV
              shows, and articles. Join a community of passionate media
              enthusiasts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <Input placeholder="Enter your email" type="email" />
              <Button size="lg">Get Started</Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="container px-4 py-16 md:py-24">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need in one place
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col items-center text-center p-6 space-y-4 rounded-lg border bg-card"
              >
                <feature.icon className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Media Types Section */}
        <section id="discover" className="bg-muted/50 py-16 md:py-24">
          <div className="container px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Track all your media
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {mediaTypes.map((type) => (
                <div
                  key={type.title}
                  className="bg-background rounded-lg p-6 shadow-sm"
                >
                  <type.icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{type.title}</h3>
                  <p className="text-muted-foreground mb-4">
                    {type.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {type.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-secondary px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Community Section */}
        <section id="community" className="container px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">
                Join a community of enthusiasts
              </h2>
              <p className="text-xl text-muted-foreground">
                Connect with people who share your taste. Create and join clubs,
                share recommendations, and discover new favorites through people
                you trust.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg">Join Now</Button>
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:gap-6">
              {communityImages.map((image, i) => (
                <div
                  key={i}
                  className={`rounded-lg overflow-hidden ${
                    i === 0 ? "col-span-2" : ""
                  }`}
                >
                  <img
                    src={image || "/placeholder.svg"}
                    alt="Community"
                    className="w-full h-full object-cover aspect-[4/3]"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12">
        <div className="container px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h4 className="font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#">Features</Link>
                </li>
                <li>
                  <Link href="#">Pricing</Link>
                </li>
                <li>
                  <Link href="#">FAQ</Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#">About</Link>
                </li>
                <li>
                  <Link href="#">Blog</Link>
                </li>
                <li>
                  <Link href="#">Careers</Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#">Community</Link>
                </li>
                <li>
                  <Link href="#">Support</Link>
                </li>
                <li>
                  <Link href="#">Terms</Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Connect</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#">Twitter</Link>
                </li>
                <li>
                  <Link href="#">Instagram</Link>
                </li>
                <li>
                  <Link href="#">Discord</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Shelfd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Library,
    title: "Track Your Collection",
    description:
      "Organize and manage your media collection in one place. Rate, review, and keep track of what you've watched, read, and want to explore.",
  },
  {
    icon: Star,
    title: "Personal Reviews",
    description:
      "Share your thoughts and ratings with detailed reviews. Help others discover great content through your experiences.",
  },
  {
    icon: Users,
    title: "Join Communities",
    description:
      "Connect with like-minded enthusiasts in topic-specific clubs. Discuss, share recommendations, and make new friends.",
  },
];

const mediaTypes = [
  {
    icon: BookOpen,
    title: "Books",
    description: "From classics to contemporary, track your reading journey.",
    tags: ["Fiction", "Non-Fiction", "Poetry", "Graphic Novels"],
  },
  {
    icon: Film,
    title: "Movies & TV",
    description: "Keep up with your watchlist and share recommendations.",
    tags: ["Movies", "TV Series", "Documentaries", "Anime"],
  },
  {
    icon: Newspaper,
    title: "Articles",
    description: "Save and organize interesting reads from around the web.",
    tags: ["News", "Essays", "Newsletters", "Blogs"],
  },
];

const communityImages = [
  "/placeholder.svg?height=400&width=600",
  "/placeholder.svg?height=300&width=400",
  "/placeholder.svg?height=300&width=400",
];
