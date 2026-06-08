import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate, useParams, Link } from "@/lib/router-compat";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api-client";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useCompetitions, type Competition } from "@/hooks/use-competitions";
import type { CompetitionFormField } from "@/lib/competitions-data";
import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle2, LogIn, AlertCircle } from "lucide-react";
import { translateError } from "@/lib/translate-error";

const baseSchema = z.object({
  competition_id: z.string().min(1, "Выберите конкурс"),
  leader_full_name: z.string().trim().min(2, "Укажите ФИО").max(150),
  email: z.string().trim().email("Некорректный email").max(255),
  phone: z
    .string()
    .trim()
    .regex(
      /^(\+7|8)\d{10}$/,
      "Телефон: +7 или 8 и 11 цифр (например +79991234567)"
    ),
  country: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  organization: z.string().trim().max(200).optional(),
  participant_name: z.string().trim().min(2, "Укажите участника").max(200),
  age_category: z.string().min(1, "Выберите возрастную категорию"),
  nomination: z.string().min(1, "Выберите номинацию"),
  performance_title: z.string().trim().max(200).optional(),
  duration_minutes: z.coerce.number().min(0).max(120).optional().or(z.literal("")),
  participants_count: z.coerce.number().int().min(1).max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
  consent_given: z.literal(true, { message: "Необходимо согласие" } as any),
});

type FormValues = z.infer<typeof baseSchema> & Record<string, string | number | boolean | undefined>;

