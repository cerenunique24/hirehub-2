type MessageSummary = {
  content: string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
};

export function messagePreview(message: MessageSummary): string {
  return message.content?.trim() || message.attachment_name ||
    (message.attachment_url ? "Dosya eki" : "Yeni konuşma");
}

export function messageSearchText(message: MessageSummary): string {
  return [message.content, message.attachment_name].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR");
}
