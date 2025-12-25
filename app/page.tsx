import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TreePine, Users, Share2, Image, FileText, Mic } from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <TreePine className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Family Tree</span>
          </div>
          <nav>
            {session?.user ? (
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Preserve Your Family History
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Create beautiful family trees, document memories with photos and audio,
          and share your heritage with loved ones.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href={session?.user ? "/dashboard" : "/login"}>
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <h2 className="text-2xl font-bold text-center mb-12">
          Everything you need to document your family
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TreePine className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Visual Family Tree</h3>
                  <p className="text-sm text-muted-foreground">
                    Interactive mindmap with drag-and-drop
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Relationship Mapping</h3>
                  <p className="text-sm text-muted-foreground">
                    Color-coded connections between members
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Share2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Easy Sharing</h3>
                  <p className="text-sm text-muted-foreground">
                    Invite family via WhatsApp or email
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Image className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Photo Gallery</h3>
                  <p className="text-sm text-muted-foreground">
                    Store photos for each family member
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Documents & Facts</h3>
                  <p className="text-sm text-muted-foreground">
                    Preserve important records and stories
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Audio Memories</h3>
                  <p className="text-sm text-muted-foreground">
                    Record and preserve voices and stories
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Family Tree App - Preserve your heritage for generations</p>
        </div>
      </footer>
    </div>
  );
}
