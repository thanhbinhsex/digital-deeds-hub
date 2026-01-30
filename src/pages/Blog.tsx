import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface BlogPost {
  id: string;
  title: string;
  title_vi: string | null;
  slug: string;
  excerpt: string | null;
  excerpt_vi: string | null;
  image_url: string | null;
  published_at: string | null;
  created_at: string;
}

export default function BlogPage() {
  const { lang } = useLanguage();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const response = await api.getBlogPosts();
      return (response.data || []) as BlogPost[];
    },
  });

  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {lang === 'vi' ? 'Blog' : 'Blog'}
          </h1>
          <p className="text-muted-foreground">
            {lang === 'vi'
              ? 'Tin tức và bài viết mới nhất'
              : 'Latest news and articles'}
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              {lang === 'vi' ? 'Chưa có bài viết nào' : 'No posts yet'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow group">
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt={lang === 'vi' && post.title_vi ? post.title_vi : post.title}
                      className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="h-48 w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-4xl font-bold text-primary/30">
                        {(lang === 'vi' && post.title_vi ? post.title_vi : post.title).charAt(0)}
                      </span>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      {format(
                        new Date(post.published_at || post.created_at),
                        'dd/MM/yyyy'
                      )}
                    </div>
                    <h2 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {lang === 'vi' && post.title_vi ? post.title_vi : post.title}
                    </h2>
                    {(lang === 'vi' ? post.excerpt_vi : post.excerpt) && (
                      <p className="text-muted-foreground text-sm line-clamp-3 mb-3">
                        {lang === 'vi' ? post.excerpt_vi : post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center text-primary text-sm font-medium">
                      {lang === 'vi' ? 'Đọc thêm' : 'Read more'}
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
