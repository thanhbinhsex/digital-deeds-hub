import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ArrowLeft, User } from 'lucide-react';
import { format } from 'date-fns';

interface BlogPost {
  id: string;
  title: string;
  title_vi: string | null;
  slug: string;
  content: string | null;
  content_vi: string | null;
  excerpt: string | null;
  excerpt_vi: string | null;
  image_url: string | null;
  author_id: string;
  published_at: string | null;
  created_at: string;
}

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = useLanguage();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const response = await api.getBlogPost(slug!);
      if (!response.success || !response.data) throw new Error('Post not found');
      return response.data as BlogPost;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <SidebarLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-64 w-full rounded-xl mb-6" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-48 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (error || !post) {
    return (
      <SidebarLayout>
        <div className="p-6 max-w-4xl mx-auto text-center py-16">
          <h1 className="text-2xl font-bold mb-4">
            {lang === 'vi' ? 'Không tìm thấy bài viết' : 'Post not found'}
          </h1>
          <Link to="/blog">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {lang === 'vi' ? 'Quay lại Blog' : 'Back to Blog'}
            </Button>
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  const title = lang === 'vi' && post.title_vi ? post.title_vi : post.title;
  const content = lang === 'vi' && post.content_vi ? post.content_vi : post.content;

  return (
    <SidebarLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <Link to="/blog">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {lang === 'vi' ? 'Quay lại Blog' : 'Back to Blog'}
          </Button>
        </Link>

        {post.image_url && (
          <img
            src={post.image_url}
            alt={title}
            className="w-full h-64 md:h-96 object-cover rounded-xl mb-6"
          />
        )}

        <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>

        <div className="flex items-center gap-4 text-muted-foreground mb-8 pb-6 border-b">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(new Date(post.published_at || post.created_at), 'dd/MM/yyyy')}
          </div>
        </div>

        <article className="prose prose-lg dark:prose-invert max-w-none">
          {content ? (
            content.split('\n').map((paragraph, index) => (
              paragraph.trim() && <p key={index}>{paragraph}</p>
            ))
          ) : (
            <p className="text-muted-foreground">
              {lang === 'vi' ? 'Không có nội dung' : 'No content'}
            </p>
          )}
        </article>
      </div>
    </SidebarLayout>
  );
}
