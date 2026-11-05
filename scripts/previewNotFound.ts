import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Plugin } from "vite";

/**
 * `vite preview` answers unknown paths the way Vercel does: the custom 404.html with a
 * 404 status. Real files, and clean URLs such as /mars for mars.html, pass through.
 */
export function previewNotFound(): Plugin {
  return {
    name: "preview-not-found",
    configurePreviewServer(server) {
      const out = resolve(server.config.root, server.config.build.outDir);
      const isFile = (p: string) => existsSync(p) && statSync(p).isFile();
      // With a base (GitHub Pages' /repo/), pages live under it; leave other paths to Vite.
      const base = server.config.base;
      server.middlewares.use((req, res, next) => {
        const [rawPath, query] = (req.url ?? "/").split("?");
        if (!rawPath.startsWith(base) && `${rawPath}/` !== base) return next();
        // Like Vercel's trailingSlash: false, /mars/ redirects to /mars.
        if (rawPath.length > base.length && rawPath.endsWith("/")) {
          res.statusCode = 308;
          res.setHeader("Location", rawPath.replace(/\/+$/, "") + (query ? `?${query}` : ""));
          return res.end();
        }
        const path = `/${decodeURIComponent(rawPath).slice(base.length)}`;
        const file = join(out, path);
        if (!file.startsWith(out)) return next();
        if (path === "/" || isFile(file) || isFile(`${file}.html`) || isFile(join(file, "index.html"))) return next();
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(readFileSync(join(out, "404.html")));
      });
    },
  };
}
