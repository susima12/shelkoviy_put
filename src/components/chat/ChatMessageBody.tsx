import { cn } from "@/lib/utils";
import { chatFileUrl } from "@/lib/api-client";
import { format } from "date-fns";
import { FileText, Download } from "lucide-react";

export type ChatMessageView = {
  id: string;
  content: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
};

export function ChatMessageBody({
  message,
  mine,
  showTimestamp = true,
}: {
  message: ChatMessageView;
  mine: boolean;
  showTimestamp?: boolean;
}) {
  const isImage = message.attachment_mime?.startsWith("image/");
  const fileUrl = message.attachment_url ? chatFileUrl(message.attachment_url) : null;

  return (
    <div className={cn("max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2", mine ? "bg-primary text-primary-foreground" : "bg-secondary")}>
      {fileUrl && (
        <div className="mb-2">
          {isImage ? (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={fileUrl}
                alt={message.attachment_name || "Изображение"}
                className="max-h-64 max-w-full rounded-lg object-contain bg-black/10"
                loading="lazy"
              />
            </a>
          ) : (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                mine ? "border-primary-foreground/30 hover:bg-primary-foreground/10" : "border-border hover:bg-background"
              )}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1">{message.attachment_name || "Файл"}</span>
              <Download className="h-4 w-4 shrink-0 opacity-70" />
            </a>
          )}
        </div>
      )}
      {message.content ? (
        <div className="whitespace-pre-wrap break-words text-sm">{message.content}</div>
      ) : null}
      {showTimestamp && (
        <div className={cn("text-[10px] mt-1", mine ? "text-primary-foreground/70 text-right" : "text-muted-foreground")}>
          {format(new Date(message.created_at), "HH:mm")}
        </div>
      )}
    </div>
  );
}
