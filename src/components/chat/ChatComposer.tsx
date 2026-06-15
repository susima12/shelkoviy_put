import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Paperclip, Send } from "lucide-react";
import { toast } from "sonner";

export type ChatSendPayload = {
  content?: string;
  attachment?: { data: string; name: string; mime: string };
};

type ChatComposerProps = {
  onSend: (payload: ChatSendPayload) => Promise<void>;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.pdf,.txt,.doc,.docx,.zip";

export function ChatComposer({
  onSend,
  placeholder = "Сообщение...",
  maxLength = 4000,
  disabled,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (payload: ChatSendPayload) => {
    if (busy || disabled) return;
    if (!payload.content?.trim() && !payload.attachment) return;
    setBusy(true);
    try {
      await onSend({
        content: payload.content?.trim() || "",
        attachment: payload.attachment,
      });
      setText("");
    } finally {
      setBusy(false);
    }
  };

  const sendText = () => submit({ content: text });

  const onFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Файл слишком большой (макс. 10 МБ)");
      return;
    }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
        reader.readAsDataURL(file);
      });
      await submit({
        content: text,
        attachment: { data, name: file.name, mime: file.type || "application/octet-stream" },
      });
    } catch {
      toast.error("Не удалось отправить файл");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="p-3 border-t border-border flex gap-2 items-end">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onFilePick}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 h-11 w-11"
        disabled={busy || disabled}
        onClick={() => fileRef.current?.click()}
        aria-label="Прикрепить файл"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={busy || disabled}
        className="h-11"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendText();
          }
        }}
      />
      <Button
        type="button"
        onClick={sendText}
        variant="wine"
        className="shrink-0 h-11 w-11"
        disabled={busy || disabled || !text.trim()}
        aria-label="Отправить"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
