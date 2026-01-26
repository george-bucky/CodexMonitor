import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  decodeFileLink,
  isFileLinkUrl,
  isLinkableFilePath,
  remarkFileLinks,
  toFileLink,
} from "../../../utils/remarkFileLinks";

type MarkdownProps = {
  value: string;
  className?: string;
  codeBlock?: boolean;
  onOpenFileLink?: (path: string) => void;
  onOpenFileLinkMenu?: (event: React.MouseEvent, path: string) => void;
};

export function Markdown({
  value,
  className,
  codeBlock,
  onOpenFileLink,
  onOpenFileLinkMenu,
}: MarkdownProps) {
  const content = codeBlock ? `\`\`\`\n${value}\n\`\`\`` : value;
  const normalizeExternalUrl = (url: string) => {
    const lower = url.toLowerCase();
    if (
      lower.startsWith("http://") ||
      lower.startsWith("https://") ||
      lower.startsWith("mailto:")
    ) {
      return url;
    }
    if (lower.startsWith("www.")) {
      return `https://${url}`;
    }
    return null;
  };
  const shouldOpenExternal = (event: React.MouseEvent) =>
    event.metaKey || event.ctrlKey;
  const handleFileLinkClick = (event: React.MouseEvent, path: string) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenFileLink?.(path);
  };
  const handleFileLinkContextMenu = (
    event: React.MouseEvent,
    path: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenFileLinkMenu?.(event, path);
  };
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkFileLinks]}
        urlTransform={(url) => {
          const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
          const lowerUrl = url.toLowerCase();
          if (
            isFileLinkUrl(url) ||
            lowerUrl.startsWith("http://") ||
            lowerUrl.startsWith("https://") ||
            lowerUrl.startsWith("mailto:") ||
            url.startsWith("#") ||
            url.startsWith("/") ||
            url.startsWith("./") ||
            url.startsWith("../")
          ) {
            return url;
          }
          if (!hasScheme) {
            return url;
          }
          return "";
        }}
        components={{
          a: ({ href, children }) => {
            const url = href ?? "";
            if (isFileLinkUrl(url)) {
              const path = decodeFileLink(url);
              return (
                <a
                  href={href}
                  onClick={(event) => handleFileLinkClick(event, path)}
                  onContextMenu={(event) =>
                    handleFileLinkContextMenu(event, path)
                  }
                >
                  {children}
                </a>
              );
            }
            const externalUrl = normalizeExternalUrl(url);
            const isExternal = Boolean(externalUrl);

            if (!isExternal) {
              return <a href={href}>{children}</a>;
            }

            return (
              <a
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!shouldOpenExternal(event)) {
                    return;
                  }
                  void openUrl(externalUrl ?? url);
                }}
                title="Cmd-click to open link"
              >
                {children}
              </a>
            );
          },
          code: ({ className, children }) => {
            const isInline = !className;
            if (!isInline) {
              return (
                <pre>
                  <code className={className}>{children}</code>
                </pre>
              );
            }
            const text = String(children ?? "").trim();
            if (!text || !isLinkableFilePath(text)) {
              return <code>{children}</code>;
            }
            const href = toFileLink(text);
            return (
              <a
                href={href}
                onClick={(event) => handleFileLinkClick(event, text)}
                onContextMenu={(event) =>
                  handleFileLinkContextMenu(event, text)
                }
              >
                <code>{children}</code>
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
