import { useNavigate } from "@/lib/router-compat";
import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router-compat";

const ResetPassword = () => {
  const nav = useNavigate();

  return (
    <>
      <PageHero eyebrow="Безопасность" title="Сброс пароля" />
      <section className="py-16">
        <div className="container max-w-md">
          <Card className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              Для сброса пароля обратитесь в оргкомитет:{" "}
              <a href="mailto:zayavka@shelk-put.com" className="text-primary hover:underline">
                zayavka@shelk-put.com
              </a>
            </p>
            <Button variant="festival" onClick={() => nav("/auth")}>На страницу входа</Button>
            <p className="text-sm"><Link to="/" className="text-muted-foreground hover:text-primary">← На главную</Link></p>
          </Card>
        </div>
      </section>
    </>
  );
};

export default ResetPassword;
