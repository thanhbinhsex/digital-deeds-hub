-- Create blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_vi TEXT,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  content_vi TEXT,
  excerpt TEXT,
  excerpt_vi TEXT,
  image_url TEXT,
  author_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can view published posts
CREATE POLICY "Anyone can view published posts"
ON public.blog_posts
FOR SELECT
USING (status = 'published' OR is_admin());

-- Admins can manage all posts
CREATE POLICY "Admins can manage posts"
ON public.blog_posts
FOR ALL
USING (is_admin());

-- Add updated_at trigger
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();