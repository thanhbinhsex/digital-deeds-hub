import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Eye, ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
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
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminBlogPage() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    title_vi: '',
    slug: '',
    content: '',
    content_vi: '',
    excerpt: '',
    excerpt_vi: '',
    image_url: '',
    status: 'draft',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const uploadImage = async (file: File, slug: string) => {
    const fileName = `blog-${slug}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('category-icons').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('category-icons').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      let imageUrl = data.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, data.slug);
      }
      const { error } = await supabase.from('blog_posts').insert({
        title: data.title,
        title_vi: data.title_vi || null,
        slug: data.slug,
        content: data.content || null,
        content_vi: data.content_vi || null,
        excerpt: data.excerpt || null,
        excerpt_vi: data.excerpt_vi || null,
        image_url: imageUrl || null,
        author_id: user?.id,
        status: data.status,
        published_at: data.status === 'published' ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success(lang === 'vi' ? 'Tạo bài viết thành công' : 'Post created successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      let imageUrl = data.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, data.slug);
      }
      const { error } = await supabase
        .from('blog_posts')
        .update({
          title: data.title,
          title_vi: data.title_vi || null,
          slug: data.slug,
          content: data.content || null,
          content_vi: data.content_vi || null,
          excerpt: data.excerpt || null,
          excerpt_vi: data.excerpt_vi || null,
          image_url: imageUrl || null,
          status: data.status,
          published_at: data.status === 'published' && !editingPost?.published_at 
            ? new Date().toISOString() 
            : editingPost?.published_at,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success(lang === 'vi' ? 'Cập nhật bài viết thành công' : 'Post updated successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success(lang === 'vi' ? 'Xóa bài viết thành công' : 'Post deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      title_vi: '',
      slug: '',
      content: '',
      content_vi: '',
      excerpt: '',
      excerpt_vi: '',
      image_url: '',
      status: 'draft',
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingPost(null);
    setDialogOpen(false);
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      title_vi: post.title_vi || '',
      slug: post.slug,
      content: post.content || '',
      content_vi: post.content_vi || '',
      excerpt: post.excerpt || '',
      excerpt_vi: post.excerpt_vi || '',
      image_url: post.image_url || '',
      status: post.status,
    });
    setImagePreview(post.image_url);
    setDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {lang === 'vi' ? 'Quản Lý Blog' : 'Blog Management'}
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              {lang === 'vi' ? 'Thêm Bài Viết' : 'Add Post'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPost
                  ? lang === 'vi' ? 'Sửa Bài Viết' : 'Edit Post'
                  : lang === 'vi' ? 'Thêm Bài Viết' : 'Add Post'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{lang === 'vi' ? 'Tiêu đề (EN)' : 'Title (EN)'}</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        title: e.target.value,
                        slug: !editingPost ? generateSlug(e.target.value) : formData.slug
                      });
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'vi' ? 'Tiêu đề (VI)' : 'Title (VI)'}</Label>
                  <Input
                    value={formData.title_vi}
                    onChange={(e) => setFormData({ ...formData, title_vi: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{lang === 'vi' ? 'Tóm tắt (EN)' : 'Excerpt (EN)'}</Label>
                  <Textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'vi' ? 'Tóm tắt (VI)' : 'Excerpt (VI)'}</Label>
                  <Textarea
                    value={formData.excerpt_vi}
                    onChange={(e) => setFormData({ ...formData, excerpt_vi: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{lang === 'vi' ? 'Nội dung (EN)' : 'Content (EN)'}</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'vi' ? 'Nội dung (VI)' : 'Content (VI)'}</Label>
                  <Textarea
                    value={formData.content_vi}
                    onChange={(e) => setFormData({ ...formData, content_vi: e.target.value })}
                    rows={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{lang === 'vi' ? 'Hình ảnh' : 'Image'}</Label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-32 w-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                          setFormData({ ...formData, image_url: '' });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 w-48 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground mt-2">
                        {lang === 'vi' ? 'Tải ảnh lên' : 'Upload image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{lang === 'vi' ? 'Trạng thái' : 'Status'}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{lang === 'vi' ? 'Nháp' : 'Draft'}</SelectItem>
                    <SelectItem value="published">{lang === 'vi' ? 'Đã xuất bản' : 'Published'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  {lang === 'vi' ? 'Hủy' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingPost
                    ? lang === 'vi' ? 'Cập nhật' : 'Update'
                    : lang === 'vi' ? 'Tạo' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === 'vi' ? 'Hình ảnh' : 'Image'}</TableHead>
                <TableHead>{lang === 'vi' ? 'Tiêu đề' : 'Title'}</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>{lang === 'vi' ? 'Trạng thái' : 'Status'}</TableHead>
                <TableHead>{lang === 'vi' ? 'Ngày tạo' : 'Created'}</TableHead>
                <TableHead className="text-right">{lang === 'vi' ? 'Hành động' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {lang === 'vi' ? 'Chưa có bài viết nào' : 'No posts yet'}
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      {post.image_url ? (
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="h-12 w-20 object-cover rounded"
                        />
                      ) : (
                        <div className="h-12 w-20 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {lang === 'vi' && post.title_vi ? post.title_vi : post.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{post.slug}</TableCell>
                    <TableCell>
                      <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                        {post.status === 'published'
                          ? lang === 'vi' ? 'Đã xuất bản' : 'Published'
                          : lang === 'vi' ? 'Nháp' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(post.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(lang === 'vi' ? 'Bạn có chắc muốn xóa?' : 'Are you sure?')) {
                              deleteMutation.mutate(post.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
