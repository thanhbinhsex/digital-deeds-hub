import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/i18n';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FolderOpen, Loader2, Search, GripVertical } from 'lucide-react';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  name_vi: z.string().optional(),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  sort_order: z.number().default(0),
});

type CategoryForm = z.infer<typeof categorySchema>;

export default function AdminCategoriesPage() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories', search],
    queryFn: async () => {
      let query = supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (search) {
        query = query.or(`name.ilike.%${search}%,name_vi.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: productCounts } = useQuery({
    queryKey: ['category-product-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((product) => {
        if (product.category_id) {
          counts[product.category_id] = (counts[product.category_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      sort_order: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryForm) => {
      const { error } = await supabase.from('categories').insert({
        name: data.name,
        name_vi: data.name_vi || null,
        slug: data.slug,
        description: data.description || null,
        icon: data.icon || null,
        sort_order: data.sort_order,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(lang === 'en' ? 'Category created!' : 'Đã tạo danh mục!');
      setIsDialogOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CategoryForm & { id: string }) => {
      const { id, ...rest } = data;
      const { error } = await supabase
        .from('categories')
        .update({
          name: rest.name,
          name_vi: rest.name_vi || null,
          slug: rest.slug,
          description: rest.description || null,
          icon: rest.icon || null,
          sort_order: rest.sort_order,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(lang === 'en' ? 'Category updated!' : 'Đã cập nhật danh mục!');
      setIsDialogOpen(false);
      setEditingCategory(null);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(lang === 'en' ? 'Category deleted!' : 'Đã xóa danh mục!');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      name_vi: category.name_vi || '',
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '',
      sort_order: category.sort_order || 0,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    reset({
      name: '',
      name_vi: '',
      slug: '',
      description: '',
      icon: '',
      sort_order: (categories?.length || 0) + 1,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: CategoryForm) => {
    if (editingCategory) {
      updateMutation.mutate({ ...data, id: editingCategory.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-display text-2xl font-bold">
          {lang === 'en' ? 'Categories' : 'Danh mục'}
        </h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate} className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              {lang === 'en' ? 'Add Category' : 'Thêm danh mục'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCategory
                  ? lang === 'en' ? 'Edit Category' : 'Sửa danh mục'
                  : lang === 'en' ? 'Add Category' : 'Thêm danh mục'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name (EN)</Label>
                  <Input
                    {...register('name')}
                    onChange={(e) => {
                      register('name').onChange(e);
                      if (!editingCategory) {
                        setValue('slug', generateSlug(e.target.value));
                      }
                    }}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Name (VI)</Label>
                  <Input {...register('name_vi')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Slug</Label>
                <Input {...register('slug')} placeholder="category-slug" />
                {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea {...register('description')} rows={2} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Icon (Lucide name)</Label>
                  <Input {...register('icon')} placeholder="e.g. package, code, palette" />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" {...register('sort_order', { valueAsNumber: true })} />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  className="gradient-primary text-primary-foreground"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={lang === 'en' ? 'Search categories...' : 'Tìm danh mục...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{lang === 'en' ? 'Category' : 'Danh mục'}</TableHead>
                <TableHead>{lang === 'en' ? 'Slug' : 'Slug'}</TableHead>
                <TableHead className="text-center">{lang === 'en' ? 'Products' : 'Sản phẩm'}</TableHead>
                <TableHead>{lang === 'en' ? 'Created' : 'Ngày tạo'}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : categories && categories.length > 0 ? (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="text-muted-foreground">
                      {category.sort_order}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FolderOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">
                            {lang === 'vi' && category.name_vi ? category.name_vi : category.name}
                          </p>
                          {category.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {category.slug}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-muted text-sm font-medium">
                        {productCounts?.[category.id] || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(category.created_at, lang).split(',')[0]}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(category)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            const productCount = productCounts?.[category.id] || 0;
                            if (productCount > 0) {
                              toast.error(
                                lang === 'en'
                                  ? `Cannot delete category with ${productCount} products`
                                  : `Không thể xóa danh mục có ${productCount} sản phẩm`
                              );
                              return;
                            }
                            if (confirm(lang === 'en' ? 'Delete this category?' : 'Xóa danh mục này?')) {
                              deleteMutation.mutate(category.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {lang === 'en' ? 'No categories found' : 'Không tìm thấy danh mục'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
