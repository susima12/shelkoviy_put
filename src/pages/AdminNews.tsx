import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { api, type NewsRow, type NewsPayload } from "@/lib/api-client";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { translateError } from "@/lib/translate-error";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ImagePlus, Pencil, Plus, ShieldAlert, Trash2, X } from "lucide-react";

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = () => ({
  title: "",
  excerpt: "",
  body: "",
  published_at: "",
});

const AdminNews = () => {
  const nav = useNavigate();
  const { user, isReady } = useAuthReady();
  const [rows, setRows] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePayload, setImagePayload] = useState<NewsPayload["image"] | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { news } = await api.getAdminNews();
    setRows(news ?? []);
  };

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      nav("/auth?redirect=/admin/news");
      return;
    }
    if (!user.is_admin) {
      setLoading(false);
      return;
    }
    load()
      .catch((e) => toast.error(translateError(e)))
      .finally(() => setLoading(false));
  }, [isReady, user, nav]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setImagePreview(null);
    setImagePayload(null);
    setRemoveImage(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (item: NewsRow) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      excerpt: item.excerpt ?? "",
      body: item.body ?? "",
      published_at: toDatetimeLocal(item.published_at),
    });
    setImagePreview(item.image_url ?? null);
    setImagePayload(null);
    setRemoveImage(false);
    if (fileRef.current) fileRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Изображение слишком большое (макс. 5 МБ)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result);
      setImagePreview(data);
      setImagePayload({ data, mime: file.type || "image/jpeg", name: file.name });
      setRemoveImage(false);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Укажите заголовок");
      return;
    }
    setBusy(true);
    try {
      const payload: NewsPayload = {
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        body: form.body.trim(),
        published_at: form.published_at ? new Date(form.published_at).toISOString() : undefined,
      };
      if (removeImage) payload.remove_image = true;
      else if (imagePayload) payload.image = imagePayload;

      if (editingId) {
        await api.updateNews(editingId, payload);
        toast.success("Новость обновлена");
      } else {
        await api.createNews(payload);
        toast.success("Новость опубликована");
      }
      await load();
      resetForm();
    } catch (err) {
      toast.error(translateError(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setBusy(true);
    try {
      await api.deleteNews(deleteId);
      toast.success("Новость удалена");
      if (editingId === deleteId) resetForm();
      await load();
    } catch (err) {
      toast.error(translateError(err));
    } finally {
      setBusy(false);
      setDeleteId(null);
    }
  };

  if (!isReady || loading) {
    return <div className="container py-16 text-center text-muted-foreground">Загрузка...</div>;
  }

  if (!user?.is_admin) {
    return (
      <div className="container py-16 max-w-lg mx-auto text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Доступ только для администраторов фестиваля.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl">Новости фестиваля</h1>
        <p className="text-muted-foreground mt-1">Публикации видны всем участникам на главной и в разделе «Новости».</p>
      </div>

      <Card className="p-6 mb-10">
        <h2 className="font-serif text-xl mb-4 flex items-center gap-2">
          {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {editingId ? "Редактирование новости" : "Новая публикация"}
        </h2>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="news-title">Заголовок *</Label>
            <Input
              id="news-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Например: Открыт приём заявок на конкурс хореографии"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="news-excerpt">Краткое описание</Label>
            <Textarea
              id="news-excerpt"
              value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              placeholder="Текст для карточки на главной странице"
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="news-body">Полный текст</Label>
            <Textarea
              id="news-body"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Подробное содержание новости. Абзацы разделяйте пустой строкой."
              rows={8}
              maxLength={20000}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="news-date">Дата публикации</Label>
              <Input
                id="news-date"
                type="datetime-local"
                value={form.published_at}
                onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Обложка</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onImagePick}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="h-4 w-4" />
                  {imagePreview ? "Заменить" : "Добавить фото"}
                </Button>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setImagePreview(null);
                      setImagePayload(null);
                      setRemoveImage(true);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                    Убрать
                  </Button>
                )}
              </div>
            </div>
          </div>

          {imagePreview && (
            <div className="rounded-lg overflow-hidden border border-border max-w-md">
              <img src={imagePreview} alt="" className="w-full max-h-48 object-cover" />
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" variant="wine" disabled={busy}>
              {editingId ? "Сохранить изменения" : "Опубликовать"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm} disabled={busy}>
                Отмена
              </Button>
            )}
          </div>
        </form>
      </Card>

      <h2 className="font-serif text-xl mb-4">Опубликованные ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Пока нет новостей.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <Card key={n.id} className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
              {n.image_url ? (
                <img src={n.image_url} alt="" className="w-full sm:w-24 h-20 object-cover rounded-md shrink-0" />
              ) : (
                <div className="w-full sm:w-24 h-20 bg-secondary rounded-md shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gold uppercase tracking-wider mb-1">
                  {format(new Date(n.published_at), "d MMM yyyy", { locale: ru })}
                </div>
                <h3 className="font-medium truncate">{n.title}</h3>
                {n.excerpt && <p className="text-sm text-muted-foreground line-clamp-1">{n.excerpt}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button type="button" size="sm" variant="outline" onClick={() => startEdit(n)}>
                  <Pencil className="h-4 w-4" />
                  Изменить
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => setDeleteId(n.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить новость?</AlertDialogTitle>
            <AlertDialogDescription>
              Новость будет удалена для всех пользователей без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminNews;