const Apply = () => {
  const [params] = useSearchParams();
  const routeParams = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { user, isReady } = useAuthReady();
  const { items: competitions, loading: compsLoading, error: compsError } = useCompetitions({
    acceptingOnly: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});

  const initialSlug = routeParams.slug ?? params.get("competition") ?? "";
  const lockedToSlug = !!routeParams.slug;
  const returnUrl = lockedToSlug ? `/apply/${initialSlug}` : "/apply";

  const form = useForm<FormValues>({
    resolver: zodResolver(baseSchema) as any,
    defaultValues: {
      competition_id: "",
      consent_given: false as any,
    },
  });

  const competitionId = form.watch("competition_id");
  const selectedComp = useMemo(
    () => competitions.find((c) => c.id === competitionId),
    [competitions, competitionId]
  );

  useEffect(() => {
    if (!initialSlug || !competitions.length) return;
    const found = competitions.find((c) => c.slug === initialSlug);
    if (found) form.setValue("competition_id", found.id, { shouldValidate: true });
  }, [initialSlug, competitions, form]);

  useEffect(() => {
    if (!isReady || !user) return;
    api.getProfile().then(({ profile }) => {
      if (profile?.display_name && !form.getValues("leader_full_name")) {
        form.setValue("leader_full_name", profile.display_name);
      }
      if (profile?.email && !form.getValues("email")) {
        form.setValue("email", profile.email);
      } else if (user.email && !form.getValues("email")) {
        form.setValue("email", user.email);
      }
    }).catch(() => {
      if (user.email && !form.getValues("email")) form.setValue("email", user.email);
    });
  }, [isReady, user, form]);

  useEffect(() => {
    setExtraFields({});
    form.setValue("age_category", "");
    form.setValue("nomination", "");
    form.setValue("performance_title", "");
    form.setValue("duration_minutes", "" as any);
    form.setValue("participants_count", "" as any);
    form.setValue("organization", "");
    form.setValue("notes", "");
  }, [competitionId, form]);

  const validateExtraFields = (): boolean => {
    if (!selectedComp?.formFields) return true;
    for (const field of selectedComp.formFields) {
      if (!field.required) continue;
      const val = getFieldValue(field);
      if (!val || String(val).trim() === "") {
        toast.error(`Заполните поле: ${field.label.replace(" *", "")}`);
        return false;
      }
    }
    return true;
  };

  const getFieldValue = (field: CompetitionFormField): string => {
    if (field.storage !== "notes" && field.storage in baseSchema.shape) {
      const v = form.getValues(field.storage as keyof FormValues);
      if (v !== undefined && v !== null && v !== "") return String(v);
    }
    if (extraFields[field.key]) return extraFields[field.key];
    if (field.storage === "notes") return form.getValues("notes") ?? "";
    const v = form.getValues(field.storage as keyof FormValues);
    return v !== undefined && v !== null ? String(v) : "";
  };

  const buildPayload = (values: FormValues, comp: Competition) => {
    const payload: Record<string, unknown> = {
      competition_id: comp.id.startsWith("static-") ? null : comp.id,
      leader_full_name: values.leader_full_name,
      email: values.email,
      phone: values.phone,
      country: values.country || null,
      city: values.city || null,
      organization: values.organization || null,
      participant_name: values.participant_name,
      age_category: values.age_category,
      nomination: values.nomination,
      performance_title: values.performance_title || null,
      duration_minutes: values.duration_minutes ? Number(values.duration_minutes) : null,
      participants_count: values.participants_count ? Number(values.participants_count) : null,
      notes: values.notes || null,
    };

    const noteParts: string[] = [];
    comp.formFields?.forEach((field) => {
      const val = getFieldValue(field);
      if (!val) return;
      if (field.storage === "notes" && field.key !== "notes") {
        noteParts.push(`${field.label.replace(" *", "")}: ${val}`);
      }
    });
    if (noteParts.length) {
      payload.notes = [payload.notes, ...noteParts].filter(Boolean).join("\n");
    }

    return payload;
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast.error("Войдите в аккаунт, чтобы подать заявку");
      navigate(`/auth?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    if (!selectedComp) return;
    if (!validateExtraFields()) return;

    setSubmitting(true);
    try {
      const payload = buildPayload(values, selectedComp);
      await api.submitApplication({
        ...payload,
        competition_id: selectedComp.id,
      });
      setSubmitted(true);
      toast.success("Заявка отправлена!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: unknown) {
      console.error(e);
      toast.error(translateError(e, "Ошибка при отправке"));
    } finally {
      setSubmitting(false);
    }
  };

  const onInvalid = (errs: Record<string, { message?: string }>) => {
    const first = Object.values(errs)[0];
    toast.error(first?.message ?? "Заполните обязательные поля");
  };

  if (!isReady) {
    return (
      <>
        <PageHero eyebrow="Заявка" title="Подать заявку" />
        <div className="container py-20 text-center text-muted-foreground">Загрузка...</div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <PageHero eyebrow="Заявка" title="Подать заявку" />
        <section className="py-20">
          <div className="container max-w-lg">
            <Card className="p-10 text-center">
              <LogIn className="h-12 w-12 text-gold mx-auto mb-4" />
              <h2 className="font-serif text-2xl mb-3">Требуется регистрация</h2>
              <p className="text-muted-foreground mb-6">
                Подать заявку на конкурс могут только зарегистрированные пользователи.
                Войдите или создайте аккаунт.
              </p>
              <Button asChild variant="festival" size="lg">
                <Link to={`/auth?redirect=${encodeURIComponent(returnUrl)}`}>Войти / Регистрация</Link>
              </Button>
            </Card>
          </div>
        </section>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <PageHero eyebrow="Готово" title="Заявка отправлена" />
        <section className="py-20">
          <div className="container max-w-2xl">
            <Card className="p-12 text-center">
              <CheckCircle2 className="h-16 w-16 text-gold mx-auto mb-6" />
              <h2 className="font-serif text-3xl mb-4">Спасибо!</h2>
              <p className="text-muted-foreground mb-8">
                Ваша заявка получена. Оргкомитет свяжется с вами по email после проверки.
                Копию платёжного документа направьте на zayavka@shelk-put.com.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Button onClick={() => navigate("/my-applications")} variant="festival">
                  Мои заявки
                </Button>
                <Button onClick={() => { setSubmitted(false); form.reset(); setExtraFields({}); }} variant="outline">
                  Подать ещё одну
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Заявка на участие"
        title="Подать заявку"
        description="Заполните форму согласно положению выбранного конкурса."
      />
      <section className="py-16">
        <div className="container max-w-3xl">
          {compsError && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>Не удалось загрузить список конкурсов. Обновите страницу.</div>
            </div>
          )}

          <Card className="p-8 md:p-10">
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
              <Section title={lockedToSlug && selectedComp ? `Конкурс: ${selectedComp.name}` : "Выбор конкурса"}>
                {!lockedToSlug && (
                  <Field label="Конкурс *" error={form.formState.errors.competition_id?.message}>
                    {compsLoading ? (
                      <p className="text-sm text-muted-foreground">Загрузка конкурсов...</p>
                    ) : (
                      <Select
                        value={competitionId || undefined}
                        onValueChange={(v) => form.setValue("competition_id", v, { shouldValidate: true })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите конкурс" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50 max-h-72">
                          {competitions.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </Field>
                )}

                {selectedComp && (
                  <>
                    {selectedComp.short_description && (
                      <p className="text-sm text-muted-foreground">{selectedComp.short_description}</p>
                    )}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="Возрастная категория *" error={form.formState.errors.age_category?.message}>
                        <Select
                          value={form.watch("age_category") || undefined}
                          onValueChange={(v) => form.setValue("age_category", v, { shouldValidate: true })}
                        >
                          <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                          <SelectContent className="bg-popover z-50 max-h-60">
                            {(selectedComp.age_categories ?? []).map((a) => (
                              <SelectItem key={a} value={a}>{a}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Номинация *" error={form.formState.errors.nomination?.message}>
                        <Select
                          value={form.watch("nomination") || undefined}
                          onValueChange={(v) => form.setValue("nomination", v, { shouldValidate: true })}
                        >
                          <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                          <SelectContent className="bg-popover z-50 max-h-60">
                            {(selectedComp.nominations ?? []).map((n) => (
                              <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </>
                )}
              </Section>

              {selectedComp?.formFields && selectedComp.formFields.length > 0 && (
                <Section title="Данные по конкурсу">
                  <CompetitionFields
                    fields={selectedComp.formFields}
                    form={form}
                    extraFields={extraFields}
                    setExtraFields={setExtraFields}
                    errors={form.formState.errors}
                  />
                </Section>
              )}

              <Section title="Контактное лицо (руководитель)">
                <Field label="ФИО руководителя *" error={form.formState.errors.leader_full_name?.message}>
                  <Input {...form.register("leader_full_name")} />
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Email *" error={form.formState.errors.email?.message}>
                    <Input type="email" {...form.register("email")} />
                  </Field>
                  <Field label="Телефон *" error={form.formState.errors.phone?.message}>
                    <Input {...form.register("phone")} placeholder="+79991234567" />
                  </Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Страна"><Input {...form.register("country")} /></Field>
                  <Field label="Город"><Input {...form.register("city")} /></Field>
                </div>
              </Section>

              <Section title="Участник">
                <Field label="ФИО участника / название коллектива *" error={form.formState.errors.participant_name?.message}>
                  <Input {...form.register("participant_name")} />
                </Field>
                <Field label="Дополнительная информация">
                  <Textarea rows={3} {...form.register("notes")} placeholder="Пожелания, реквизит, технические требования..." />
                </Field>
              </Section>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/40">
                <Checkbox
                  id="consent"
                  checked={form.watch("consent_given") as boolean}
                  onCheckedChange={(v) => form.setValue("consent_given", !!v as any, { shouldValidate: true })}
                />
                <Label htmlFor="consent" className="text-sm leading-snug cursor-pointer">
                  Я даю согласие на обработку персональных данных (152-ФЗ) и подтверждаю
                  достоверность сведений. Подача заявки означает согласие с условиями положения. *
                </Label>
              </div>
              {form.formState.errors.consent_given && (
                <p className="text-sm text-destructive -mt-4">{form.formState.errors.consent_given.message as string}</p>
              )}

              <Button type="submit" variant="festival" size="xl" className="w-full" disabled={submitting || compsLoading}>
                {submitting ? "Отправка..." : "Отправить заявку"}
              </Button>
            </form>
          </Card>
        </div>
      </section>
    </>
  );
};

const CompetitionFields = ({
  fields,
  form,
  extraFields,
  setExtraFields,
  errors,
}: {
  fields: CompetitionFormField[];
  form: ReturnType<typeof useForm<FormValues>>;
  extraFields: Record<string, string>;
  setExtraFields: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  errors: Record<string, { message?: string }>;
}) => {
  const rendered = new Set<string>();

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        if (rendered.has(field.key)) return null;
        rendered.add(field.key);

        const storageKey = field.storage as keyof FormValues;
        const isStandardStorage = ["organization", "performance_title", "duration_minutes", "participants_count", "notes"].includes(field.storage);

        if (field.type === "select" && field.options) {
          const value = isStandardStorage
            ? (form.watch(storageKey) as string) ?? ""
            : extraFields[field.key] ?? "";
          return (
            <Field key={field.key} label={field.label} error={errors[storageKey]?.message}>
              <Select
                value={value || undefined}
                onValueChange={(v) => {
                  if (isStandardStorage) form.setValue(storageKey, v as never, { shouldValidate: true });
                  else setExtraFields((prev) => ({ ...prev, [field.key]: v }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {field.options.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          );
        }

        if (field.type === "number") {
          return (
            <Field key={field.key} label={field.label} error={errors[storageKey]?.message}>
              <Input
                type="number"
                step="0.5"
                placeholder={field.placeholder}
                {...form.register(storageKey as "duration_minutes" | "participants_count", { valueAsNumber: true })}
              />
            </Field>
          );
        }

        if (isStandardStorage) {
          return (
            <Field key={field.key} label={field.label} error={errors[storageKey]?.message}>
              <Input placeholder={field.placeholder} {...form.register(storageKey as "organization" | "performance_title" | "notes")} />
            </Field>
          );
        }

        return (
          <Field key={field.key} label={field.label}>
            <Input
              placeholder={field.placeholder}
              value={extraFields[field.key] ?? ""}
              onChange={(e) => setExtraFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
            />
          </Field>
        );
      })}
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <h3 className="font-serif text-xl pb-2 border-b border-border">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm">{label}</Label>
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

export default Apply;
